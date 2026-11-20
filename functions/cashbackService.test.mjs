import test from "node:test";
import assert from "node:assert/strict";
import admin from "firebase-admin";
import { createCashbackService } from "./cashbackService.js";
import { toKobo, toNairaNumber } from "./billPricingEngine.js";
import {
  classifyClubKonnectResponse,
  normalizeClubKonnectDisco,
  normalizeClubKonnectCableCode,
  rebuildMaterializedBillCatalogCore,
  DEFAULT_CLUBKONNECT_SYNC_INTERVAL_HOURS,
} from "./index.js";

/**
 * Lightweight deterministic in-memory Firestore mock supporting:
 * - nested doc/collection references (`users/{uid}/Transactions/{id}`, etc.)
 * - FieldValue.increment arithmetic on nested/existing fields
 * - atomic runTransaction
 */
function createMemoryFirestore(initialDocs = {}) {
  const store = new Map();
  for (const [path, data] of Object.entries(initialDocs)) {
    store.set(path, structuredClone(data));
  }

  function applyValue(target, key, val) {
    // Check FieldValue.increment (firebase-admin marks it via operand or _methodName)
    if (val && typeof val === "object" && "operand" in val) {
      target[key] = Number(((Number(target[key] || 0) + Number(val.operand || 0))).toFixed(4));
      return;
    }
    if (val && typeof val === "object" && val.constructor?.name === "ServerTimestampTransform") {
      target[key] = new Date().toISOString();
      return;
    }
    target[key] = structuredClone(val);
  }

  function applyPatch(existing, patch, merge = true) {
    const base = merge && existing ? structuredClone(existing) : {};
    for (const [k, v] of Object.entries(patch || {})) {
      applyValue(base, k, v);
    }
    return base;
  }

  function makeDocRef(path) {
    return {
      id: path.split("/").pop(),
      path,
      collection(sub) {
        return makeCollectionRef(`${path}/${sub}`);
      },
      async get() {
        const val = store.get(path);
        return {
          id: path.split("/").pop(),
          exists: val !== undefined,
          data: () => (val !== undefined ? structuredClone(val) : undefined),
        };
      },
      async set(data, opts = {}) {
        const next = applyPatch(store.get(path), data, Boolean(opts.merge));
        store.set(path, next);
      },
      async update(data) {
        if (!store.has(path)) throw new Error(`Doc ${path} not found`);
        const next = applyPatch(store.get(path), data, true);
        store.set(path, next);
      },
    };
  }

  function makeCollectionRef(colPath) {
    const queryDocs = () => {
      const prefix = `${colPath}/`;
      const results = [];
      for (const [p, v] of store.entries()) {
        if (p.startsWith(prefix) && !p.slice(prefix.length).includes("/")) {
          results.push({ id: p.slice(prefix.length), exists: true, data: () => structuredClone(v) });
        }
      }
      return results;
    };

    const api = {
      doc(id) {
        const docId = id || `auto_${store.size + 1}_${Date.now()}`;
        return makeDocRef(`${colPath}/${docId}`);
      },
      async add(data) {
        const docId = `auto_${store.size + 1}_${Date.now()}`;
        const ref = makeDocRef(`${colPath}/${docId}`);
        await ref.set(data);
        return ref;
      },
      where(field, _op, val) {
        const subset = () => queryDocs().filter((d) => d.data()?.[field] === val);
        return {
          limit() {
            return {
              async get() {
                const docs = subset();
                return { empty: docs.length === 0, size: docs.length, docs, forEach: (fn) => docs.forEach(fn) };
              },
            };
          },
          async get() {
            const docs = subset();
            return { empty: docs.length === 0, size: docs.length, docs, forEach: (fn) => docs.forEach(fn) };
          },
        };
      },
      orderBy() {
        return api;
      },
      limit() {
        return api;
      },
      async get() {
        const docs = queryDocs();
        return { empty: docs.length === 0, size: docs.length, docs, forEach: (fn) => docs.forEach(fn) };
      },
    };
    return api;
  }

  return {
    store,
    collection(name) {
      return makeCollectionRef(name);
    },
    async runTransaction(fn) {
      const tx = {
        async get(ref) {
          return await ref.get();
        },
        set(ref, data, opts) {
          const next = applyPatch(store.get(ref.path), data, Boolean(opts?.merge));
          store.set(ref.path, next);
        },
        update(ref, data) {
          if (!store.has(ref.path)) throw new Error(`Doc ${ref.path} not found`);
          const next = applyPatch(store.get(ref.path), data, true);
          store.set(ref.path, next);
        },
      };
      return await fn(tx);
    },
  };
}

