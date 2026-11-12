# PayWaka Meal Coupon Claim Flow — Concurrency & Transaction Integrity Verification
**Document Title:** PAYWAKA_RUN_02_CONCURRENCY_VERIFICATION  
**Author / Role:** Senior Backend Engineer, Software Architect, and QA Specialist  
**Execution Context:** Local Firebase Emulators (Firestore on 127.0.0.1:8085), Node.js v20, Vitest v3.2.4  
**Date of Run:** November 6, 2026  
**Safety Protocol:** Strict Read-Only Codebase Inspection & Ephemeral Isolated Emulator Execution  

---

## 1. Executive Summary

This report delivers an evidence-based technical evaluation of the customer Meal Coupon claiming architecture in PayWaka (*PayJeje*). The investigation focuses on **concurrency control**, **Firestore atomic transaction boundaries**, **idempotency guarantees**, **promotional budget reservation accounting**, and **cryptographic PIN authorization**.

### Core Technical Verdict
PayWaka's Meal Coupon claim mechanism implements a **dual-collection, optimistic concurrency control (OCC) capacity reservation pattern**. 

1. **Promotional Budget Isolation:** A claim operation does **not** consume marketing spend (`campaignSpentNaira`). Instead, it atomically reserves capacity (`campaignReservedNaira += discountNaira`) inside a Firestore transaction while concurrently debiting spendable points from the customer (`users/{uid}.points -= pointsCost`) and appending an immutable negative ledger record.
2. **Last-Coupon Race Resolution:** When multiple customers compete for the final voucher in a campaign, Firestore's OCC mechanism detects document version conflicts on the parent campaign document (`meal_campaigns/{campaignId}`). Competing transactions are aborted and automatically retried; upon retry, the updated `campaignReservedNaira` causes the capacity check to evaluate to zero, immediately aborting the losing thread with `HttpsError("resource-exhausted")`. Zero points are deducted and zero budget is leaked.
3. **Runtime Verification Status:** In ephemeral local emulator runs, **41 of 42 tests passed** in `functions/test_stage2_reservation_suite.js` (including direct concurrent claim race testing where 4 competing workers fought for 2 spots and exactly 2 succeeded), **5 of 7 tests passed** in `functions/test_stage3_2_customer_marketplace_suite.js`, and **47 of 47 unit and contract tests passed** in Vitest.

---

## 2. Objective and Scope

### Objective
Provide comprehensive architectural documentation and test verification of the customer meal coupon claim process, tracing execution from the React client through the Firebase v2 HTTPS Callable function and Firestore transaction engine to voucher creation and presentation.

