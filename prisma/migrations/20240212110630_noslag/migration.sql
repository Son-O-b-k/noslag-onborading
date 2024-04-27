-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('RETAILER', 'WHOLESALER', 'MANUFACTURER');

-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('WHOLESALER', 'MANUFACTURER');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('SUPPLIER', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "RequestState" AS ENUM ('AWAITING_APPROVAL', 'APPROVED', 'PENDING', 'REJECT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PriceListType" AS ENUM ('SALES', 'PURCHASE');

-- CreateEnum
CREATE TYPE "ItemRate" AS ENUM ('MARK_UP_AND_DOWN', 'INDIVIDUAL_RATE');

-- CreateEnum
CREATE TYPE "TaskState" AS ENUM ('OPEN', 'CANCEL', 'RECEIVE', 'CLOSE', 'DONE', 'PENDING', 'COMPLETED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AppliesTo" AS ENUM ('CUSTOMER', 'SUPPLIER', 'OTHERS');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('CRITICAL', 'HIGH', 'MODERATE', 'LOW');

-- CreateEnum
CREATE TYPE "CompletionStatus" AS ENUM ('Complete', 'Incomplete');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('DRAFT', 'APPROVAL');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'TRANSFER');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('ONTRADE', 'WHOLESALE', 'OFFTRADE');

-- CreateEnum
CREATE TYPE "Track" AS ENUM ('TRUE', 'FALSE');

-- CreateEnum
CREATE TYPE "Type" AS ENUM ('WHOLESALER', 'RETAILER', 'CLUB');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('Active', 'Deactivate');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('Draft', 'Save');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('Active', 'Inactive');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'UNPAID', 'PART');

-- CreateEnum
CREATE TYPE "PaymentModeStatus" AS ENUM ('PART_PAYMENT', 'FULL_PAYMENT');

-- CreateEnum
CREATE TYPE "ModeOfPayment" AS ENUM ('CASH', 'CREDIT', 'OTHER');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('ADMIN', 'COMPANY', 'SUPPLIER', 'CUSTOMER', 'EMPLOYEE');

-- CreateTable
CREATE TABLE "CustomRole" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB,

    CONSTRAINT "CustomRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemRole" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" INTEGER,
    "description" TEXT,
    "permissions" JSONB,

    CONSTRAINT "SystemRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentRole" (
    "id" SERIAL NOT NULL,
    "description" TEXT,
    "name" TEXT NOT NULL,

    CONSTRAINT "DepartmentRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "companyEmail" TEXT NOT NULL,
    "primaryContactName" TEXT,
    "phone" TEXT,
    "password" TEXT,
    "status" "Status",
    "companyId" INTEGER,
    "userType" "UserType" NOT NULL,
    "randomNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resetToken" TIMESTAMP(3),
    "resetTokenExpiresAt" TIMESTAMP(3),
    "imageId" INTEGER,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminCompany" (
    "id" SERIAL NOT NULL,
    "adminID" INTEGER NOT NULL,
    "organizationName" TEXT NOT NULL,
    "companyEmail" TEXT,
    "businessLocation" TEXT,
    "companyAddress" TEXT,
    "postalCode" INTEGER,
    "website" TEXT,
    "currency" TEXT,
    "industry" TEXT,
    "country" TEXT,
    "city" TEXT,
    "state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "primaryContactName" TEXT,
    "title" TEXT,
    "companyEmail" TEXT,
    "registeredBy" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "displayName" TEXT,
    "companyName" TEXT,
    "mobileNumber" TEXT,
    "website" TEXT,
    "currency" TEXT,
    "department" TEXT,
    "supplierType" "SupplierType" NOT NULL,
    "mediaLink" TEXT[],
    "billAddress" JSONB,
    "shippingAddress" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "primaryContactName" TEXT,
    "title" TEXT,
    "companyEmail" TEXT,
    "registeredBy" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "displayName" TEXT,
    "companyName" TEXT,
    "mobileNumber" TEXT,
    "website" TEXT,
    "currency" TEXT,
    "department" TEXT,
    "customerType" "CustomerType" NOT NULL,
    "mediaLink" TEXT[],
    "billAddress" JSONB,
    "shippingAddress" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contacts" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "mobileNumber" TEXT,
    "companyEmail" TEXT,
    "department" TEXT,
    "businessPhone" TEXT,
    "primary" BOOLEAN DEFAULT false,
    "companyId" INTEGER NOT NULL,
    "type" "RequestType",

    CONSTRAINT "Contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Request" (
    "id" SERIAL NOT NULL,
    "REQ" TEXT,
    "name" TEXT NOT NULL,
    "type" "RequestType" NOT NULL,
    "location" TEXT,
    "openedBy" TEXT,
    "opened" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "totalPrice" TEXT,
    "itemDetails" JSONB,
    "approverName" TEXT,
    "state" "RequestState" NOT NULL DEFAULT 'PENDING',
    "companyId" INTEGER NOT NULL,
    "customerId" INTEGER,
    "supplierId" INTEGER,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceList" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PriceListType" NOT NULL,
    "itemRate" "ItemRate" NOT NULL,
    "description" TEXT,
    "percentage" JSONB,
    "currency" TEXT,
    "customerType" "CustomerType",
    "companyId" INTEGER NOT NULL,

    CONSTRAINT "PriceList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "taskSN" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "Priority" NOT NULL,
    "appliesTo" "AppliesTo" NOT NULL,
    "duration" JSONB NOT NULL,
    "notes" TEXT,
    "comments" TEXT,
    "activity" BOOLEAN NOT NULL DEFAULT true,
    "assignedBy" TEXT NOT NULL,
    "imageId" INTEGER,
    "companyId" INTEGER NOT NULL,
    "userId" INTEGER,
    "state" "TaskState" NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderConfirmation" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "itemDetails" JSONB,

    CONSTRAINT "PurchaseOrderConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SerialNumber" (
    "id" SERIAL NOT NULL,
    "prefix" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "currentNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" INTEGER NOT NULL,

    CONSTRAINT "SerialNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductHistory" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "actionBy" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Variance" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "attribute" TEXT NOT NULL,
    "options" TEXT[],
    "productId" INTEGER,

    CONSTRAINT "Variance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemGroup" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "ItemGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" SERIAL NOT NULL,
    "itemName" TEXT NOT NULL,
    "options" TEXT[],
    "purchase" JSONB,
    "sales" JSONB,
    "stock" JSONB,
    "productId" INTEGER,
    "companyId" INTEGER,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "dimensions" TEXT,
    "weight" TEXT,
    "manufacturer" TEXT,
    "brand" TEXT,
    "productCode" TEXT,
    "inventoryTrack" TEXT,
    "createdBy" TEXT,
    "purchase" JSONB,
    "sales" JSONB,
    "totalStock" DOUBLE PRECISION,
    "setInventoryTrack" BOOLEAN DEFAULT false,
    "baseline" TEXT,
    "setBaseline" BOOLEAN DEFAULT false,
    "primarySupplier" TEXT,
    "status" "ProductStatus" DEFAULT 'Active',
    "inventoryAccount" TEXT,
    "customRate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "groupId" INTEGER,
    "description" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WareHouse" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "zipCode" TEXT,
    "phone" TEXT,
    "companyEmail" TEXT NOT NULL,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WareHouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stock" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "itemName" TEXT,
    "warehouseName" TEXT,
    "openingStock" TEXT,
    "openingStockValue" TEXT,
    "createdBy" TEXT,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrder" (
    "id" SERIAL NOT NULL,
    "customerName" TEXT NOT NULL,
    "SN" TEXT NOT NULL,
    "shipmentDate" TIMESTAMP(3) NOT NULL,
    "priceListName" TEXT,
    "discount" TEXT,
    "shippingAddress" TEXT,
    "shippingCharges" TEXT,
    "priority" "Priority" NOT NULL,
    "location" TEXT,
    "itemDetails" JSONB NOT NULL,
    "totalItems" TEXT NOT NULL,
    "totalPrice" TEXT NOT NULL,
    "status" "RequestState" NOT NULL,
    "state" "TaskState" NOT NULL,
    "type" "OrderType" NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "openedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" INTEGER NOT NULL,
    "approverId" INTEGER,
    "assignedToId" INTEGER,
    "requestId" INTEGER,

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" SERIAL NOT NULL,
    "supplierName" TEXT NOT NULL,
    "SN" TEXT NOT NULL,
    "shipmentDate" TIMESTAMP(3),
    "priceListName" TEXT,
    "discount" TEXT,
    "shippingAddress" TEXT NOT NULL,
    "shippingCharges" TEXT,
    "priority" "Priority",
    "location" TEXT,
    "openedBy" TEXT NOT NULL,
    "itemDetails" JSONB,
    "totalItems" TEXT,
    "totalPrice" TEXT,
    "status" "RequestState",
    "state" "TaskState",
    "type" "OrderType",
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "companyId" INTEGER NOT NULL,
    "approverId" INTEGER,
    "assignedToId" INTEGER,
    "requestId" INTEGER,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "user_employeeID" INTEGER NOT NULL,
    "registeredBy" TEXT,
    "dateEngaged" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyEmail" TEXT NOT NULL,
    "salary" DOUBLE PRECISION,
    "bonuses" DOUBLE PRECISION,
    "weekWorked" TEXT,
    "accountNumber" INTEGER,
    "bankPaymentDate" TIMESTAMP(3),
    "weeklyFloat" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemNotifications" (
    "id" SERIAL NOT NULL,
    "message" TEXT NOT NULL,
    "comment" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "companyId" INTEGER NOT NULL,
    "receiverId" INTEGER,
    "userId" INTEGER,
    "approverId" INTEGER,
    "taskId" INTEGER,

    CONSTRAINT "SystemNotifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalNotifications" (
    "id" SERIAL NOT NULL,
    "message" TEXT NOT NULL,
    "comment" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "companyId" INTEGER NOT NULL,
    "notifierId" INTEGER,
    "userId" INTEGER,
    "approverId" INTEGER,
    "salesOrderId" INTEGER,
    "purchaseOrderId" INTEGER,
    "requestId" INTEGER,

    CONSTRAINT "ApprovalNotifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "customerName" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceAmount" TEXT NOT NULL,
    "amountPaid" TEXT NOT NULL,
    "balance" DOUBLE PRECISION DEFAULT 0,
    "paymentStatus" "PaymentModeStatus" NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "companyId" INTEGER NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "productId" INTEGER,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" SERIAL NOT NULL,
    "orderSN" TEXT NOT NULL,
    "invoiceSN" TEXT NOT NULL,
    "salesDate" TIMESTAMP(3) NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "salesPerson" TEXT NOT NULL,
    "priceListName" TEXT,
    "discount" TEXT,
    "shippingCharges" TEXT,
    "notes" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "totalPrice" TEXT NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "itemDetails" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" INTEGER NOT NULL,
    "supplierId" INTEGER,
    "customerId" INTEGER,
    "saleOrderId" INTEGER,
    "purchaseOrderId" INTEGER,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesTransaction" (
    "id" SERIAL NOT NULL,
    "quantity" DOUBLE PRECISION,
    "amount" DOUBLE PRECISION,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transactionTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "saleOrderId" INTEGER NOT NULL,
    "salesRequestId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "productName" TEXT,
    "rate" DOUBLE PRECISION,
    "warehouseName" TEXT,

    CONSTRAINT "SalesTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchasesTransaction" (
    "id" SERIAL NOT NULL,
    "quantity" DOUBLE PRECISION,
    "rate" DOUBLE PRECISION,
    "amount" DOUBLE PRECISION,
    "productName" TEXT,
    "warehouseName" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transactionTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "saleOrderId" INTEGER NOT NULL,
    "salesRequestId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,

    CONSTRAINT "PurchasesTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CustomRoleToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_SystemRoleToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_DepartmentToDepartmentRole" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_DepartmentToPurchaseOrder" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_DepartmentToSalesOrder" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_DepartmentToTask" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_DepartmentToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_CustomerToEmployee" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_CustomerToProduct" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_ContactsToCustomer" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_ContactsToSupplier" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_PriceListToProduct" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_CategoryToProduct" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_ItemGroupToVariance" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_ItemToItemGroup" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_ItemToStock" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_ProductToStock" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_ProductToSupplier" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_ProductToWareHouse" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_StockToWareHouse" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_EmployeeToProduct" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_EmployeeToSupplier" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_InvoiceToProduct" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_ImageToProduct" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemRole_name_key" ON "SystemRole"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_randomNumber_key" ON "User"("randomNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AdminCompany_adminID_key" ON "AdminCompany"("adminID");

-- CreateIndex
CREATE UNIQUE INDEX "AdminCompany_organizationName_key" ON "AdminCompany"("organizationName");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_user_employeeID_key" ON "Employee"("user_employeeID");

-- CreateIndex
CREATE UNIQUE INDEX "Image_publicId_key" ON "Image"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "_CustomRoleToUser_AB_unique" ON "_CustomRoleToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_CustomRoleToUser_B_index" ON "_CustomRoleToUser"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_SystemRoleToUser_AB_unique" ON "_SystemRoleToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_SystemRoleToUser_B_index" ON "_SystemRoleToUser"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_DepartmentToDepartmentRole_AB_unique" ON "_DepartmentToDepartmentRole"("A", "B");

-- CreateIndex
CREATE INDEX "_DepartmentToDepartmentRole_B_index" ON "_DepartmentToDepartmentRole"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_DepartmentToPurchaseOrder_AB_unique" ON "_DepartmentToPurchaseOrder"("A", "B");

-- CreateIndex
CREATE INDEX "_DepartmentToPurchaseOrder_B_index" ON "_DepartmentToPurchaseOrder"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_DepartmentToSalesOrder_AB_unique" ON "_DepartmentToSalesOrder"("A", "B");

-- CreateIndex
CREATE INDEX "_DepartmentToSalesOrder_B_index" ON "_DepartmentToSalesOrder"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_DepartmentToTask_AB_unique" ON "_DepartmentToTask"("A", "B");

-- CreateIndex
CREATE INDEX "_DepartmentToTask_B_index" ON "_DepartmentToTask"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_DepartmentToUser_AB_unique" ON "_DepartmentToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_DepartmentToUser_B_index" ON "_DepartmentToUser"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CustomerToEmployee_AB_unique" ON "_CustomerToEmployee"("A", "B");

-- CreateIndex
CREATE INDEX "_CustomerToEmployee_B_index" ON "_CustomerToEmployee"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CustomerToProduct_AB_unique" ON "_CustomerToProduct"("A", "B");

-- CreateIndex
CREATE INDEX "_CustomerToProduct_B_index" ON "_CustomerToProduct"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ContactsToCustomer_AB_unique" ON "_ContactsToCustomer"("A", "B");

-- CreateIndex
CREATE INDEX "_ContactsToCustomer_B_index" ON "_ContactsToCustomer"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ContactsToSupplier_AB_unique" ON "_ContactsToSupplier"("A", "B");

-- CreateIndex
CREATE INDEX "_ContactsToSupplier_B_index" ON "_ContactsToSupplier"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_PriceListToProduct_AB_unique" ON "_PriceListToProduct"("A", "B");

-- CreateIndex
CREATE INDEX "_PriceListToProduct_B_index" ON "_PriceListToProduct"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CategoryToProduct_AB_unique" ON "_CategoryToProduct"("A", "B");

-- CreateIndex
CREATE INDEX "_CategoryToProduct_B_index" ON "_CategoryToProduct"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ItemGroupToVariance_AB_unique" ON "_ItemGroupToVariance"("A", "B");

-- CreateIndex
CREATE INDEX "_ItemGroupToVariance_B_index" ON "_ItemGroupToVariance"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ItemToItemGroup_AB_unique" ON "_ItemToItemGroup"("A", "B");

-- CreateIndex
CREATE INDEX "_ItemToItemGroup_B_index" ON "_ItemToItemGroup"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ItemToStock_AB_unique" ON "_ItemToStock"("A", "B");

-- CreateIndex
CREATE INDEX "_ItemToStock_B_index" ON "_ItemToStock"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ProductToStock_AB_unique" ON "_ProductToStock"("A", "B");

-- CreateIndex
CREATE INDEX "_ProductToStock_B_index" ON "_ProductToStock"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ProductToSupplier_AB_unique" ON "_ProductToSupplier"("A", "B");

-- CreateIndex
CREATE INDEX "_ProductToSupplier_B_index" ON "_ProductToSupplier"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ProductToWareHouse_AB_unique" ON "_ProductToWareHouse"("A", "B");

-- CreateIndex
CREATE INDEX "_ProductToWareHouse_B_index" ON "_ProductToWareHouse"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_StockToWareHouse_AB_unique" ON "_StockToWareHouse"("A", "B");

-- CreateIndex
CREATE INDEX "_StockToWareHouse_B_index" ON "_StockToWareHouse"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_EmployeeToProduct_AB_unique" ON "_EmployeeToProduct"("A", "B");

-- CreateIndex
CREATE INDEX "_EmployeeToProduct_B_index" ON "_EmployeeToProduct"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_EmployeeToSupplier_AB_unique" ON "_EmployeeToSupplier"("A", "B");

-- CreateIndex
CREATE INDEX "_EmployeeToSupplier_B_index" ON "_EmployeeToSupplier"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_InvoiceToProduct_AB_unique" ON "_InvoiceToProduct"("A", "B");

-- CreateIndex
CREATE INDEX "_InvoiceToProduct_B_index" ON "_InvoiceToProduct"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ImageToProduct_AB_unique" ON "_ImageToProduct"("A", "B");

-- CreateIndex
CREATE INDEX "_ImageToProduct_B_index" ON "_ImageToProduct"("B");

-- AddForeignKey
ALTER TABLE "CustomRole" ADD CONSTRAINT "CustomRole_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AdminCompany"("adminID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AdminCompany"("adminID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminCompany" ADD CONSTRAINT "AdminCompany_adminID_fkey" FOREIGN KEY ("adminID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AdminCompany"("adminID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AdminCompany"("adminID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contacts" ADD CONSTRAINT "Contacts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AdminCompany"("adminID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AdminCompany"("adminID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceList" ADD CONSTRAINT "PriceList_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AdminCompany"("adminID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AdminCompany"("adminID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AdminCompany"("adminID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderConfirmation" ADD CONSTRAINT "PurchaseOrderConfirmation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AdminCompany"("adminID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderConfirmation" ADD CONSTRAINT "PurchaseOrderConfirmation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SerialNumber" ADD CONSTRAINT "SerialNumber_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AdminCompany"("adminID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variance" ADD CONSTRAINT "Variance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AdminCompany"("adminID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variance" ADD CONSTRAINT "Variance_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemGroup" ADD CONSTRAINT "ItemGroup_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AdminCompany"("adminID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AdminCompany"("adminID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AdminCompany"("adminID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ItemGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WareHouse" ADD CONSTRAINT "WareHouse_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AdminCompany"("adminID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AdminCompany"("adminID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AdminCompany"("adminID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AdminCompany"("adminID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AdminCompany"("adminID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_user_employeeID_fkey" FOREIGN KEY ("user_employeeID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemNotifications" ADD CONSTRAINT "SystemNotifications_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemNotifications" ADD CONSTRAINT "SystemNotifications_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AdminCompany"("adminID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemNotifications" ADD CONSTRAINT "SystemNotifications_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemNotifications" ADD CONSTRAINT "SystemNotifications_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemNotifications" ADD CONSTRAINT "SystemNotifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalNotifications" ADD CONSTRAINT "ApprovalNotifications_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalNotifications" ADD CONSTRAINT "ApprovalNotifications_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AdminCompany"("adminID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalNotifications" ADD CONSTRAINT "ApprovalNotifications_notifierId_fkey" FOREIGN KEY ("notifierId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalNotifications" ADD CONSTRAINT "ApprovalNotifications_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalNotifications" ADD CONSTRAINT "ApprovalNotifications_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalNotifications" ADD CONSTRAINT "ApprovalNotifications_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalNotifications" ADD CONSTRAINT "ApprovalNotifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AdminCompany"("adminID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AdminCompany"("adminID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "SalesOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesTransaction" ADD CONSTRAINT "SalesTransaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AdminCompany"("adminID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesTransaction" ADD CONSTRAINT "SalesTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesTransaction" ADD CONSTRAINT "SalesTransaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesTransaction" ADD CONSTRAINT "SalesTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesTransaction" ADD CONSTRAINT "SalesTransaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesTransaction" ADD CONSTRAINT "SalesTransaction_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesTransaction" ADD CONSTRAINT "SalesTransaction_salesRequestId_fkey" FOREIGN KEY ("salesRequestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasesTransaction" ADD CONSTRAINT "PurchasesTransaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AdminCompany"("adminID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasesTransaction" ADD CONSTRAINT "PurchasesTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasesTransaction" ADD CONSTRAINT "PurchasesTransaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasesTransaction" ADD CONSTRAINT "PurchasesTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasesTransaction" ADD CONSTRAINT "PurchasesTransaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasesTransaction" ADD CONSTRAINT "PurchasesTransaction_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasesTransaction" ADD CONSTRAINT "PurchasesTransaction_salesRequestId_fkey" FOREIGN KEY ("salesRequestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AdminCompany"("adminID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomRoleToUser" ADD CONSTRAINT "_CustomRoleToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "CustomRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomRoleToUser" ADD CONSTRAINT "_CustomRoleToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SystemRoleToUser" ADD CONSTRAINT "_SystemRoleToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "SystemRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SystemRoleToUser" ADD CONSTRAINT "_SystemRoleToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentToDepartmentRole" ADD CONSTRAINT "_DepartmentToDepartmentRole_A_fkey" FOREIGN KEY ("A") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentToDepartmentRole" ADD CONSTRAINT "_DepartmentToDepartmentRole_B_fkey" FOREIGN KEY ("B") REFERENCES "DepartmentRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentToPurchaseOrder" ADD CONSTRAINT "_DepartmentToPurchaseOrder_A_fkey" FOREIGN KEY ("A") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentToPurchaseOrder" ADD CONSTRAINT "_DepartmentToPurchaseOrder_B_fkey" FOREIGN KEY ("B") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentToSalesOrder" ADD CONSTRAINT "_DepartmentToSalesOrder_A_fkey" FOREIGN KEY ("A") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentToSalesOrder" ADD CONSTRAINT "_DepartmentToSalesOrder_B_fkey" FOREIGN KEY ("B") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentToTask" ADD CONSTRAINT "_DepartmentToTask_A_fkey" FOREIGN KEY ("A") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentToTask" ADD CONSTRAINT "_DepartmentToTask_B_fkey" FOREIGN KEY ("B") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentToUser" ADD CONSTRAINT "_DepartmentToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentToUser" ADD CONSTRAINT "_DepartmentToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomerToEmployee" ADD CONSTRAINT "_CustomerToEmployee_A_fkey" FOREIGN KEY ("A") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomerToEmployee" ADD CONSTRAINT "_CustomerToEmployee_B_fkey" FOREIGN KEY ("B") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomerToProduct" ADD CONSTRAINT "_CustomerToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomerToProduct" ADD CONSTRAINT "_CustomerToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactsToCustomer" ADD CONSTRAINT "_ContactsToCustomer_A_fkey" FOREIGN KEY ("A") REFERENCES "Contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactsToCustomer" ADD CONSTRAINT "_ContactsToCustomer_B_fkey" FOREIGN KEY ("B") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactsToSupplier" ADD CONSTRAINT "_ContactsToSupplier_A_fkey" FOREIGN KEY ("A") REFERENCES "Contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactsToSupplier" ADD CONSTRAINT "_ContactsToSupplier_B_fkey" FOREIGN KEY ("B") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PriceListToProduct" ADD CONSTRAINT "_PriceListToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "PriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PriceListToProduct" ADD CONSTRAINT "_PriceListToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToProduct" ADD CONSTRAINT "_CategoryToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToProduct" ADD CONSTRAINT "_CategoryToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ItemGroupToVariance" ADD CONSTRAINT "_ItemGroupToVariance_A_fkey" FOREIGN KEY ("A") REFERENCES "ItemGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ItemGroupToVariance" ADD CONSTRAINT "_ItemGroupToVariance_B_fkey" FOREIGN KEY ("B") REFERENCES "Variance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ItemToItemGroup" ADD CONSTRAINT "_ItemToItemGroup_A_fkey" FOREIGN KEY ("A") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ItemToItemGroup" ADD CONSTRAINT "_ItemToItemGroup_B_fkey" FOREIGN KEY ("B") REFERENCES "ItemGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ItemToStock" ADD CONSTRAINT "_ItemToStock_A_fkey" FOREIGN KEY ("A") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ItemToStock" ADD CONSTRAINT "_ItemToStock_B_fkey" FOREIGN KEY ("B") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToStock" ADD CONSTRAINT "_ProductToStock_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToStock" ADD CONSTRAINT "_ProductToStock_B_fkey" FOREIGN KEY ("B") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToSupplier" ADD CONSTRAINT "_ProductToSupplier_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToSupplier" ADD CONSTRAINT "_ProductToSupplier_B_fkey" FOREIGN KEY ("B") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToWareHouse" ADD CONSTRAINT "_ProductToWareHouse_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToWareHouse" ADD CONSTRAINT "_ProductToWareHouse_B_fkey" FOREIGN KEY ("B") REFERENCES "WareHouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StockToWareHouse" ADD CONSTRAINT "_StockToWareHouse_A_fkey" FOREIGN KEY ("A") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StockToWareHouse" ADD CONSTRAINT "_StockToWareHouse_B_fkey" FOREIGN KEY ("B") REFERENCES "WareHouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeToProduct" ADD CONSTRAINT "_EmployeeToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeToProduct" ADD CONSTRAINT "_EmployeeToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeToSupplier" ADD CONSTRAINT "_EmployeeToSupplier_A_fkey" FOREIGN KEY ("A") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeToSupplier" ADD CONSTRAINT "_EmployeeToSupplier_B_fkey" FOREIGN KEY ("B") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InvoiceToProduct" ADD CONSTRAINT "_InvoiceToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InvoiceToProduct" ADD CONSTRAINT "_InvoiceToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ImageToProduct" ADD CONSTRAINT "_ImageToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ImageToProduct" ADD CONSTRAINT "_ImageToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
