# CCAvenue Payment Gateway – Setup & Test Plan

## Summary

- **Gateway**: CCAvenue (hosted redirect flow).
- **Flow**: Checkout → POST `/api/payments/ccavenue/initiate` → redirect to CCAvenue → callback POST/GET `/api/payments/ccavenue/callback` → verify → update DB → redirect to `/payment/success` or `/payment/failure`.

---

## Replit Secrets (env vars)

Set these in **Replit → Tools → Secrets** (do **not** put values in code).

| Secret name | Description |
|-------------|-------------|
| `CCAVENUE_MERCHANT_ID` | CCAvenue Merchant ID |
| `CCAVENUE_ACCESS_CODE` | CCAvenue Access Code |
| `CCAVENUE_WORKING_KEY` | CCAvenue Working Key (used for encrypt/decrypt; never log it) |
| `APP_URL` or `BASE_URL` | **Recommended on Replit.** Full app URL without trailing slash, e.g. `https://your-repl.replit.app`. Used for redirect/cancel URLs if the server cannot infer them from headers. |
| `CCAVENUE_REDIRECT_URL` | Optional. Override callback URL (default: `{APP_URL}/api/payments/ccavenue/callback`). |
| `CCAVENUE_CANCEL_URL` | Optional. Override cancel URL (default: same as redirect). |
| `CCAVENUE_URL` | Optional. Gateway base URL. Sandbox: `https://test.ccavenue.com`; production: leave unset (default `https://secure.ccavenue.com`). |

---

## Checklist before testing

1. **Secrets**
   - [ ] `CCAVENUE_MERCHANT_ID`, `CCAVENUE_ACCESS_CODE`, `CCAVENUE_WORKING_KEY` set in Replit Secrets.
   - [ ] `APP_URL` set to your Replit app URL (e.g. `https://YourRepl--user.repl.co`) for correct callback URLs.

2. **Admin settings**
   - [ ] Log in as Admin → **Management → Settings**.
   - [ ] Under **CCAvenue Payment Gateway**, turn **Enable CCAvenue Payments** ON and save.
   - [ ] (Optional) Configure convenience fee and rounding.

3. **CCAvenue merchant panel**
   - [ ] In CCAvenue, **Working Key** is **activated** (needed for encrypted response).
   - [ ] Redirect URL in CCAvenue (if required) matches: `https://<your-domain>/api/payments/ccavenue/callback`.

---

## Sandbox test

1. Use CCAvenue **test** credentials in Secrets (and `CCAVENUE_URL` if they give a test base URL).
2. Place an order as a customer; choose **Pay Online**.
3. Complete payment on CCAvenue test page (use test card if provided).
4. You should be redirected to `/payment/success?txnId=<id>` and see order as PAID.
5. Check server logs for lines like:
   - `[payment] CCAvenue initiate: orderId=... merchantTxnId=... amount=... redirectUrl=...`
   - `[payment] CCAvenue callback: merchantTxnId=... orderStatus=Success`

---

## Live test

1. Switch to **live** CCAvenue credentials and remove or change `CCAVENUE_URL` if it was set for test.
2. Ensure `APP_URL` is your **production** URL (HTTPS).
3. Place a small real order with **Pay Online** and complete payment.
4. Confirm redirect to success page and that order/transaction status is updated in DB and UI.

---

## Failure cases to verify

| Case | Expected behavior |
|------|-------------------|
| **User cancels on CCAvenue** | Callback with non-Success status → redirect to `/payment/failure?txnId=...&reason=...`; transaction and order marked failed. |
| **Amount mismatch** | Callback amount ≠ stored amount → redirect to `/payment/failure?txnId=...&error=amount_mismatch`; transaction marked FAILED. |
| **Wrong/missing Working Key** | Decrypt fails → redirect to `/payment/failure?error=decrypt_error`; log `[payment] CCAvenue callback error: ...` (no key logged). |
| **Callback hit twice (idempotency)** | Second callback for same successful payment → no duplicate DB updates; redirect to success. |

---

## Code locations (reference)

- **Backend**
  - Initiate: `server/routes.ts` – `POST /api/payments/ccavenue/initiate`
  - Callback: `server/routes.ts` – `POST/GET /api/payments/ccavenue/callback`, `handleCcavenueCallback`
  - Crypto/params: `server/ccavenue.ts` – `encrypt`, `decrypt`, `parseCallbackResponse`, `computeConvenienceFee`, `generateMerchantTxnId`
- **Frontend**
  - Checkout / Pay Online: `client/src/pages/customer-book.tsx`, `product-details.tsx`
  - Success/failure pages: `client/src/pages/payment-success.tsx`, `payment-failure.tsx`
- **Settings**
  - Public API: `GET /api/payment/settings` (returns `ccavenueEnabled`, etc.)
  - Admin UI: `client/src/pages/management/settings.tsx` (CCAvenue toggles and fee config)

Logs are safe: no merchant id, access code, or working key are ever printed.