### Scope
- **Client Discovery & Initiation:** [client/pages/services/Meals.jsx](file:///c:/DEV/PayWaka/PayJeje/client/pages/services/Meals.jsx), [client/pages/services/MealCouponDetail.jsx](file:///c:/DEV/PayWaka/PayJeje/client/pages/services/MealCouponDetail.jsx), [client/lib/mealOfferUtils.js](file:///c:/DEV/PayWaka/PayJeje/client/lib/mealOfferUtils.js), and [client/components/useCloudfunc.jsx](file:///c:/DEV/PayWaka/PayJeje/client/components/useCloudfunc.jsx).
- **Callable Transport & Auth:** `redeemMealCoupon` (onCall) and `verifyUserPinCore` in [functions/index.js](file:///c:/DEV/PayWaka/PayJeje/functions/index.js).
- **Transactional State Engine:** `redeemMealCouponCore` in [functions/index.js](file:///c:/DEV/PayWaka/PayJeje/functions/index.js#L6035-L6405).
- **Security Boundaries:** [firestore.rules](file:///c:/DEV/PayWaka/PayJeje/firestore.rules) and [firestore.indexes.json](file:///c:/DEV/PayWaka/PayJeje/firestore.indexes.json).
- **Integration Test Suites:** [functions/test_stage2_reservation_suite.js](file:///c:/DEV/PayWaka/PayJeje/functions/test_stage2_reservation_suite.js), [functions/test_stage3_2_customer_marketplace_suite.js](file:///c:/DEV/PayWaka/PayJeje/functions/test_stage3_2_customer_marketplace_suite.js), and Vitest specs.

---

## 3. Instructions Given to the AI Agent

1. **Strict Safety Protocol:** Zero edits to source code, zero modifications to security rules or Firebase configs, zero package installations, zero staging or committing of Git changes, and zero alteration of production database state.
2. **Codebase-Grounded Analysis:** Locate actual file paths, function signatures, and collection names. No assumptions or invented abstractions.
3. **Concurrency & Race Inspection:** Deconstruct the exact mechanism preventing over-allocation when two customers claim the final available coupon simultaneously.
4. **Distinction of Testing States:** Explicitly separate tests discovered, tests executed, tests passed, tests failed, and behaviors verified via static analysis only.
5. **Architectural Visualizations:** Construct GitHub-compatible Mermaid diagrams for System Architecture, Customer Claim Lifecycle, Concurrent Last-Coupon Race, Transaction Validation & Write Flow, and Testing Strategy.

---

## 4. System Architecture

PayWaka decouples customer-facing catalog discovery from authoritative accounting using two distinct collections:
- `public_meal_offers`: A sanitized, read-only projection readable by authenticated customers via client SDK. Internal budget ceilings and spent metrics are stripped.
- `meal_campaigns`: The authoritative, locked financial ledger. Direct client reads and writes are strictly forbidden (`allow read, write: if false;` in `firestore.rules`).

### Mermaid Diagram 1: System Architecture

```mermaid
flowchart TD
    subgraph ClientLayer["Client Layer (React 18 SPA)"]
        A["Customer Browser"] --> B["Meals.jsx (Discovery Hub)"]
        B --> C["MealCouponDetail.jsx (Claim Screen)"]
        C --> D["mealOfferUtils.js (Validation)"]
        C --> E["PIN Entry Modal (4 Digits)"]
        E --> F["useCloudfunc.jsx: redeemMealCoupon()"]
    end

    subgraph TransportAuth["Transport & Authentication Layer"]
        F --> G["Firebase v2 Callable: onCall('redeemMealCoupon')"]
        G --> H{"Caller Authenticated?<br/>(request.auth.uid)"}
        H -- No --> I["Abort: HttpsError('unauthenticated')"]
        H -- Yes --> J["verifyUserPinCore()<br/>SHA-256 + Server Pepper"]
        J -- Bad PIN / Lockout --> K["Abort: HttpsError('permission-denied')"]
    end

    subgraph TransactionLayer["Firestore Transaction Boundary: db.runTransaction()"]
        J -- PIN OK --> L["Phase 1: Transaction Reads<br/>• campaignRef<br/>• quarantineRef<br/>• publicOfferRef<br/>• userRef<br/>• claimRef"]
        L --> M{"Phase 2: Validation Invariants<br/>• Not Quarantined?<br/>• Status == 'active'?<br/>• Migration == 'ready'?<br/>• Capacity >= Discount?<br/>• Points >= pointsCost?<br/>• Lifetime Claims < 2?<br/>• No Active Voucher?"}
        M -- Violation --> N["Abort Transaction<br/>Roll Back All Staged Writes"]
        M -- Valid --> O["Phase 3: Transaction Atomic Writes"]
        O --> P1["1. userRef: points -= pointsCost"]
        O --> P2["2. users/{uid}/points: Append debit ledger"]
        O --> P3["3. campaignRef: campaignReservedNaira += discount"]
        O --> P4["4. meal_vouchers/{id}: Write active voucher"]
        O --> P5["5. users/{uid}/mealClaims: Increment count & set active"]
        O --> P6["6. public_meal_offers/{id}: Sync isAvailable"]
    end

    subgraph ClientDelivery["Client Presentation"]
        P4 --> Q["Return Voucher Payload"]
        Q --> R["Navigate to /services/meals/voucher/:voucherId"]
        R --> S["MealVoucherTicket.jsx (QR Code + PIN)"]
    end
```

*Figure 1: End-to-end architecture showing client validation, backend callable authorization, and atomic multi-document writes within `db.runTransaction()`.*

---

## 5. Relevant Files and Functions

| Component | Relative File Path | Symbols / Functions | Implementation Notes |
| :--- | :--- | :--- | :--- |
| **Catalog UI** | [client/pages/services/Meals.jsx](file:///c:/DEV/PayWaka/PayJeje/client/pages/services/Meals.jsx#L227-L310) | `MealsPage` | Real-time subscription to `public_meal_offers` and user's `mealClaims`. Maps fail-closed availability badges. |
| **Detail & Claim UI** | [client/pages/services/MealCouponDetail.jsx](file:///c:/DEV/PayWaka/PayJeje/client/pages/services/MealCouponDetail.jsx#L75-L160) | `MealCouponDetailPage`, `handleExecuteRedemption` | Validates route identity invariants, verifies commercial terms, collects 4-digit PIN, triggers callable. |
| **Pure Validators** | [client/lib/mealOfferUtils.js](file:///c:/DEV/PayWaka/PayJeje/client/lib/mealOfferUtils.js) | `validateOfferIdentity`, `validatePublicOfferTerms`, `resolveOfferAvailability` | Zero side-effects; enforces snapshot ID matching and commercial sanity (`minSpend >= discount > 0`). |
| **Callable Bridge** | [client/components/useCloudfunc.jsx](file:///c:/DEV/PayWaka/PayJeje/client/components/useCloudfunc.jsx#L35) | `redeemMealCoupon` | Client wrapper around Firebase `httpsCallable` with 300-second timeout. |
| **Callable Route** | [functions/index.js](file:///c:/DEV/PayWaka/PayJeje/functions/index.js#L6407-L6415) | `export const redeemMealCoupon` | Cloud Function `onCall` wrapper injecting PIN secrets and establishing caller UID. |
| **PIN Security** | [functions/index.js](file:///c:/DEV/PayWaka/PayJeje/functions/index.js#L3647-L3715) | `verifyUserPinCore` | Cryptographic check against `users/{uid}/private_security/pin_credentials` with 5-attempt progressive lockout. |
| **Transaction Core** | [functions/index.js](file:///c:/DEV/PayWaka/PayJeje/functions/index.js#L6035-L6405) | `redeemMealCouponCore` | Authoritative transactional orchestrator executing pre-reads, assertions, reservation increment, points debit, and voucher issuance. |
| **Security Rules** | [firestore.rules](file:///c:/DEV/PayWaka/PayJeje/firestore.rules#L67-L113) | `rules_version = '2'` | Client write lockdown on `meal_campaigns`, `public_meal_offers`, `meal_vouchers`, and points ledger subcollections. |

---

## 6. Customer Claim Lifecycle

### Mermaid Diagram 2: Customer Claim Lifecycle Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer
    participant UI as MealCouponDetail.jsx
    participant Utils as mealOfferUtils.js
    participant API as useCloudfunc.jsx
    participant Fn as Cloud Function (redeemMealCouponCore)
    participant AuthSec as PIN Security (private_security)
    participant DB as Firestore (db.runTransaction)
    participant Ticket as MealVoucherTicket.jsx

    Customer->>UI: Select Offer on Marketplace
    UI->>Utils: validateOfferIdentity(docSnap, couponId)
    Utils-->>UI: Identity Valid (canonicalCampaignId)
    UI->>Utils: validatePublicOfferTerms(offerData)
    Utils-->>UI: Terms Valid (discountNaira, minSpend, pointsCost)
    Customer->>UI: Click "Unlock Voucher"
    UI->>Customer: Prompt 4-Digit Transaction PIN Modal
    Customer->>UI: Enter PIN ("1842")
    UI->>API: redeemMealCoupon({ couponId, pin, idempotencyKey })
    API->>Fn: POST /redeemMealCoupon (Bearer token + payload)
    
    Fn->>AuthSec: verifyUserPinCore(uid, pin)
    AuthSec-->>Fn: PIN Authenticated (failedAttempts = 0)
    
    Fn->>DB: db.runTransaction(reads -> assertions -> writes)
    Note over DB: Atomically debits points, increments campaignReservedNaira, writes meal_vouchers
    DB-->>Fn: Transaction Committed ({ voucherId, voucherCode, ... })
    
    Fn-->>API: 200 OK ({ success: true, voucher: {...} })
    API-->>UI: Resolution Promise Resolved
    UI->>Ticket: Navigate to /services/meals/voucher/:voucherId
    Ticket->>Customer: Display Active Ticket with Live QR Code & Claim PIN
```

*Figure 2: Sequence diagram detailing the customer claiming flow from client PIN input to digital ticket rendering.*

---

## 7. Firestore Transaction Design

The transaction in `redeemMealCouponCore` ([functions/index.js:6083–6398](file:///c:/DEV/PayWaka/PayJeje/functions/index.js#L6083-L6398)) enforces **Atomicity**, **Consistency**, **Isolation**, and **Durability** (ACID):

### Transaction Phase 1: Pre-Reads (Snapshot Phase)
All transactional reads execute before any write operations:
```javascript
let campaignDoc = resolvedCampSnap.exists ? await t.get(campaignRef) : null;
const quarantineDoc = await t.get(db.collection("quarantined_meal_campaigns").doc(campaignId));
const publicOfferDoc = await t.get(db.collection("public_meal_offers").doc(campaignId));
const userDoc = await t.get(userRef);
const claimDoc = await t.get(claimRef);
```

### Transaction Phase 2: Invariant Validation (Fail-Closed Gates)
1. **Quarantine Check:** `if (quarantineDoc.exists) throw new HttpsError("failed-precondition", "Offer quarantined");`
2. **Readiness Check:** `if (campaignData.migrationStatus !== "ready") throw new HttpsError("failed-precondition");`
3. **Status Check:** `if (campaignData.status !== "active") throw new HttpsError("failed-precondition");` (rejects `paused`, `ended`, `emergency_halt`).
4. **Commercial Terms Invariant:** `if (minSpendNaira < discountNaira) throw new HttpsError("failed-precondition");`
5. **Capacity Invariant:**
   $$\text{availableCapacity} = \text{campaignBudgetNaira} - (\text{campaignSpentNaira} + \text{campaignReservedNaira})$$
   $$\text{if } \text{availableCapacity} < \text{discountNaira} \implies \text{throw HttpsError("resource-exhausted")}$$
6. **Points Balance Invariant:**
   $$\text{if } \text{currentPoints} < \text{pointsCost} \implies \text{throw HttpsError("failed-precondition")}$$
7. **Idempotency Invariant:** If `claimData.claimHistory[safeIdempotencyKey]` already exists, the transaction short-circuits and returns the existing voucher without modifying balances.
8. **Lifetime Abuse Ceiling:** `if (claimData.lifetimeClaimCount >= 2) throw new HttpsError("resource-exhausted");`
9. **Active Voucher Ceiling:** If an unexpired voucher is currently held (`now < activeExpiresAt`) and `status === 'active'`, throws `already-exists`.

### Transaction Phase 3: Atomic Mutation Set
```javascript
// 1. Debit customer spendable balance
t.update(userRef, {
  points: admin.firestore.FieldValue.increment(-pointsCost),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
});

// 2. Append immutable debit record
t.set(ledgerDocRef, {
  type: "meal_voucher_spend",
  points: -pointsCost,
  direction: "debit",
  referenceId: safeIdempotencyKey,
  voucherId: voucherId,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
});

// 3. Atomically reserve promotional budget capacity
t.update(campaignRef, {
  campaignReservedNaira: admin.firestore.FieldValue.increment(discountNaira),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
});

// 4. Create customer voucher document
t.set(voucherDocRef, {
  id: voucherId,
  userId: uid,
  campaignId: campaignId,
  discountNaira: discountNaira,
  voucherCode: voucherCode,
  voucherPin: voucherPin,
  status: "active",
  budgetReserved: true,
  reservedAmountNaira: discountNaira,
  issuedAt: admin.firestore.Timestamp.fromDate(nowDate),
  expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
});

// 5. Update customer lifetime and active state
t.set(claimRef, {
  lifetimeClaimCount: newLifetimeCount,
  activeVoucherId: voucherId,
  activeVoucherExpiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
  claimHistory: updatedHistory,
}, { merge: true });

// 6. Recalculate and synchronize public catalog projection
const newReservedTotal = campaignReserved + discountNaira;
const remainingAfter = campaignBudget - (campaignSpent + newReservedTotal);
t.update(publicOfferRef, {
  isAvailable: remainingAfter >= discountNaira,
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
});
```

### Mermaid Diagram 3: Transaction Flow

```mermaid
flowchart TD
    Start(["Start redeemMealCouponCore()"]) --> ReadCamp["Pre-read: Resolve campaignRef"]
    ReadCamp --> TxStart["Enter db.runTransaction()"]
    
    subgraph Reads["Phase 1: Transaction Reads"]
        TxStart --> R1["t.get(campaignRef)"]
        R1 --> R2["t.get(quarantineRef)"]
        R2 --> R3["t.get(publicOfferRef)"]
        R3 --> R4["t.get(userRef)"]
        R4 --> R5["t.get(claimRef)"]
    end
    
    subgraph Checks["Phase 2: Sequential Invariant Checks"]
        R5 --> C1{"Quarantine doc exists?"}
        C1 -- Yes --> E1["Throw: failed-precondition"]
        C1 -- No --> C2{"migrationStatus == 'ready'?"}
        C2 -- No --> E2["Throw: failed-precondition"]
        C2 -- Yes --> C3{"status == 'active'?"}
        C3 -- No --> E3["Throw: failed-precondition (halted/paused/ended)"]
        C3 -- Yes --> C4{"minSpend >= discount?"}
        C4 -- No --> E4["Throw: failed-precondition"]
        C4 -- Yes --> C5{"availableCapacity >= discount?<br/>(budget - spent - reserved)"}
        C5 -- No --> E5["Throw: resource-exhausted (Sold Out)"]
        C5 -- Yes --> C6{"points >= pointsCost?"}
        C6 -- No --> E6["Throw: failed-precondition (Insufficient pts)"]
        C6 -- Yes --> C7{"idempotencyKey in history?"}
        C7 -- Yes --> ReturnExisting["Return Existing Voucher (Zero Writes)"]
        C7 -- No --> C8{"lifetimeClaimCount < 2?"}
        C8 -- No --> E7["Throw: resource-exhausted (Max 2 reached)"]
        C8 -- Yes --> C9{"Active voucher unexpired?"}
        C9 -- Yes --> E8["Throw: already-exists (Max 1 active)"]
    end

    subgraph Writes["Phase 3: Atomic Mutation Set"]
        C9 -- No --> W1["1. userRef: points -= pointsCost"]
        W1 --> W2["2. users/{uid}/points: Log spend_pts_{key}"]
        W2 --> W3["3. campaignRef: campaignReservedNaira += discount"]
        W3 --> W4["4. meal_vouchers/{id}: Write active voucher (48h)"]
        W4 --> W5["5. users/{uid}/mealClaims: lifetimeCount += 1"]
        W5 --> W6["6. public_meal_offers/{id}: Sync isAvailable"]
    end

    W6 --> Commit(["Commit Transaction & Return Voucher"])
```

*Figure 3: Sequential invariant gate and write flow inside `db.runTransaction()`.*

---

## 8. Concurrent Claim Analysis

### Atomicity vs. Idempotency

| Concept | Architectural Definition in PayWaka | Mechanism in Code |
| :--- | :--- | :--- |
| **Atomicity** | **All-or-Nothing Execution.** Guarantees that points deduction, reservation increment, ledger entry, and voucher creation commit together. If any check fails, zero state changes occur. | Handled by `db.runTransaction()` ([functions/index.js:6083](file:///c:/DEV/PayWaka/PayJeje/functions/index.js#L6083)). |
| **Idempotency** | **Safe Repeatability.** Guarantees that executing the exact same claim request multiple times (e.g., due to network retry) produces the exact same outcome without charging points twice. | Handled by `claimData.claimHistory[safeIdempotencyKey]` check ([functions/index.js:6182](file:///c:/DEV/PayWaka/PayJeje/functions/index.js#L6182)). |

### Concurrency Invariant: The "Last Coupon Race"
Consider a campaign with:
- `campaignBudgetNaira = 1000`
- `campaignSpentNaira = 0`
- `campaignReservedNaira = 500`
- `discountNaira = 500`
- $\text{Remaining Capacity} = 1000 - (0 + 500) = 500$ (Room for exactly **1** more claim).

Two customers ($C_A$ and $C_B$) submit claim requests concurrently.

### Mermaid Diagram 4: Concurrent Last-Coupon Race

```mermaid
sequenceDiagram
    autonumber
    participant CA as Customer A Transaction (Thread 1)
    participant CB as Customer B Transaction (Thread 2)
    participant FS as Firestore Server Lock Coordinator
    participant Doc as meal_campaigns/{campId}

    Note over Doc: Baseline: Budget=₦1,000 | Spent=₦0 | Reserved=₦500 | Available=₦500

    par Concurrent Read Phase
        CA->>Doc: t_A.get(campaignRef)
        Doc-->>CA: Snapshot V1 (Reserved=₦500, Available=₦500)
    and
        CB->>Doc: t_B.get(campaignRef)
        Doc-->>CB: Snapshot V1 (Reserved=₦500, Available=₦500)
    end

    Note over CA: Invariant Check: ₦500 >= ₦500 (PASS)
    Note over CB: Invariant Check: ₦500 >= ₦500 (PASS)

    CA->>FS: Attempt Commit (writes: points debit, Reserved +₦500)
    Note over FS: Check V1 match -> SUCCESS
    FS->>Doc: Update document: Reserved=₦1,000 (Version becomes V2)
    FS-->>CA: Transaction 1 Committed! (Voucher Issued)

    CB->>FS: Attempt Commit (writes: points debit, Reserved +₦500)
    Note over FS: Check V1 match -> MISMATCH! (Doc is now V2)
    FS-->>CB: OCC Conflict Detected! Abort & Trigger Automatic Retry.

    rect rgb(255, 235, 235)
        Note over CB: RETRY PASS: Re-executes callback from line 6083
        CB->>Doc: t_B.get(campaignRef)
        Doc-->>CB: Snapshot V2 (Reserved=₦1,000, Available=₦0)
        Note over CB: Invariant Check: Available (₦0) < Discount (₦500)
        CB-->>CB: THROW HttpsError("resource-exhausted")
        Note over CB: Transaction Aborted Cleanly.<br/>Zero writes staged. Zero points debited.
    end
```

*Figure 4: Sequence diagram explaining how Firestore Optimistic Concurrency Control (OCC) serializes competing transactions, triggering automatic retry and clean rejection.*

---

## 9. Test Strategy and Execution Results

### Mermaid Diagram 5: Testing Strategy Architecture

```mermaid
flowchart TD
    subgraph TestArchitecture["PayWaka Meal Reward Verification Framework"]
        A["Test Execution Layer"] --> B["Vitest (In-Memory Pure Logic)"]
        A --> C["Node.js Integration Suites (Local Emulators)"]
        A --> D["Playwright E2E Suites (Browser Acceptance)"]
        
        B --> B1["mealOfferUtils.spec.js (25 tests)"]
        B --> B2["mealFixtures.spec.js (7 tests)"]
        B --> B3["mealUIIntegrity.spec.js (5 tests)"]
        B --> B4["merchantTerminal.spec.js (10 tests)"]
        
        C --> C1["test_stage2_reservation_suite.js (42 tests)"]
        C --> C2["test_stage3_2_customer_marketplace_suite.js (7 tests)"]
        C --> C3["test_stage1_security_and_roles_suite.js (26 tests)"]
        C --> C4["test_phase5_redemption_suite.js (25 tests)"]
        
        D --> D1["stage2_customer_acceptance.spec.js"]
        D --> D2["stage3_merchant_access_and_redemption.spec.js"]
    end
```

*Figure 5: Three-tier testing strategy spanning client unit tests, backend emulator integration tests, and Playwright acceptance specs.*

---

### Actual Test Execution Output

#### 1. Vitest Client Suites (In-Memory Pure Logic)
Command executed:
```powershell
npx vitest run client/lib/mealOfferUtils.spec.js client/fixtures/mealFixtures.spec.js client/fixtures/mealUIIntegrity.spec.js client/fixtures/merchantTerminal.spec.js
```

Terminal Output:
```
 RUN  v3.2.4 C:/DEV/PayWaka/PayJeje

 ✓ client/fixtures/mealUIIntegrity.spec.js (5 tests) 19ms
 ✓ client/fixtures/mealFixtures.spec.js (7 tests) 42ms
 ✓ client/lib/mealOfferUtils.spec.js (25 tests) 174ms
 ✓ client/fixtures/merchantTerminal.spec.js (10 tests) 77ms

 Test Files  4 passed (4)
      Tests  47 passed (47)
   Start at  11:49:50
   Duration  4.12s
```

#### 2. Backend Stage 2 Reservation & Concurrency Suite
Command executed:
```powershell
firebase emulators:exec --only firestore "node functions/test_stage2_reservation_suite.js"
```

Key Execution Logs Captured:
```
==================================================================
STAGE 2 TEST SUITE: ATOMIC RESERVATION ENGINE & LIFECYCLE SAFETY
==================================================================

▶ [TEST] 1. Claim Reservation: Successful claim atomically reserves capacity & debits points
{"severity":"INFO","message":"🎟️ Meal voucher vch_usr_c_mw4yjcmc_10ls (PWK-8942-2713) issued to user usr_cust_clm_1793968518956 for offer camp_stg2_claim_1793968518942 (-100 pts)."}
✅ [PASS] 1. Claim Reservation: Successful claim atomically reserves capacity & debits points

▶ [TEST] 2. Claim Invariant: Failed claim does NOT debit points or reserve capacity
✅ [PASS] 2. Claim Invariant: Failed claim does NOT debit points or reserve capacity

▶ [TEST] 3. Claim Idempotency: Retrying claim returns original voucher without double-reserve
{"severity":"INFO","message":"🎟️ Meal voucher vch_usr_c_mw4yjd5a_rhyx (PWK-9760-8854) issued to user usr_cust_idem_1793968519771 for offer camp_stg2_idem_1793968519760 (-50 pts)."}
✅ [PASS] 3. Claim Idempotency: Retrying claim returns original voucher without double-reserve

▶ [TEST] 4. Claim Concurrency: Limited budget accommodates only valid claims up to capacity
{"severity":"INFO","message":"🎟️ Meal voucher vch_usr_r_mw4yjdv4_hf5t (PWK-0306-3587) issued to user usr_race_3_1793968520514 for offer camp_stg2_race_1793968520306 (-10 pts)."}
{"severity":"INFO","message":"🎟️ Meal voucher vch_usr_r_mw4yjgj4_pla0 (PWK-0306-9836) issued to user usr_race_0_1793968520324 for offer camp_stg2_race_1793968520306 (-10 pts)."}
✅ [PASS] 4. Claim Concurrency: Limited budget accommodates only valid claims up to capacity

▶ [TEST] 14. Lifecycle: Paused campaign blocks new claims but honors existing valid vouchers
✅ [PASS] 14. Lifecycle: Paused campaign blocks new claims but honors existing valid vouchers

▶ [TEST] 15. Lifecycle: Ended campaign blocks new claims but honors existing valid vouchers
✅ [PASS] 15. Lifecycle: Ended campaign blocks new claims but honors existing valid vouchers

▶ [TEST] 16. Lifecycle: Emergency halt blocks BOTH new claims AND redemptions
✅ [PASS] 16. Lifecycle: Emergency halt blocks BOTH new claims AND redemptions

▶ [TEST] 23. Expiry Engine: Expired active vouchers are marked expired and reservations released exactly once
✅ [PASS] 23. Expiry Engine: Expired active vouchers are marked expired and reservations released exactly once

▶ [TEST] 25b. Redemption-vs-Expiry Concurrency: Simultaneous redemption and expiry sweep execute safely without double-release
✅ [PASS] 25b. Redemption-vs-Expiry Concurrency: Simultaneous redemption and expiry sweep execute safely without double-release

==================================================================
STAGE 2 TEST SUMMARY
==================================================================
TOTAL: 42 | PASSED: 41 | FAILED: 1
(Note: Test 28 failed due to auth emulator not active under --only firestore; all 41 transactional & concurrency tests passed.)
```

#### 3. Backend Stage 3.2 Customer Marketplace Suite
Command executed:
```powershell
firebase emulators:exec --only firestore "node functions/test_stage3_2_customer_marketplace_suite.js"
```

Key Execution Logs Captured:
```
==================================================================
STAGE 3.2 TEST SUITE: CUSTOMER MARKETPLACE & REAL-TIME CONSUMPTION
==================================================================

▶ [TEST] 1. New campaign projection: created via createVendorCampaignCore, public projection matches invariants
✅ [PASS] 1. New campaign projection: created via createVendorCampaignCore, public projection matches invariants

▶ [TEST] 2. Sold-out transition: 1000 budget, 500 discount consumed by 2 claims transitions isAvailable to false
{"severity":"INFO","message":"🎟️ Meal voucher vch_usr_c_mw4yks7b_d3p9 (PWK-WYHT-4199) issued to user usr_cust1_stg32_1793968582835 for offer vPqcSAxfT6OZw1sQwyHt (-100 pts)."}
{"severity":"INFO","message":"🎟️ Meal voucher vch_usr_c_mw4yksfm_x1qj (PWK-WYHT-4061) issued to user usr_cust2_stg32_1793968582835 for offer vPqcSAxfT6OZw1sQwyHt (-100 pts)."}
✅ [PASS] 2. Sold-out transition: 1000 budget, 500 discount consumed by 2 claims transitions isAvailable to false

▶ [TEST] 3. Expiry release: Reconciling expired voucher releases reservation capacity and restores isAvailable to true
{"severity":"INFO","message":"🕒 Expired vouchers reconciliation completed: 1 vouchers expired, 0 orphaned vouchers quarantined, ₦500 reserved released."}
✅ [PASS] 3. Expiry release: Reconciling expired voucher releases reservation capacity and restores isAvailable to true

▶ [TEST] 4. 2-lifetime-claim limit: User claims twice successfully, 3rd claim rejected with resource-exhausted
✅ [PASS] 4. 2-lifetime-claim limit: User claims twice successfully, 3rd claim rejected with resource-exhausted

▶ [TEST] 5. 1-active-voucher limit: User holding active voucher attempts 2nd claim; rejected with already-exists
✅ [PASS] 5. 1-active-voucher limit: User holding active voucher attempts 2nd claim; rejected with already-exists

==================================================================
STAGE 3.2 TEST SUMMARY
==================================================================
TOTAL: 7 | PASSED: 5 | FAILED: 2
(Note: Tests 6 and 7 failed due to auth emulator not active under --only firestore; all 5 claim and capacity tests passed.)
```

---

## 10. Scenario-by-Scenario Verification Matrix

| Scenario | Architectural Invariant | Verification Status | Code & Execution Evidence |
| :--- | :--- | :--- | :--- |
| **Scenario A: Last Available Coupon** | Competing claims cannot exceed promotional budget. Winning thread increments reservation; losing thread retries and throws `resource-exhausted`. No points debited for losing thread. | **RUNTIME VERIFIED** | **Test 4 in `test_stage2_reservation_suite.js` PASSED.** 4 parallel promises fired simultaneously against a ₦1,000 budget (₦500 discount). Exactly 2 succeeded and 2 failed. Stored `campaignReservedNaira` was exactly ₦1,000. |
| **Scenario B: Duplicate Request** | Retrying claim with identical idempotency key returns previously generated voucher without creating duplicates, deducting additional points, or over-reserving. | **RUNTIME VERIFIED** | **Test 3 in `test_stage2_reservation_suite.js` PASSED.** Re-calling `redeemMealCouponCore` with identical idempotency key returned existing voucher record; `campaignReservedNaira` remained ₦500. Supported by code at [functions/index.js:6181-6199](file:///c:/DEV/PayWaka/PayJeje/functions/index.js#L6181-L6199). |
| **Scenario C: Insufficient Points** | Customer with points balance below `pointsCost` is rejected prior to mutations. No points or budget touched. | **RUNTIME VERIFIED** | **Test 2 in `test_stage2_reservation_suite.js` PASSED.** Customer with 50 points attempting to claim a 100-point voucher was rejected with `failed-precondition`. Wallet balance and campaign reservations remained unmutated. Supported by [functions/index.js:6166-6172](file:///c:/DEV/PayWaka/PayJeje/functions/index.js#L6166-L6172). |
| **Scenario D: Exhausted Campaign** | When available capacity is less than promotional discount, new claims are rejected with `resource-exhausted`. | **RUNTIME VERIFIED** | **Test 2 in `test_stage3_2_customer_marketplace_suite.js` PASSED.** Two successive claims consumed ₦1,000 budget; subsequent claim was rejected with `resource-exhausted`. Public projection `isAvailable` was synchronized to `false`. Supported by [functions/index.js:6153-6158](file:///c:/DEV/PayWaka/PayJeje/functions/index.js#L6153-L6158). |

---

## 11. Engineering Risk Assessment

| Finding | Evidence | Severity | Impact | Recommendation |
| :--- | :--- | :---: | :--- | :--- |
| **In-Memory Idempotency Key Volatility** | [client/pages/services/MealCouponDetail.jsx:271](file:///c:/DEV/PayWaka/PayJeje/client/pages/services/MealCouponDetail.jsx#L271) | **Medium** | `claimIdempotencyRef` is held in React component state. A browser reload or network interruption during an in-flight request causes remounting with a new key and timestamp. If the first attempt succeeded on the server, the retry with a new key throws `already-exists` or consumes a 2nd lifetime claim slot. | Persist the pending claim idempotency key in browser `sessionStorage` keyed by `couponId` until resolution. |
| **Pre-Transaction Query Fallback** | [functions/index.js:6063-6066](file:///c:/DEV/PayWaka/PayJeje/functions/index.js#L6063-L6066) | **Low** | If a client supplies a non-canonical `offerId` rather than `campaignId`, the function executes `where("offerId", "==", couponId).limit(1)` before entering `runTransaction`. Under heavy load, non-indexed lookups introduce latency. | Require clients to provide canonical `campaignId` (which [MealCouponDetail.jsx](file:///c:/DEV/PayWaka/PayJeje/client/pages/services/MealCouponDetail.jsx#L276) already extracts) and deprecate the query fallback in production. |
| **Hardcoded In-Memory Catalog Fallback** | [functions/index.js:5964-6020, 6073](file:///c:/DEV/PayWaka/PayJeje/functions/index.js#L5964-L6020) | **Medium** | If a campaign is not found in Firestore, `redeemMealCouponCore` falls back to `DEMO_OFFERS_CATALOG` and auto-creates a Firestore campaign document. An unseeded demo ID could resurrect deleted or deprecated promotions in production. | Guard the fallback behind `process.env.FUNCTIONS_EMULATOR === "true"`. |
| **Direct Client Write in Merchant Dashboard** | [client/pages/services/MealMerchantDashboard.jsx:257](file:///c:/DEV/PayWaka/PayJeje/client/pages/services/MealMerchantDashboard.jsx#L257) | **High** | Store logo upload attempts `setDoc(doc(db, "meal_vendors", id), ...)` directly from the client SDK. [firestore.rules:74](file:///c:/DEV/PayWaka/PayJeje/firestore.rules#L74) specifies `allow write: if false;`, causing a client permission-denied error. | Wire the existing backend callable `updateVendorProfile` ([functions/index.js:8861](file:///c:/DEV/PayWaka/PayJeje/functions/index.js#L8861)) into [useCloudfunc.jsx](file:///c:/DEV/PayWaka/PayJeje/client/components/useCloudfunc.jsx) to perform the update server-side. |
| **High Document Contention on Popular Campaigns** | [functions/index.js:6083](file:///c:/DEV/PayWaka/PayJeje/functions/index.js#L6083) | **Medium** | Because every claim on a campaign updates `meal_campaigns/{id}.campaignReservedNaira`, high concurrency (e.g., flash sales exceeding 50 writes/sec) will trigger high transaction retry rates on a single document. | For large-scale campaigns, consider distributed counter shards for `campaignReservedNaira` or queue-based claim throttling. |

---

## 12. Recommendations

### Immediate Architectural Enhancements
1. **Client Idempotency Persistence:** Store in-flight claim keys in `sessionStorage` with a 5-minute TTL. Upon page reload, check for an in-flight key for the current `couponId` before generating a new timestamp.
2. **Production Gate on Demo Catalog:** Wrap `DEMO_OFFERS_CATALOG` in `if (process.env.FUNCTIONS_EMULATOR === "true")`.
3. **Connect Vendor Profile Cloud Function:** Expose `updateVendorProfile` in `useCloudfunc.jsx` and replace the direct `setDoc` in `MealMerchantDashboard.jsx`.

### Medium-Term Scalability Roadmap
1. **Contention Throttling:** For flash promotions with thousands of concurrent users, evaluate Google Cloud Tasks or Pub/Sub buffering to serialize claims into the transactional engine at controlled rates.
2. **Automated Ledger Auditing:** Implement an automated scheduled job comparing `users/{uid}.points` aggregate balances against the sum of positive and negative records in `users/{uid}/points/*` to detect synchronization anomalies.

---

## 13. What Was Verified vs. Unverified

| Verification Dimension | Status | Evidence / Notes |
| :--- | :---: | :--- |
| **Client In-Memory Validation** | **VERIFIED** | 47/47 Vitest tests passed across `mealOfferUtils.spec.js`, `mealFixtures.spec.js`, `mealUIIntegrity.spec.js`, and `merchantTerminal.spec.js`. |
| **Atomic Budget Reservation** | **VERIFIED** | Tests 1, 2, and 5 in `test_stage2_reservation_suite.js` passed. Budget spent remained 0 while reserved capacity incremented and released correctly. |
| **Live Concurrent Claim Race** | **VERIFIED** | Test 4 in `test_stage2_reservation_suite.js` passed under isolated emulator execution. Exactly 2 of 4 concurrent claims succeeded for a 2-voucher budget. |
| **Claim Idempotency Deduplication** | **VERIFIED** | Test 3 in `test_stage2_reservation_suite.js` passed. Identical keys return existing records without double-debiting. |
| **Abuse Limits (Lifetime & Active)** | **VERIFIED** | Tests 4 and 5 in `test_stage3_2_customer_marketplace_suite.js` passed. 3rd claim rejected with `resource-exhausted`; 2nd active claim rejected with `already-exists`. |
| **Firestore Security Rules Lockdown** | **VERIFIED** | Inspected [firestore.rules](file:///c:/DEV/PayWaka/PayJeje/firestore.rules#L67-L113) and passed Test 29 (`Client SDK cannot write to quarantined_meal_vouchers`). |
| **Live Auth Emulator Client Tests** | **UNVERIFIED IN RUN** | Tests 28 in Stage 2 and Tests 6–7 in Stage 3.2 failed with `auth/network-request-failed` because the Auth emulator was not started alongside the Firestore emulator. |
| **Playwright Full Browser E2E** | **UNVERIFIED IN RUN** | Playwright test specs (`e2e/stage2_customer_acceptance.spec.js`) were inspected but not executed in this run. |

---

## 14. Technical Interview Talking Points

1. **Dual-Collection Pattern for Secure Marketplace Discovery:**  
   *"We separate the customer discovery projection from the financial ledger. Customers read from `public_meal_offers`, which is sanitized and read-only. The core financial truth sits in `meal_campaigns`, where client reads and writes are completely blocked by Firestore Security Rules. This protects vendor commercial terms and prevent client-side price tampering."*
2. **Reservation Accounting vs. Direct Spend:**  
   *"In PayWaka, claiming a voucher does not consume marketing spend (`campaignSpentNaira`). Instead, the claim reserves budget (`campaignReservedNaira += discountNaira`) and debits the customer's spendable points. Marketing spend is only recognized when the merchant cashier validates the order bill and redeems the voucher at the POS terminal. If a voucher expires unredeemed after 48 hours, a scheduled background function releases the reserved capacity back to the campaign."*
3. **Optimistic Concurrency Control (OCC) Under High Contention:**  
   *"When multiple customers race for the final available voucher, Firestore transactions rely on document versioning. The transaction that commits first increments `campaignReservedNaira`. The competing transaction fails commit validation due to a stale read of `campaignRef`, automatically retries, reads the new reserved total, sees available capacity drop below the discount threshold, and throws `resource-exhausted` without making any partial writes."*
4. **Idempotency vs. Atomicity:**  
   *"Atomicity guarantees that customer points debits and campaign capacity reservations commit together or fail together. Idempotency guarantees that if a mobile network drops and the client retries with the same idempotency key, the server identifies the prior transaction in `claimHistory` and returns the existing voucher without charging the customer twice."*

---

## 15. Execution Evidence and Safety Confirmation

### Execution Summary
- **Tests Executed:** 
  - 4 Vitest test files (47 tests): **47 PASSED**.
  - 1 Backend integration suite (`test_stage2_reservation_suite.js`, 42 tests): **41 PASSED, 1 FAILED** (failed due to Auth emulator absence).
  - 1 Backend integration suite (`test_stage3_2_customer_marketplace_suite.js`, 7 tests): **5 PASSED, 2 FAILED** (failed due to Auth emulator absence).
- **Emulators Started:** An ephemeral local Firestore emulator was started temporarily via `firebase emulators:exec --only firestore` on port 8085 and automatically terminated upon script exit. No long-running background emulator processes remain.
- **Production Safety:** All operations ran against project ID `vtu-site-43118` targeting `127.0.0.1`. No production Firebase project, credentials, or live databases were contacted.

### Explicit Safety Confirmation
- **Application Source Files Changed:** **NONE** (0 source files modified).
- **Firestore Security Rules Changed:** **NONE** (0 rules modified).
- **Firebase Configuration Changed:** **NONE** (0 configs modified).
- **Packages Installed / Dependencies Changed:** **NONE** (0 dependencies modified).
- **Production Data Accessed or Modified:** **NONE** (0 production records touched).
- **Generated Report Path:** [PAYWAKA_RUN_02_CONCURRENCY_VERIFICATION.md](file:///c:/DEV/PayWaka/PayJeje/PAYWAKA_RUN_02_CONCURRENCY_VERIFICATION.md) in the project root.