function buildTestHarness(initialDocs = {}, ckVerifyStub = null, extraDeps = {}) {
  const db = createMemoryFirestore(initialDocs);
  const sweepCalls = [];
  const pointsCalls = [];
  const cancelCalls = [];
  const flwTransferCalls = [];

  const service = createCashbackService({
    db,
    stripUndefined: (obj) => {
      const clean = {};
      for (const [k, v] of Object.entries(obj || {})) {
        if (v !== undefined) clean[k] = v;
      }
      return clean;
    },
    async writeUpperLevelTransaction(txRef, data, t) {
      const capRef = db.collection("Transactions").doc(txRef);
      if (t) t.set(capRef, data, { merge: true });
      else await capRef.set(data, { merge: true });
    },
    generatePaywakaRef(kind = "default") {
      return kind === "cashback" ? "pwkcb202611181234567890" : "pwk202611181234567890";
    },
    async settleUserPsaToMerchantCore(args) {
      sweepCalls.push(args);
      return { status: "success" };
    },
    async recordPendingSettlement() {},
    async cancelPendingSettlement() {},
    async awardTransactionPointsCore(args) {
      pointsCalls.push(args);
      return { pointsEarned: Math.floor((args.amount || 0) / 50), awarded: true };
    },
    async verifyUserPinCore(_uid, pin) {
      if (pin !== "4829") throw new Error("Incorrect PIN");
    },
    async verifyClubKonnectOrderStatus(reqId, orderId, opts) {
      if (ckVerifyStub) return await ckVerifyStub(reqId, orderId, opts);
      return {
        checked: true,
        isSuccess: true,
        isPending: false,
        isFailed: false,
        needsCancel: false,
        data: { status: "ORDER_COMPLETED", statuscode: "200", orderid: orderId || "CK123" },
      };
    },
    async cancelClubKonnectOrder(reqId, orderId) {
      cancelCalls.push({ reqId, orderId });
      if (extraDeps.cancelClubKonnectOrder) {
        return await extraDeps.cancelClubKonnectOrder(reqId, orderId);
      }
      return { status: "ORDER_CANCELLED", orderid: orderId };
    },
    async executeFlutterwaveTransferFn(payload) {
      flwTransferCalls.push(payload);
      if (extraDeps.executeFlutterwaveTransferFn) {
        return await extraDeps.executeFlutterwaveTransferFn(payload);
      }
      return {
        status: "success",
        message: "Transfer Queued Successfully",
        data: { id: 99001122, status: "NEW", reference: payload.reference, amount: payload.amount },
      };
    },
    getFlutterwaveMerchantId: () => "100381242",
    FLW_SECRET_KEY: { value: () => "test_key" },
    assertWholeNairaKobo: (k) => {
      if (k <= 0 || k % 100 !== 0) throw new Error("Whole naira required");
    },
    getPricingConfigCore: async () => ({}),
    calculatePlanPricing: (cost) => ({ costPrice: cost, displayPrice: cost + 50, cashbackAmount: 2 }),
  });

  return { db, service, sweepCalls, pointsCalls, cancelCalls, flwTransferCalls };
}

