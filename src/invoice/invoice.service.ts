import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { PrismaService } from 'src/common';
import { UsersService } from 'src/auth/users/users.service';
import {
  PaymentMode,
  PaymentStatus,
  Prisma,
  RequestState,
} from '@prisma/client';

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly usersservice: UsersService,
    private readonly logger: Logger,
  ) {}

  async createInvoice(userId: number, createInvoiceDto: CreateInvoiceDto) {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const customer = await this.prismaService.customer.findUnique({
        where: { id: createInvoiceDto.customerId, companyId },
      });

      if (!customer) {
        throw new HttpException(
          `Customer with name ${createInvoiceDto.customerName} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Check for valid product IDs and availability
      await Promise.all(
        createInvoiceDto.itemDetails.map(async (item) => {
          const product = await this.prismaService.product.findUnique({
            where: { id: Number(item.productId) },
            include: { stocks: true },
          });

          if (!product) {
            throw new HttpException(
              `Invalid product ID: ${item.productId}`,
              HttpStatus.BAD_REQUEST,
            );
          }

          const stock = product.stocks.find(
            (stock) => stock.warehouseName === item.warehouseName,
          );

          if (!stock) {
            throw new Error(
              `Stock not found for product ${product.name} and warehouse name ${item.warehouseName}`,
            );
          }

          const totalCommittedQuantity = product.stocks.reduce(
            (acc, curr) => acc + Number(curr.committedQuantity),
            0,
          );
          // console.log(item.quantity, totalCommittedQuantity);

          if (Number(item.quantity) > totalCommittedQuantity) {
            throw new HttpException(
              `Insufficient committed quantity for product ${product.name}`,
              HttpStatus.BAD_REQUEST,
            );
          }

          if (Number(item.quantity) > Number(product.totalStock)) {
            throw new Error(
              `Insufficient committed quantity for product ${product.name}`,
            );
          }
        }),
      );

      if (createInvoiceDto.priceListId) {
        const priceList = await this.prismaService.priceList.findUnique({
          where: { id: createInvoiceDto.priceListId, companyId },
          include: { products: { where: { companyId } } },
        });

        if (!priceList) {
          throw new HttpException(`PriceList not found`, HttpStatus.NOT_FOUND);
        }

        // Compare productIds in the dto with the productIds in the priceList
        const missingProductIds = createInvoiceDto.productIds.filter(
          (productId) =>
            !priceList.products.some((product) => product.id === productId),
        );

        if (missingProductIds.length > 0) {
          throw new HttpException(
            `Products with IDs ${missingProductIds.join(
              ', ',
            )} not found in the PriceList`,
            HttpStatus.NOT_FOUND,
          );
        }
      }

      const salesOrder = await this.prismaService.salesOrder.findFirst({
        where: { SN: createInvoiceDto.orderSN, companyId },
      });

      if (!salesOrder) {
        throw new HttpException(
          `Invalid sales serial number ${createInvoiceDto.orderSN} `,
          HttpStatus.BAD_REQUEST,
        );
      }

      const sales = await this.prismaService.salesOrder.findUnique({
        where: { id: createInvoiceDto.salesId, companyId },
      });

      if (!sales) {
        throw new HttpException(
          `Invalid sales number ${createInvoiceDto.salesId} `,
          HttpStatus.BAD_REQUEST,
        );
      }

      const invoiceNumber = await this.prismaService.invoice.findFirst({
        where: { invoiceSN: createInvoiceDto.invoiceSN, companyId },
      });

      if (invoiceNumber) {
        throw new HttpException(
          `Invoice with serial number ${createInvoiceDto.invoiceSN} already generated`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const salesPerson = await this.prismaService.user.findUnique({
        where: { id: createInvoiceDto.salesPersonId, companyId },
      });
      if (!salesPerson) {
        throw new HttpException(
          `SalesPerson with name ${createInvoiceDto.salesPerson} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      const invoice = await this.prismaService.invoice.create({
        data: {
          orderSN: createInvoiceDto.orderSN,
          invoiceSN: createInvoiceDto.invoiceSN,
          salesDate: createInvoiceDto.salesDate,
          invoiceDate: createInvoiceDto.invoiceDate,
          dueDate: createInvoiceDto.dueDate,
          priceListName: createInvoiceDto.priceListName,
          salesPerson: createInvoiceDto.salesPerson
            ? createInvoiceDto.salesPerson
            : user.primaryContactName,
          discount: createInvoiceDto.discount,
          shippingCharges: createInvoiceDto.shippingCharges,
          notes: createInvoiceDto.notes,
          totalPrice: createInvoiceDto.totalPrice,
          saleOrderId: createInvoiceDto.salesId,
          customerId: createInvoiceDto.customerId,
          itemDetails: createInvoiceDto?.itemDetails?.map((item) => ({
            productId: item?.productId,
            productName: item.productName,
            unitType: item.unitType,
            quantity: item.quantity,
            warehouseName: item.warehouseName,
            amount: item.amount,
            rate: item.rate,
            unit: item.unit,
            baseQty: item.baseQty,
          })),
          companyId,
        },
        //include: { product: { where: { companyId } } },
      });

      await this.updateInventory(invoice.itemDetails);

      //await this.updateCustomerBalance(createInvoiceDto.customerId, companyId);

      //Update sales order status
      await this.prismaService.salesOrder.update({
        where: {
          id: createInvoiceDto.salesId,
        },
        data: {
          status: RequestState.COMPLETED,
          companyId,
        },
      });

      return {
        status: 'Success',
        message: 'Invoice created successfully',
        data: invoice,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while creating invoice',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getAllInvoices(userId: number): Promise<any> {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      // Fetch all invoices for the given companyId
      const invoices = await this.prismaService.invoice.findMany({
        where: { companyId },
        include: {
          //product: { where: { companyId } },
          payments: { where: { companyId } },
          salesOrder: { where: { companyId } },
          customer: { where: { companyId } },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        status: 'Success',
        message: 'Invoices retrieved successfully',
        data: invoices,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while creating invoice',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getInvoiceById(userId: number, invoiceId: number): Promise<any> {
    try {
      // Check if the user exists with associated relationships
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const invoice = await this.prismaService.invoice.findUnique({
        where: { id: invoiceId, companyId },
        include: {
          // product: { where: { companyId } },
          payments: { where: { companyId } },
          salesOrder: { where: { companyId } },
          customer: { where: { companyId } },
        },
      });

      if (!invoice) {
        throw new HttpException('Invoice not found', HttpStatus.NOT_FOUND);
      }

      return {
        status: 'Success',
        data: invoice,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while creating invoice',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  private async updateInventory(itemDetails: any) {
    try {
      for (const item of itemDetails) {
        const product = await this.prismaService.product.findUnique({
          where: { id: Number(item.productId) },
          include: { stocks: { orderBy: { createdAt: 'asc' } } },
        });

        if (!product) {
          throw new Error(`Product not found for ID ${item.productId}`);
        }

        let remainingQuantity = Number(item.quantity);

        for (const stock of product.stocks) {
          if (remainingQuantity <= 0) {
            break; // Stop processing if all ordered quantity is fulfilled
          }

          // Calculate available quantity in the current batch
          const availableQuantity = Math.min(
            Number(stock.committedQuantity),
            remainingQuantity,
          );

          // Update committed quantity for the current batch
          const updatedCommittedQuantity =
            Number(stock.committedQuantity) - availableQuantity;

          // Update stock in the database
          await this.prismaService.stock.update({
            where: { id: stock.id },
            data: { committedQuantity: updatedCommittedQuantity },
          });

          // Update remaining quantity for the next batch
          remainingQuantity -= availableQuantity;
        }

        // If remainingQuantity is still greater than 0, it means insufficient stock
        if (remainingQuantity > 0) {
          throw new Error(`Insufficient quantity for product ${product.name}`);
        }
      }
    } catch (error) {
      throw error;
    }
  }

  public async updateCustomerBalance(customerId: number, companyId: number) {
    const invoices = await this.prismaService.invoice.findMany({
      where: { customerId, companyId },
    });

    const totalInvoiceAmount = invoices.reduce(
      (total, invoice) =>
        total + parseFloat(invoice.totalPrice.replace(/,/g, '')),
      0,
    );

    // Filter payments based on payment mode
    const payments = await this.prismaService.payment.findMany({
      where: {
        OR: [
          { paymentMode: PaymentMode.CASH },
          { paymentMode: PaymentMode.TRANSFER },
        ],
        customerId,
        companyId,
      },
    });

    const totalPaymentAmount = payments.reduce(
      (total, payment) =>
        total + parseFloat(payment.amountPaid.replace(/,/g, '')),
      0,
    );

    const balance = totalPaymentAmount - totalInvoiceAmount;

    await this.prismaService.customer.update({
      where: { id: customerId },
      data: {
        balance,
        totalInvoiceAmount,
        totalPaymentAmount,
      },
    });
  }

  async cancelInvoice(userId: number, invoiceId: number, comment: string) {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const invoice = await this.prismaService.invoice.findUnique({
        where: { id: invoiceId, companyId },
      });

      if (!invoice) {
        throw new HttpException('Invoice not found', HttpStatus.NOT_FOUND);
      }

      // If the invoice is part payment, update customer balance
      if (invoice.paymentStatus === PaymentStatus.PART) {
        await this.updateCustomerCanceledBal(
          invoice.customerId,
          invoice.companyId,
        );
      }

      // Restore the inventory by adding back the quantities of items sold
      await this.updateInventoryForInvoice(invoice.itemDetails);

      // Update the status of related sales orders, for example, change it to "Pending" again
      // await this.prismaService.salesOrder.update({
      //   where: { id: invoice.saleOrderId },
      //   data: { status: RequestState.PENDING },
      // });

      await this.prismaService.invoice.update({
        where: { id: invoiceId, companyId },
        data: {
          comment,
          paymentStatus: 'CANCELLED',
        },
      });

      return {
        status: 'Success',
        message: 'Invoice canceled successfully',
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while canceling the invoice',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw error;
    }
  }

  private async updateInventoryForInvoice(itemDetails: any) {
    try {
      // Retrieve product IDs from itemDetails
      const productIds = itemDetails.map((item) => item.productId);

      // Retrieve products with associated stocks
      const products = await this.prismaService.product.findMany({
        where: { id: { in: productIds } },
        include: { stocks: true },
      });

      for (const item of itemDetails) {
        const product = products.find((p) => p.id === item.productId);

        if (!product) {
          throw new Error(`Product not found for ID ${item.productId}`);
        }

        const stock = product.stocks.find(
          (stock) => stock.warehouseName === item.warehouseName,
        );

        if (!stock) {
          throw new Error(
            `Stock not found for product ${product.name} and warehouse ${item.warehouseName}`,
          );
        }

        // Update the inventory quantities
        const updatedQuantity =
          Number(stock.openingStock) + Number(item.quantity);
        const totalStock = product.totalStock + Number(item.quantity);

        // Update the stock record
        await this.prismaService.stock.update({
          where: { id: stock.id },
          data: { openingStock: String(updatedQuantity) },
        });

        // Update the product's total stock
        await this.prismaService.product.update({
          where: { id: product.id },
          data: { totalStock },
        });
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while canceling the invoice',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw error;
    }
  }

  public async updateCustomerCanceledBal(
    customerId: number,
    companyId: number,
  ) {
    try {
      const canceledInvoices = await this.prismaService.invoice.findMany({
        where: { customerId, companyId, paymentStatus: RequestState.CANCELLED },
      });

      const totalCanceledInvoiceAmount = canceledInvoices.reduce(
        (total, invoice) =>
          total + parseFloat(invoice.totalPrice.replace(/,/g, '')),
        0,
      );

      // Retrieve the customer's current balance
      const customer = await this.prismaService.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new HttpException('Customer not found', HttpStatus.NOT_FOUND);
      }

      // Deduct the canceled invoice amount from the total invoice amount
      const updatedTotalInvoiceAmount =
        customer.totalInvoiceAmount - totalCanceledInvoiceAmount;

      // Calculate the new balance
      const balance = customer.totalPaymentAmount - updatedTotalInvoiceAmount;

      // Update the customer's balance in the database
      await this.prismaService.customer.update({
        where: { id: customerId },
        data: {
          balance,
          totalInvoiceAmount: updatedTotalInvoiceAmount,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while updating customer balance',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw error;
    }
  }

  async deleteInvoice(userId: number, invoiceId: number) {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      // Retrieve the invoice details including the items sold
      const invoice = await this.prismaService.invoice.findUnique({
        where: { id: invoiceId, companyId },
      });

      if (!invoice) {
        throw new HttpException('Invoice not found', HttpStatus.NOT_FOUND);
      }

      await this.prismaService.invoice.delete({
        where: { id: invoiceId },
      });

      return {
        status: 'Success',
        message: 'Invoice deleted successfully',
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while deleting the invoice',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw error;
    }
  }

  // private async updateInventory(itemDetails: any) {
  //   try {
  //     const productIds = itemDetails.map((item) => item.productId);
  //     const products = await this.prismaService.product.findMany({
  //       where: { id: { in: productIds } },
  //       include: { stocks: true },
  //     });

  //     for (const item of itemDetails) {
  //       const product = products.find((p) => p.id === item.productId);

  //       if (!product) {
  //         throw new Error(`Product not found for ID ${item.productId}`);
  //       }

  //       const stock = product.stocks.find(
  //         (stock) => stock.warehouseName === item.warehouseName,
  //       );

  //       if (!stock) {
  //         throw new Error(
  //           `Stock not found for product ${product.name} and warehouse ${item.warehouseName}`,
  //         );
  //       }

  //       if (Number(item.quantity) > Number(stock.committedQuantity)) {
  //         throw new Error(
  //           `Insufficient committed quantity for product ${product.name}`,
  //         );
  //       }

  //       // Update inventory quantity
  //       const updatedCommittedStock =
  //         Number(stock.committedQuantity) - Number(item.quantity);
  //       const updatedTotalStock = product.totalStock - Number(item.quantity);

  //       await this.prismaService.stock.update({
  //         where: { id: stock.id },
  //         data: {
  //           committedQuantity: updatedCommittedStock,
  //         },
  //       });

  //       await this.prismaService.product.update({
  //         where: { id: product.id },
  //         data: {
  //           totalStock: updatedTotalStock,
  //         },
  //       });
  //     }
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  // private async updateInventory(itemDetails: any) {
  //   try {
  //     const productIds = itemDetails.map((item) => item.productId);
  //     const products = await this.prismaService.product.findMany({
  //       where: { id: { in: productIds } },
  //       include: { stocks: true },
  //     });

  //     for (const item of itemDetails) {
  //       const product = products.find((p) => p.id === item.productId);

  //       if (!product) {
  //         throw new Error(`Product not found for ID ${item.productId}`);
  //       }

  //       const stock = product.stocks.find(
  //         (stock) => stock.warehouseName === item.warehouseName,
  //       );

  //       if (!stock) {
  //         throw new Error(
  //           `Stock not found for product ${product.name} and warehouse ${item.warehouseName}`,
  //         );
  //       }

  //       if (Number(item.quantity) > Number(stock.openingStock)) {
  //         throw new Error(`Insufficient quantity for product ${product.name}`);
  //       }

  //       //  Update inventory quantity
  //       const updatedQuantity =
  //         Number(stock.openingStock) - Number(item.quantity);
  //       const totalStock: number = product.totalStock - Number(item.quantity);

  //       await this.prismaService.stock.update({
  //         where: { id: stock.id },
  //         data: {
  //           openingStock: String(updatedQuantity),
  //         },
  //       });

  //       await this.prismaService.product.update({
  //         where: { id: product.id },
  //         data: {
  //           totalStock,
  //         },
  //       });
  //     }
  //   } catch (error) {
  //     throw error;
  //   }
  // }
}
