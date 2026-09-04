-- Keep an automatic assignment only when the customer's history points to one
-- and only one branch. Ambiguous customers remain available for manual review.
ALTER TABLE "customers" ALTER COLUMN "branchId" DROP NOT NULL;

UPDATE "customers" c
SET "branchId" = history."branchId"
FROM (
  SELECT
    s."customerId",
    CASE
      WHEN COUNT(DISTINCT s."branchId") = 1 THEN MIN(s."branchId")
      ELSE NULL
    END AS "branchId"
  FROM "sales" s
  WHERE s."customerId" IS NOT NULL
  GROUP BY s."customerId"
) history
WHERE history."customerId" = c."id";

UPDATE "customers" c
SET "branchId" = NULL
WHERE NOT EXISTS (
  SELECT 1 FROM "sales" s WHERE s."customerId" = c."id"
);