test("partial cashback purchase sweeps ONLY W and keeps canonical tx.amount = faceAmount P", async () => {
  const { db, service, sweepCalls } = buildTestHarness({
    "users/u1": {
      firstName: "Ada",
      lastName: "Obi",
      walletBalance: 5000,
      walletBalanceKobo: 500000,
      cashbackBalance: 500,
      cashbackBalanceKobo: 50000,
      points: 10,
      barter_id: "234000001111111",
    },
  });

  const cfg = await service.getBillPricingConfigCore();
  const reqId = "pwk202611180000000001";
  const resv = await service.reservePurchaseFundsCore({
    uid: "u1",
    requestId: reqId,
    category: "Electricity",
    provider: "IKEDC",
    faceAmountNaira: 2000, // fee = 50 -> totalPayable = 2050; C = 500, W = 1550
    useCashback: true,
    config: cfg,
  });

  assert.equal(resv.pricing.feeCharged, 50);
  assert.equal(resv.pricing.totalPayable, 2050);
  assert.equal(resv.pricing.funding.cashbackApplied, 500);
  assert.equal(resv.pricing.funding.walletContribution, 1550);

  const userAfterDebit = db.store.get("users/u1");
  assert.equal(userAfterDebit.cashbackBalance, 0);
  assert.equal(userAfterDebit.walletBalance, 3450); // 5000 - 1550

  await service.finalizePurchaseSuccessCore({
    uid: "u1",
    requestId: reqId,
    category: "Electricity",
    provider: "IKEDC",
    ckResult: { status: "ORDER_COMPLETED", statuscode: "200", orderid: "CK_EL_1" },
    faceAmountNaira: 2000,
    useCashback: true,
    userDocData: resv.userData,
  });

  // Verify sweep was ONLY W = 1550 (never face 2000 or total 2050!)
  assert.equal(sweepCalls.length, 1);
  assert.equal(sweepCalls[0].amountNaira, 1550);

  // Canonical receipt amount stays 2000; earned cashback ₦20 credited
  const tx = db.store.get(`users/u1/Transactions/${reqId}`);
  assert.equal(tx.amount, 2000);
  assert.equal(tx.feeCharged, 50);
  assert.equal(tx.cashbackApplied, 500);
  assert.equal(tx.walletContribution, 1550);
  assert.equal(tx.cashbackEarned, 20);
  assert.equal(tx.netEarning, 40);

  const userAfterComplete = db.store.get("users/u1");
  assert.equal(userAfterComplete.cashbackBalance, 20);
});

test("100% cashback-funded purchase earns ₦0 new cashback and skips PSA sweep", async () => {
  const { db, service, sweepCalls } = buildTestHarness({
    "users/u2": {
      firstName: "Chidi",
      lastName: "Okafor",
      walletBalance: 1000,
      walletBalanceKobo: 100000,
      cashbackBalance: 3000,
      cashbackBalanceKobo: 300000,
    },
  });

  const cfg = await service.getBillPricingConfigCore();
  const reqId = "pwk202611180000000002";
  const resv = await service.reservePurchaseFundsCore({
    uid: "u2",
    requestId: reqId,
    category: "Electricity",
    provider: "EKEDC",
    faceAmountNaira: 2000, // totalPayable = 2050 <= 3000 cashback
    useCashback: true,
    config: cfg,
  });

  assert.equal(resv.pricing.funding.cashbackApplied, 2050);
  assert.equal(resv.pricing.funding.walletContribution, 0);
  assert.equal(resv.pricing.funding.isFullyCashbackFunded, true);
  assert.equal(resv.pricing.cashbackGiven, 0);

  const fin = await service.finalizePurchaseSuccessCore({
    uid: "u2",
    requestId: reqId,
    category: "Electricity",
    provider: "EKEDC",
    ckResult: { status: "ORDER_COMPLETED", orderid: "CK_FULL_CB" },
    faceAmountNaira: 2000,
    useCashback: true,
    userDocData: resv.userData,
  });

  assert.equal(fin.cashbackEarned, 0);
  assert.equal(sweepCalls.length, 0);

  const u2 = db.store.get("users/u2");
  assert.equal(u2.walletBalance, 1000);
  assert.equal(u2.cashbackBalance, 950); // 3000 - 2050 + 0 earned
});

