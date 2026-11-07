-- Non-admin wallets may hold one customer workspace role only.
-- When cleaning pre-existing multi-role demo accounts, keep the brand workspace first,
-- then creator, then investor. Platform admins retain their elevated role and use the
-- admin-only demo workspace selector instead of storing several customer roles.
DELETE FROM "UserRoleBinding" AS role_binding
USING "UserRoleBinding" AS admin_binding
WHERE admin_binding."userId" = role_binding."userId"
  AND admin_binding."role" = 'PLATFORM_ADMIN'
  AND role_binding."role" IN ('CREATOR', 'BRAND_ADMIN', 'INVESTOR');

WITH ranked_workspace_roles AS (
  SELECT "userId", "role",
         ROW_NUMBER() OVER (
           PARTITION BY "userId"
           ORDER BY CASE "role"
             WHEN 'BRAND_ADMIN' THEN 1
             WHEN 'CREATOR' THEN 2
             WHEN 'INVESTOR' THEN 3
           END
         ) AS position
  FROM "UserRoleBinding"
  WHERE "role" IN ('CREATOR', 'BRAND_ADMIN', 'INVESTOR')
)
DELETE FROM "UserRoleBinding" AS role_binding
USING ranked_workspace_roles AS ranked
WHERE role_binding."userId" = ranked."userId"
  AND role_binding."role" = ranked."role"
  AND ranked.position > 1;

CREATE UNIQUE INDEX "UserRoleBinding_one_workspace_per_wallet"
  ON "UserRoleBinding" ("userId")
  WHERE "role" IN ('CREATOR', 'BRAND_ADMIN', 'INVESTOR');
