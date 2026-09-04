-- The product catalog belongs to the tenant and must be available in every store.
-- Missing store balances start at zero; stock remains independent per branch.
INSERT INTO "product_branch_stocks" (
    "id", "tenantId", "branchId", "productId", "stockQuantity", "minStock", "maxStock", "location", "updatedAt"
)
SELECT
    'pbs_' || md5(p."id" || b."id"),
    p."tenantId",
    b."id",
    p."id",
    0,
    p."minStock",
    p."maxStock",
    NULL,
    CURRENT_TIMESTAMP
FROM "products" p
JOIN "branches" b ON b."tenantId" = p."tenantId" AND b."status" = 'ACTIVE'
LEFT JOIN "product_branch_stocks" pbs ON pbs."productId" = p."id" AND pbs."branchId" = b."id"
WHERE pbs."id" IS NULL
ON CONFLICT ("branchId", "productId") DO NOTHING;