test("pending ORDER_RECEIVED holds funds without cashback, then callback completes idempotently", async () => {
  const { db, service, sweepCalls } = buildTestHarness({
    "users/u3": {
      walletBalance: 10000,
      walletBalanceKobo: 1000000,
      cashbackBalance: 50,
      cashbackBalanceKobo: 5000,
    },
  });

  const cfg = await service.getBillPricingConfigCore();
  const reqId = "pwk202611180000000003";
  await service.reservePurchaseFundsCore({
    uid: "u3",
    requestId: reqId,
    category: "Cable",
    provider: "GOTV",
    faceAmountNaira: 6000,
    useCashback: false,
    config: cfg,
  });

  await service.keepPurchasePendingCore({
    uid: "u3",
    requestId: reqId,
    category: "Cable",
    provider: "GOTV",
    ckResult: { status: "ORDER_RECEIVED", statuscode: "100", orderid: "CK_PEND_99" },
  });

  // While pending: cashback still 50, sweep count 0
  assert.equal(db.store.get("users/u3").cashbackBalance, 50);
  assert.equal(sweepCalls.length, 0);

  // Callback invokes reconcileClubKonnectOrderCore -> verifies APIQueryV1 -> credits ₦30 cashback & sweeps once
  const r1 = await service.reconcileClubKonnectOrderCore({ requestId: reqId, orderId: "CK_PEND_99" });
  assert.equal(r1.status, "completed");
  assert.equal(r1.cashbackEarned, 30);
  assert.equal(db.store.get("users/u3").cashbackBalance, 80);
  assert.equal(sweepCalls.length, 1);

  // Duplicate callback must be idempotent (no second cashback credit or second sweep)
  const r2 = await service.reconcileClubKonnectOrderCore({ requestId: reqId, orderId: "CK_PEND_99" });
  assert.equal(r2.status, "completed");
  assert.equal(db.store.get("users/u3").cashbackBalance, 80);
  assert.equal(sweepCalls.length, 1);
});

test("refundPurchaseFundsCore atomically restores W + C once and refuses double-refund", async () => {
  const { db, service } = buildTestHarness({
    "users/u4": {
      walletBalance: 500,
      walletBalanceKobo: 50000,
      cashbackBalance: 100,
      cashbackBalanceKobo: 10000,
    },
  });

  const cfg = await service.getBillPricingConfigCore();
  const reqId = "pwk202611180000000004";
  await service.reservePurchaseFundsCore({
    uid: "u4",
    requestId: reqId,
    category: "Airtime",
    provider: "MTN",
    faceAmountNaira: 250, // C = 100, W = 150
    useCashback: true,
    config: cfg,
  });

  assert.equal(db.store.get("users/u4").walletBalance, 350);
  assert.equal(db.store.get("users/u4").cashbackBalance, 0);

  await service.refundPurchaseFundsCore({
    uid: "u4",
    requestId: reqId,
    category: "Airtime",
    ckResult: { status: "FAILED" },
    failureReasonStr: "Provider declined",
  });
  // Second refund attempt (idempotency check)
  await service.refundPurchaseFundsCore({
    uid: "u4",
    requestId: reqId,
    category: "Airtime",
    ckResult: { status: "FAILED" },
    failureReasonStr: "Provider declined",
  });

  assert.equal(db.store.get("users/u4").walletBalance, 500);
  assert.equal(db.store.get("users/u4").cashbackBalance, 100);
});

