import { describe, it, expect } from "vitest";
import {
  isP2PTransaction,
  isInboundTransaction,
  getTransactionDisplayTitle,
  maskAccountIdentifier,
  formatReceiptNarration,
  extractSessionId,
  getFeeReference,
  computeReceiptChecksum,
} from "./receiptUtils";

describe("PayWaka Receipt & Transaction Utilities", () => {
  it("scopes Zero-Fee P2P detection strictly to P2P transfers", () => {
    expect(isP2PTransaction({ tx_ref: "pwkp2p202611171234567890" })).toBe(true);
    expect(isP2PTransaction({ isP2P: true, tx_ref: "pwk202611171234567890" })).toBe(true);
    expect(isP2PTransaction({ tx_ref: "PWK-P2P-abc-123" })).toBe(true);

    // Bank withdrawals, deposits & utility bills must NOT trigger P2P zero-fee badge
    expect(isP2PTransaction({ tx_ref: "pwk202611171234567890", category: "Withdrawal" })).toBe(false);
    expect(isP2PTransaction({ tx_ref: "pwk202611171234567890", category: "Wallet Funding" })).toBe(false);
    expect(isP2PTransaction({ tx_ref: "pwk202611171234567890", category: "Electricity" })).toBe(false);
  });

  it("formats entity-driven titles as Transfer from/to {Name} instead of raw narration", () => {
    expect(
      getTransactionDisplayTitle({
        type: "inflow",
        senderName: "Divine Anyanechi",
        narration: "WALLET FUNDING",
      }),
    ).toBe("Transfer from Divine Anyanechi");

    expect(
      getTransactionDisplayTitle({
        type: "outflow",
        recipientName: "Sammy Anyanechi",
        narration: "Flex bro",
        isP2P: true,
      }),
    ).toBe("Transfer to Sammy Anyanechi");

    // Strips Flutterwave PAYOUTSUB internal prefix if encountered in legacy records
    expect(
      getTransactionDisplayTitle({
        type: "outflow",
        fullname: "PAYOUTSUB Sammy Anyanechi",
      }),
    ).toBe("Transfer to Sammy Anyanechi");
  });

  it("detects inbound vs outbound transactions accurately", () => {
    expect(isInboundTransaction({ type: "inflow" })).toBe(true);
    expect(isInboundTransaction({ category: "Wallet Funding" })).toBe(true);
    expect(isInboundTransaction({ type: "outflow" })).toBe(false);
  });

  it("masks 10-digit NUBAN account numbers and 15-digit Barter IDs properly", () => {
    expect(maskAccountIdentifier("8136259221", true)).toBe("813****221");
    expect(maskAccountIdentifier("8136259221", false)).toBe("8136259221");
    expect(maskAccountIdentifier("234000003565029", true)).toBe("2340*******5029");
  });

  it("masks embedded 10-digit account numbers inside narration strings while keeping pwk references intact", () => {
    expect(
      formatReceiptNarration(
        "Withdrawal to Opay - 8136259221 | pwk202611171649847408",
        "pwk202611171649847408",
        true,
      ),
    ).toBe("Withdrawal to Opay - 813****221 | pwk202611171649847408");
    expect(
      formatReceiptNarration(
        "Withdrawal to Opay - 8136259221 | pwk202611171649847408",
        "pwk202611171649847408",
        false,
      ),
    ).toBe("Withdrawal to Opay - 8136259221 | pwk202611171649847408");
  });

  it("strips PSA_ prefix when extracting deposit Session ID", () => {
    expect(
      extractSessionId({ flw_ref: "PSA_100004261116183522177697125157" }),
    ).toBe("100004261116183522177697125157");
    expect(
      extractSessionId({ sessionId: "PSA_100004261116183522177697125157" }),
    ).toBe("100004261116183522177697125157");
  });

  it("derives companion fee reference without dashes/underscores for pwk/pwkp2p refs", () => {
    expect(getFeeReference({ tx_ref: "pwk202611171234567890" })).toBe(
      "pwkfee202611171234567890",
    );
  });

  it("produces deterministic 64-char hex checksums", () => {
    const tx = { tx_ref: "pwk202611171234567890", amount: 5000, created_at: "2026-11-17T10:00:00Z" };
    const sig1 = computeReceiptChecksum(tx);
    const sig2 = computeReceiptChecksum(tx);
    expect(sig1).toBe(sig2);
    expect(sig1).toMatch(/^[0-9a-f]{64}$/);
  });
});
