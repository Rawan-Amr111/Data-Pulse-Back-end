-- CreateTable
CREATE TABLE "inventory" (
    "id" SERIAL NOT NULL,
    "product_name" VARCHAR(255) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "demand" VARCHAR(255) NOT NULL,
    "trend" VARCHAR(255) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);