test("transferCashbackToWalletCore enforces ₦1,000 minimum threshold, calls Flutterwave transfer & updates liability", async () => {
  const { db, service, flwTransferCalls } = buildTestHarness({
    "users/u_low": {
      firstName: "Low",
      walletBalance: 200,
      walletBalanceKobo: 20000,
      cashbackBalance: 999,
      cashbackBalanceKobo: 99900,
    },
    "users/u_high": {
      firstName: "Ada",
      lastName: "O",
      walletBalance: 500,
      walletBalanceKobo: 50000,
      cashbackBalance: 1500,
      cashbackBalanceKobo: 150000,
      barter_id: "234000001234567",
    },
  });

  await assert.rejects(
    () => service.transferCashbackToWalletCore({ uid: "u_low", pin: "4829" }),
    /at least ₦1,000/i,
  );

  const res = await service.transferCashbackToWalletCore({
    uid: "u_high",
    requestedAmountNaira: 1200,
    pin: "4829",
  });
  assert.equal(res.status, "success");
  assert.equal(res.transferredAmount, 1200);
  assert.equal(flwTransferCalls.length, 1);
  assert.equal(flwTransferCalls[0].account_number, "234000001234567");
  assert.equal(flwTransferCalls[0].amount, 1200);

  const uHigh = db.store.get("users/u_high");
  assert.equal(uHigh.cashbackBalance, 300);
  assert.equal(uHigh.walletBalance, 1700);

  // Admin dashboard sees total remaining user cashback liability = 999 + 300 = 1299
  const dash = await service.adminGetDashboardDataCore();
  assert.equal(dash.summary.totalUserCashbackLiability, 1299);
  assert.equal(dash.summary.totalCashbackTransferredToWallet, 1200);
});

test("transferCashbackToWalletCore rolls back balances when Flutterwave fails or barter_id is missing", async () => {
  const { db: dbFail, service: svcFail } = buildTestHarness(
    {
      "users/u_err": {
        firstName: "Err",
        lastName: "User",
        walletBalance: 500,
        walletBalanceKobo: 50000,
        cashbackBalance: 1500,
        cashbackBalanceKobo: 150000,
        barter_id: "234000009999999",
      },
    },
    null,
    {
      async executeFlutterwaveTransferFn() {
        return { status: "error", message: "Insufficient merchant balance" };
      },
    },
  );

  await assert.rejects(
    () => svcFail.transferCashbackToWalletCore({ uid: "u_err", requestedAmountNaira: 1000, pin: "4829" }),
    /Insufficient merchant balance/i,
  );
  assert.equal(dbFail.store.get("users/u_err").cashbackBalance, 1500);
  assert.equal(dbFail.store.get("users/u_err").walletBalance, 500);

  const { db: dbNoBarter, service: svcNoBarter } = buildTestHarness({
    "users/u_nobarter": {
      firstName: "NoBarter",
      walletBalance: 500,
      walletBalanceKobo: 50000,
      cashbackBalance: 1500,
      cashbackBalanceKobo: 150000,
    },
  });

  await assert.rejects(
    () => svcNoBarter.transferCashbackToWalletCore({ uid: "u_nobarter", requestedAmountNaira: 1000, pin: "4829" }),
    /barter wallet ID/i,
  );
  assert.equal(dbNoBarter.store.get("users/u_nobarter").cashbackBalance, 1500);
  assert.equal(dbNoBarter.store.get("users/u_nobarter").walletBalance, 500);
});

