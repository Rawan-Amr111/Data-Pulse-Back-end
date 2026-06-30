ALTER TABLE "inventory"
ADD COLUMN "min" INTEGER,
ADD COLUMN "order_at_least" INTEGER,
ADD COLUMN "avg_daily_demand" DECIMAL(12, 2),
ADD COLUMN "stock_month" DATE;
