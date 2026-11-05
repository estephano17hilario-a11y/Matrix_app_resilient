-- READ-ONLY review of accounts that have PRO. Run it in the Supabase SQL editor / psql.
-- Purpose: before the old client-side hole is closed (20261104_subscription_security.sql), find PRO accounts that
-- were NOT paid through Google Play. Anyone could have granted themselves PRO with the old policy, and a
-- hand-granted PRO looks identical to a self-granted one, so this needs a human decision per row.

-- 1) Overview
SELECT plan, es_pro, plan_source,
       (revenuecat_app_user_id IS NOT NULL) AS linked_to_revenuecat,
       count(*) AS users
FROM public.users
GROUP BY 1, 2, 3, 4
ORDER BY users DESC;

-- 2) Suspects: PRO with no store link and no expiry (never verified by RevenueCat).
--    Cross-check each one against the RevenueCat dashboard (Customers) before touching it.
SELECT id, email, display_name, plan, es_pro, created_at, last_login_at
FROM public.users
WHERE plan IN ('PRO', 'ELITE')
  AND revenuecat_app_user_id IS NULL
  AND plan_source IS NULL
ORDER BY created_at;

-- 3) After you decide, downgrade the ones that are not legitimate (edit the id list; run as postgres/service_role):
-- UPDATE public.users SET plan = 'FREE', es_pro = FALSE, "planExpiryDate" = NULL WHERE id IN ('<uuid>', '<uuid>');

-- 4) After deploying sync-subscription, legitimate buyers are re-verified automatically the next time they open the app
--    (they get plan_source = 'revenuecat' and a real expiry date). Check progress with query 1.