test("reconcileClubKonnectOrderCore invokes cancelClubKonnectOrder when needsCancel is true & extracts Electricity metertoken", async () => {
  const reqCancel = "pwk202611180000000010";
  const { db: dbCancel, service: svcCancel, cancelCalls } = buildTestHarness(
    {
      "users/u_can": {
        firstName: "Cancel",
        walletBalance: 5000,
        walletBalanceKobo: 500000,
        cashbackBalance: 0,
        cashbackBalanceKobo: 0,
      },
    },
    async (_reqId, orderId) => ({
      checked: true,
      isSuccess: false,
      isPending: false,
      isFailed: true,
      needsCancel: true,
      reason: "Order on hold beyond window",
      data: { status: "ORDER_ONHOLD", statuscode: "412", orderid: orderId || "CK412" },
    }),
  );

  const cfg = await svcCancel.getBillPricingConfigCore();
  await svcCancel.reservePurchaseFundsCore({
    uid: "u_can",
    requestId: reqCancel,
    category: "Airtime",
    provider: "MTN",
    faceAmountNaira: 500,
    useCashback: false,
    config: cfg,
  });
  await svcCancel.keepPurchasePendingCore({
    uid: "u_can",
    requestId: reqCancel,
    category: "Airtime",
    provider: "MTN",
    ckResult: { status: "ORDER_RECEIVED", statuscode: "100", orderid: "CK412" },
  });

  const recCancel = await svcCancel.reconcileClubKonnectOrderCore({
    requestId: reqCancel,
    orderId: "CK412",
  });
  assert.equal(recCancel.status, "failed");
  assert.equal(recCancel.refunded, true);
  assert.equal(cancelCalls.length, 1);
  assert.equal(cancelCalls[0].orderId, "CK412");
  assert.equal(dbCancel.store.get("users/u_can").walletBalance, 5000);

  const reqElec = "pwk202611180000000011";
  const { db: dbElec, service: svcElec } = buildTestHarness(
    {
      "users/u_elec": {
        firstName: "Elec",
        walletBalance: 5000,
        walletBalanceKobo: 500000,
        cashbackBalance: 0,
        cashbackBalanceKobo: 0,
      },
    },
    async (_reqId, orderId) => ({
      checked: true,
      isSuccess: true,
      isPending: false,
      isFailed: false,
      needsCancel: false,
      data: {
        status: "ORDER_COMPLETED",
        statuscode: "200",
        orderid: orderId || "CKELEC1",
        metertoken: "1234-5678-9012-3456-7890",
        units: "42.5 kWh",
      },
    }),
  );

  await svcElec.reservePurchaseFundsCore({
    uid: "u_elec",
    requestId: reqElec,
    category: "Electricity",
    provider: "EKEDC",
    faceAmountNaira: 2000,
    useCashback: false,
    config: cfg,
  });
  await svcElec.keepPurchasePendingCore({
    uid: "u_elec",
    requestId: reqElec,
    category: "Electricity",
    provider: "EKEDC",
    ckResult: { status: "ORDER_RECEIVED", statuscode: "100", metertoken: "000123", orderid: "CKELEC1" },
  });

  const recElec = await svcElec.reconcileClubKonnectOrderCore({
    requestId: reqElec,
    orderId: "CKELEC1",
  });
  assert.equal(recElec.status, "completed");
  const txElec = dbElec.store.get(`users/u_elec/Transactions/${reqElec}`);
  assert.equal(txElec.token, "1234-5678-9012-3456-7890");
  assert.equal(txElec.units, "42.5 kWh");
});

test("classifyClubKonnectResponse implements APIParaGetDisputeResolutionV1 rules and provider normalizers", () => {
  // 200 ORDER_COMPLETED with orderid -> success
  const ok = classifyClubKonnectResponse({
    orderid: "CK_ORD_200",
    status: "ORDER_COMPLETED",
    statuscode: "200",
  });
  assert.equal(ok.isSuccess, true);
  assert.equal(ok.isPending, false);
  assert.equal(ok.isFailed, false);

  // Missing orderid even with 200 cannot be treated as completed
  const noOrder = classifyClubKonnectResponse({ status: "ORDER_COMPLETED", statuscode: "200" });
  assert.equal(noOrder.isSuccess, false);
  assert.equal(noOrder.isFailed, true);

  // CRITICAL: 201 Network Unresponsive also says ORDER_COMPLETED! Must stay PENDING, never completed!
  const netUnresp = classifyClubKonnectResponse({
    orderid: "CK_ORD_201",
    status: "ORDER_COMPLETED",
    statuscode: "201",
    remark: "Network Unresponsive",
  });
  assert.equal(netUnresp.isSuccess, false);
  assert.equal(netUnresp.isPending, true);
  assert.equal(netUnresp.isFailed, false);

  // Electricity Prepaid dummy token "000123" or missing token must stay PENDING until real metertoken arrives
  const dummyPrepaid = classifyClubKonnectResponse(
    { orderid: "CK_ELEC_1", status: "ORDER_COMPLETED", statuscode: "200", metertoken: "000123" },
    { category: "Electricity", meterType: "01" },
  );
  assert.equal(dummyPrepaid.isSuccess, false);
  assert.equal(dummyPrepaid.isPending, true);

  const realPrepaid = classifyClubKonnectResponse(
    {
      orderid: "CK_ELEC_2",
      status: "ORDER_COMPLETED",
      statuscode: "200",
      metertoken: "4455-6677-8899-0011-2233",
    },
    { category: "Electricity", meterType: "01" },
  );
  assert.equal(realPrepaid.isSuccess, true);
  assert.equal(realPrepaid.isPending, false);

  // 100 ORDER_RECEIVED -> pending
  const rec = classifyClubKonnectResponse({ orderid: "CK_REC_1", status: "ORDER_RECEIVED", statuscode: "100" });
  assert.equal(rec.isPending, true);
  assert.equal(rec.isFailed, false);

  // 412 ORDER_ONHOLD / cancel codes with orderid -> failed + needsCancel
  const hold = classifyClubKonnectResponse({ orderid: "CK_HOLD_1", status: "ORDER_ONHOLD", statuscode: "412" });
  assert.equal(hold.isFailed, true);
  assert.equal(hold.needsCancel, true);

  // 500 server/provider error -> failed
  const err = classifyClubKonnectResponse({ status: "FAILED", statuscode: "500" });
  assert.equal(err.isFailed, true);
  assert.equal(err.isSuccess, false);

  // Provider normalizers
  assert.equal(normalizeClubKonnectDisco("ekedc").code, "01");
  assert.equal(normalizeClubKonnectDisco("APLE").code, "12");
  assert.equal(normalizeClubKonnectCableCode("DSTV").code, "dstv");
  assert.equal(normalizeClubKonnectCableCode("Showmax").code, "showmax");
});

