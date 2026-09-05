-- DropIndex
DROP INDEX "Order_status_idx";

-- AlterTable: rename status -> orderStatus, add flat automation contract
ALTER TABLE "Order" DROP COLUMN "status",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "automationStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "city" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "orderStatus" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "supplierId" TEXT,
ADD COLUMN     "supplierOrderId" TEXT,
ADD COLUMN     "supplierOrderStatus" TEXT,
ADD COLUMN     "supplierProductId" TEXT;

-- CreateIndex
CREATE INDEX "Order_orderStatus_idx" ON "Order"("orderStatus");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_automationStatus_idx" ON "Order"("paymentStatus", "automationStatus");