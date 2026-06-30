ALTER TABLE "inventory"
ADD COLUMN "month" VARCHAR(20),
ADD COLUMN "min_stock" INTEGER,
ADD COLUMN "order_at_least" INTEGER,
ADD COLUMN "avg_daily_demand" DECIMAL(10, 2);
