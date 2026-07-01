/*
  Warnings:

  - You are about to drop the column `min_stock` on the `inventory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "inventory" DROP COLUMN "min_stock",
ADD COLUMN     "min" INTEGER,
ADD COLUMN     "stock_month" DATE,
ALTER COLUMN "avg_daily_demand" SET DATA TYPE DECIMAL(12,2);
