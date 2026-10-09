/*
  Warnings:

  - Added the required column `updated_at` to the `order_item_modifiers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "print_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "printed_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "order_item_modifiers" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "served_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "order_sessions" ADD COLUMN     "payment_requested_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tables" ADD COLUMN     "last_order_at" TIMESTAMP(3),
ADD COLUMN     "seated_at" TIMESTAMP(3);
