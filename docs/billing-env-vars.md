# Billing & PayFast environment variables

These must be set in every environment (preview, production) via `vercel env add`.

| Var | Sandbox value | Live value |
|---|---|---|
| PAYFAST_MERCHANT_ID | `10000100` | (from PayFast dashboard) |
| PAYFAST_MERCHANT_KEY | `46f0cd694581a` | (from PayFast dashboard) |
| PAYFAST_PASSPHRASE | `jt7NOE43FZPn` | (from PayFast dashboard, must match dashboard) |
| PAYFAST_MODE | `sandbox` | `live` |
| PAYFAST_RETURN_URL | `https://qwikly.co.za/pay/success` | same |
| PAYFAST_CANCEL_URL | `https://qwikly.co.za/pay/cancel` | same |
| PAYFAST_NOTIFY_URL | `https://qwikly.co.za/api/payfast/itn` | same |
| CRON_SECRET | (random 32-char hex) | (different random 32-char hex) |

Set with:

```bash
vercel env add PAYFAST_MERCHANT_ID preview
vercel env add PAYFAST_MERCHANT_ID production
# ... repeat for each var
```

## Notes

- `CRON_SECRET` authenticates the four billing crons (`payfast-reconcile`,
  `trial-sweep`, `renewal-sweep`, `dunning-sweep`). Vercel Cron sends it as
  `Authorization: Bearer <CRON_SECRET>`. Generate a fresh value per
  environment with `openssl rand -hex 32`.
- `PAYFAST_PASSPHRASE` must match the passphrase configured in the PayFast
  merchant dashboard exactly. A mismatch causes every signature check to
  fail silently — verify before going live.
- `PAYFAST_MODE` controls which PayFast hostnames the lib points at. Leave
  on `sandbox` everywhere except production.
