-- Existing secondary branches start with zero stock; the main branch kept the legacy balance.
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
WHERE pbs."id" IS NULL;
