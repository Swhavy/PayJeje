# PayWaka Purchase Flow State Machine & Operational Runbook

## Overview

PayWaka employs a **strict 2-Stage State Machine** for all purchase transactions (Airtime, Data, Electricity, Cable TV, Internet). 
- **Stage 1 (Flutterwave PSA Debit)**: Debits real funds from the user's Flutterwave Payout SubAccount (PSA) to the merchant F4B account.
- **Stage 2 (ClubKonnect Fulfillment)**: Delivers VTU / utility bills after Stage 1 is confirmed.

No state is ever inferred or assumed due to network timeouts. Transitions occur exclusively via confirmed API responses, signature-verified webhooks, or direct status queries.

---

## State Lifecycle & Transition Diagram

```
initiated
  │
  ├──► debit_pending
  │      │
  │      ├──► debit_failed ──► debit_failed_reversed [TERMINAL]
  │      ├──► debit_unknown ──(Webhook / Active Poll)──► debit_confirmed | debit_failed_reversed
  │      └──► debit_confirmed
  │             │
  └─────────────┴──► fulfillment_pending
                       │
                       ├──► fulfillment_failed ──► fulfillment_failed_refunded [TERMINAL]
                       ├──► fulfillment_unknown ──(Webhook / Active Poll)──► fulfillment_confirmed | fulfillment_failed_refunded
                       ├──► fulfillment_confirmed [TERMINAL]
                       └──► [Late Success Callback after Refund] ──► fulfillment_confirmed_post_refund (manual_review_queue)
```

---

## State Transition Matrix

| Previous State | Allowed Next States | Trigger Source | Description / Action |
| :--- | :--- | :--- | :--- |
| `none` | `initiated` | Client `processPurchaseFlow` | Idempotency doc created inside Firestore `runTransaction`. |
| `initiated` | `debit_pending` | `processPurchaseFlow` | Spendable Firestore balance reserved (decremented). |
| `debit_pending` | `debit_confirmed` | Immediate API / Webhook / Poll | Flutterwave transfer confirmed success. Proceed to Stage 2. |
| `debit_pending` | `debit_failed` | Immediate API / Webhook / Poll | Flutterwave transfer confirmed failed. |
| `debit_failed` | `debit_failed_reversed` | Internal Transaction | Reservation reversed (balance re-incremented). **TERMINAL**. |
| `debit_pending` | `debit_unknown` | Request Timeout (>10s) | Inconclusive response. Resolved via webhook or active poll. |
| `debit_unknown` | `debit_confirmed` | Webhook / `pollFlutterwaveDebitStatus` | Confirmed success signal. Proceed to Stage 2. |
| `debit_unknown` | `debit_failed_reversed` | Webhook / `pollFlutterwaveDebitStatus` | Confirmed failed signal. Balance re-incremented. **TERMINAL**. |
| `debit_confirmed` | `fulfillment_pending` | `executeClubKonnectFulfillment` | Stage 2 ClubKonnect request dispatched. |
| `fulfillment_pending` | `fulfillment_confirmed` | Immediate API / Webhook / Poll | Fulfillment confirmed success. **TERMINAL**. |
| `fulfillment_pending` | `fulfillment_failed` | Immediate API / Webhook / Poll | Fulfillment confirmed failed. |
| `fulfillment_failed` | `fulfillment_failed_refunded` | Internal Refund Engine | User Firestore balance refunded, `owed_refunds` doc created, instant PSA wallet-to-wallet refund attempted. **TERMINAL**. |
| `fulfillment_pending` | `fulfillment_unknown` | Request Timeout (>10s) | Inconclusive fulfillment response. Resolved via webhook or active poll. |
| `fulfillment_unknown` | `fulfillment_confirmed` | Webhook / `pollClubKonnectFulfillmentStatus` | Confirmed success signal. **TERMINAL**. |
| `fulfillment_unknown` | `fulfillment_failed_refunded` | Webhook / `pollClubKonnectFulfillmentStatus` | Confirmed failed signal. User balance & PSA refunded. **TERMINAL**. |
| `fulfillment_failed_refunded` | `fulfillment_confirmed_post_refund` | Delayed Webhook / Callback | Late success report after refund. Flagged to `manual_review_queue`. |

---

## Provider Webhooks & Verification

### 1. Flutterwave Webhook (`/flutterwaveWebhook`)
- **Endpoint**: `POST /flutterwaveWebhook`
- **Security Verification**: Header `verif-hash` MUST match `FLW_WEBHOOK_HASH` (or `FLW_SECRET_HASH`).
- **Target Event**: `transfer.completed`
- **Guarded Action**: Only acts on transactions currently in `debit_unknown`. Duplicate webhooks for terminal states are safely ignored and logged.

### 2. ClubKonnect Callback (`/clubkonnectCallback`)
- **Endpoint**: `POST /clubkonnectCallback` or `GET /clubkonnectCallback`
- **Security Verification**: Validates request parameters & IP headers.
- **Guarded Action**: Only acts on transactions currently in `fulfillment_unknown`. If received for `fulfillment_failed_refunded`, flags to `fulfillment_confirmed_post_refund` and creates a `manual_review_queue` document.

---

## Admin Operational Runbook for `manual_review_queue`

Items appear in `manual_review_queue` when:
1. **`FULFILLMENT_CONFIRMED_POST_REFUND`**: A late ClubKonnect success report arrived after the user was already refunded.
2. **`STUCK_DEBIT_UNKNOWN`**: A transaction remained in `debit_unknown` for >15 minutes despite polling.
3. **`STUCK_FULFILLMENT_UNKNOWN`**: A transaction remained in `fulfillment_unknown` for >15 minutes despite polling.
4. **`STUCK_PSA_REFUND`**: An `owed_refunds` document remained in `pending_psa_refund` for >30 minutes due to Flutterwave API errors.

### Resolution Steps for Admins:

1. **For `FULFILLMENT_CONFIRMED_POST_REFUND`**:
   - Check ClubKonnect portal with `RequestID` (`idempotencyKey`) to verify if the recipient received the VTU/airtime.
   - If delivered: Contact customer or re-charge wallet balance if agreed.
   - Mark `manual_review_queue` doc status as `resolved`.

2. **For `STUCK_PSA_REFUND`**:
   - Open Flutterwave Dashboard $\rightarrow$ Transfers $\rightarrow$ Payout SubAccounts.
   - Verify if F4B to PSA wallet-to-wallet transfer went through.
   - If unfulfilled, trigger manual wallet-to-wallet transfer from F4B balance to user's PSA `account_reference`.
   - Update `owed_refunds` doc status to `psa_refunded` and `manual_review_queue` status to `resolved`.
