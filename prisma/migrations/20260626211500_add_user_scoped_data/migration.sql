ALTER TABLE "orders" ADD COLUMN "user_id" INTEGER;
ALTER TABLE "inventory" ADD COLUMN "user_id" INTEGER;

UPDATE "orders"
SET "user_id" = (SELECT "id" FROM "users" ORDER BY "id" ASC LIMIT 1)
WHERE "user_id" IS NULL
  AND EXISTS (SELECT 1 FROM "users");

UPDATE "inventory"
SET "user_id" = (SELECT "id" FROM "users" ORDER BY "id" ASC LIMIT 1)
WHERE "user_id" IS NULL
  AND EXISTS (SELECT 1 FROM "users");

ALTER TABLE "orders" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "inventory" ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "orders"
ADD CONSTRAINT "orders_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory"
ADD CONSTRAINT "inventory_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
