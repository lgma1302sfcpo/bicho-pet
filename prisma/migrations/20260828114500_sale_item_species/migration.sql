ALTER TABLE "sale_items" ADD COLUMN "species" "PetSpecies";

UPDATE "sale_items" AS sale_item
SET "species" = product."species"
FROM "products" AS product
WHERE sale_item."productId" = product."id";
