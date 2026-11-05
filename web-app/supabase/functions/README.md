# Subscriptions: how PRO is activated and deactivated

```
Google Play ──► RevenueCat ──webhook──► revenuecat-webhook ─┐
                    ▲                                         ├─► public.users (plan, es_pro, planExpiryDate)
App ──purchase──────┘     App ──JWT──► sync-subscription ────┘
```

* **RevenueCat is the source of truth.** Both functions re-read the customer's entitlements from the
  RevenueCat REST API and write the result, so duplicated, late or missing webhooks cannot leave a user on
  the wrong plan.
* **Weekly vs monthly**: the plan is active until the store's `expires_date` (stored in `"planExpiryDate"`,
  epoch ms) and `plan_product` records which product it was. Each `RENEWAL` pushes the date forward;
  `EXPIRATION` (or the hourly `expire_lapsed_plans()` sweeper) turns PRO off by itself.
* `CANCELLATION` does **not** remove access (the user paid until the end of the period). `BILLING_ISSUE`
  keeps access during the store's grace period.
* Clients can no longer write `plan`, `es_pro`, `planExpiryDate`, … (trigger `zz_guard_user_plan`), so nobody
  can grant themselves PRO.

## Secrets (set on the edge-functions service of the self-hosted Supabase)

| name | where to get it |
|------|-----------------|
| `REVENUECAT_WEBHOOK_AUTH_TOKEN` | any long random string; paste `Bearer <that string>` in RevenueCat → Project → Integrations → Webhooks → *Authorization header* |
| `REVENUECAT_SECRET_API_KEY` | RevenueCat → Project settings → API keys → **Secret** key (`sk_…`, v1 read access is enough) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | already provided to edge functions by Supabase |

Never put these in the app, in `.env` files that Vite reads, or in git.

## Password reset ("¿Olvidaste tu contraseña?")

The app sends the reset email with `supabase.auth.resetPasswordForEmail`. For it to work on the VPS:

1. **SMTP** must be configured in GoTrue (`GOTRUE_SMTP_HOST/PORT/USER/PASS/ADMIN_EMAIL/SENDER_NAME`). Without it the call fails and the user sees an error.
2. Add `com.luxresilient.app://auth/callback` to the GoTrue redirect allow-list (`ADDITIONAL_REDIRECT_URLS`),
   otherwise the link falls back to `SITE_URL`.
3. The email template "Reset password" must link to `{{ .ConfirmationURL }}` (default).

The link reopens the app, which signs the user in with the recovery session and shows the "new password" dialog.

## Deploy / verify

1. Copy `functions/` (including `_shared/`) into the edge-functions volume of the VPS and restart the
   functions container.
2. Webhook URL for RevenueCat: `https://api.89.117.73.97.sslip.io/functions/v1/revenuecat-webhook`.
   In RevenueCat press **Send test event** → expect HTTP 200 and a row in `subscription_events`.
3. Make a sandbox purchase with a Play *license tester* account and check:
   `select plan, es_pro, "planExpiryDate", plan_product from users where id = '<uuid>';`
4. Only then apply `migrations/20261104_subscription_security.sql`.