test("rebuildMaterializedBillCatalogCore builds single-doc 3h snapshot and reflects Admin overrides immediately", async () => {
  assert.equal(DEFAULT_CLUBKONNECT_SYNC_INTERVAL_HOURS, 3);
  const memDb = createMemoryFirestore({
    "data_plan_pricing/MTN_100": {
      planId: "100",
      network: "MTN",
      planName: "1GB Direct (30 Days)",
      costPrice: 500,
      isActive: true,
      upstreamAvailable: true,
    },
    "data_plan_pricing/GLO_200": {
      planId: "200",
      network: "GLO",
      planName: "2GB Special (30 Days)",
      costPrice: 400,
      isActive: false,
      upstreamAvailable: true,
    },
    "cable_package_pricing/DSTV_dstv-padi": {
      packageId: "dstv-padi",
      provider: "DSTV",
      providerCode: "dstv",
      packageName: "DStv Padi",
      faceAmount: 4400,
      costPrice: 4356,
      isActive: true,
      upstreamAvailable: true,
    },
    "system_settings/bill_provider_metadata": {
      airtimeNetworks: {
        glo: { commissionRate: 0.08, minAmount: 50, maxAmount: 200000 },
      },
      lastSyncedAtIso: "2026-11-19T14:00:00.000Z",
    },
  });

  const snap1 = await rebuildMaterializedBillCatalogCore({ targetDb: memDb });
  assert.equal(snap1.syncIntervalHours, 3);
  assert.equal(snap1.dataPlansByNetwork.MTN.length, 1);
  assert.equal(snap1.dataPlansByNetwork.MTN[0].amount, 650); // 500 * 1.30 = 650
  assert.equal(snap1.dataPlansByNetwork.GLO.length, 0); // inactive plan excluded
  assert.equal(snap1.cablePackagesByProvider.DSTV.length, 1);
  assert.equal(snap1.cablePackagesByProvider.DSTV[0].amount, 4400);
  assert.equal(snap1.electricityDiscos.length, 12);

  // Admin overrides price and disables/modifies plan -> rebuild immediately updates bill_catalog_v1
  await memDb.collection("data_plan_pricing").doc("MTN_100").set(
    { overrideMode: "MANUAL", customDisplayPrice: 590 },
    { merge: true },
  );
  await new Promise((r) => setTimeout(r, 5));
  const snap2 = await rebuildMaterializedBillCatalogCore({ targetDb: memDb });
  assert.ok(snap2.catalogVersion > snap1.catalogVersion);
  assert.equal(snap2.dataPlansByNetwork.MTN[0].amount, 590);
  const stored = memDb.store.get("system_cache/bill_catalog_v1");
  assert.equal(stored.dataPlansByNetwork.MTN[0].amount, 590);
});
