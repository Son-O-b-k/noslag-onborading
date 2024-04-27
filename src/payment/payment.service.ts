import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PrismaService } from 'src/common';
import { UsersService } from 'src/auth/users/users.service';
import { PaymentModeStatus, PaymentStatus, Prisma } from '@prisma/client';
import { InvoiceService } from 'src/invoice/invoice.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly usersservice: UsersService,
    private readonly invoice: InvoiceService,
  ) {}
  async createPayment(userId: number, createPaymentDto: CreatePaymentDto) {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const customer = await this.prismaService.customer.findUnique({
        where: { id: createPaymentDto.customerId, companyId },
      });

      if (!customer) {
        throw new HttpException(
          `Customer with name ${createPaymentDto.customerName} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      const salesOrder = await this.prismaService.salesOrder.findFirst({
        where: { SN: createPaymentDto.orderNumber, companyId },
        include: { request: { where: { companyId } } },
      });

      if (!salesOrder) {
        throw new HttpException(
          `Invalid sales serial number ${createPaymentDto.orderNumber} `,
          HttpStatus.BAD_REQUEST,
        );
      }

      const invoiceNumber = await this.prismaService.invoice.findFirst({
        where: { invoiceSN: createPaymentDto.invoiceNumber, companyId },
      });

      if (!invoiceNumber) {
        throw new HttpException(
          `Invalid invoice serial number ${createPaymentDto.invoiceNumber}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const invoice = await this.prismaService.invoice.findUnique({
        where: { id: createPaymentDto.invoiceId, companyId },
      });

      if (!invoice) {
        throw new HttpException(
          `Invalid invoice ID number ${createPaymentDto.invoiceId}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (createPaymentDto.paymentId) {
        const payment = await this.prismaService.payment.findUnique({
          where: { id: createPaymentDto.paymentId, companyId },
        });

        if (!payment) {
          throw new HttpException(
            `Invalid payment serial number ${createPaymentDto.paymentId}`,
            HttpStatus.BAD_REQUEST,
          );
        }

        // Check if the invoice is already fully paid
        if (invoice.paymentStatus === PaymentStatus.PAID) {
          throw new HttpException(
            `Invoice is already fully paid`,
            HttpStatus.BAD_REQUEST,
          );
        }

        const remainingAmount: number =
          Number(payment.invoiceAmount) - Number(payment.amountPaid);

        // Check if the payment amount exceeds the remaining invoice amount
        if (Number(createPaymentDto.amountPaid) > remainingAmount) {
          throw new HttpException(
            `Payment amount exceeds the remaining invoice amount`,
            HttpStatus.BAD_REQUEST,
          );
        }

        // Update invoice amount paid and payment status
        const updatedPayment = await this.prismaService.payment.update({
          where: { id: payment.id },
          data: {
            amountPaid: payment.amountPaid + createPaymentDto.amountPaid,
            customerName: createPaymentDto.customerName,
            customerId: customer.id,
            orderNumber: createPaymentDto.orderNumber,
            invoiceNumber: invoiceNumber.invoiceSN,
            invoiceAmount: createPaymentDto.invoiceAmount,
            paymentDate: createPaymentDto.paymentDate,
            notes: createPaymentDto.notes,
            balance: createPaymentDto.balance,
            paymentMode: createPaymentDto.paymentMode,
            invoiceId: invoice.id,
            companyId,
            paymentStatus:
              remainingAmount === Number(createPaymentDto.amountPaid)
                ? PaymentModeStatus.FULL_PAYMENT
                : PaymentModeStatus.PART_PAYMENT,
          },
          include: { invoice: true },
        });
      }

      const payment = await this.prismaService.payment.create({
        data: {
          customerName: createPaymentDto.customerName,
          customerId: customer.id,
          orderNumber: createPaymentDto.orderNumber,
          invoiceNumber: invoiceNumber.invoiceSN,
          invoiceAmount: createPaymentDto.invoiceAmount,
          amountPaid: createPaymentDto.amountPaid,
          paymentDate: createPaymentDto.paymentDate,
          notes: createPaymentDto.notes,
          balance: createPaymentDto.balance,
          paymentMode: createPaymentDto.paymentMode,
          paymentStatus: createPaymentDto.paymentStatus,
          invoiceId: invoice.id,
          // productId:createPaymentDto.productId,
          companyId,
        },
        include: { invoice: true },
      });

      if (createPaymentDto.paymentStatus === PaymentModeStatus.PART_PAYMENT) {
        let updatedItemDetails = [];

        // Check this code
        // Check if itemDetails is an array in the invoice
        if (Array.isArray(invoice.itemDetails)) {
          updatedItemDetails = invoice.itemDetails.map((item: any) => {
            return {
              ...item,
              quantity: item.quantity,
            };
          });
        }

        await this.prismaService.invoice.update({
          where: { id: createPaymentDto.invoiceId },
          data: {
            paymentStatus: PaymentStatus.PART,
            //status: PaymentStatus.PART,
          },
        });
      } else {
        await this.prismaService.invoice.update({
          where: { id: createPaymentDto.invoiceId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            //status: PaymentStatus.PAID,
          },
        });
      }

      // Check if salesTransaction is initialized
      if (!this.prismaService.salesTransaction) {
        throw new Error('salesTransaction is not initialized');
      }

      const salesTransactionData = {
        status: payment.paymentStatus,
        saleOrderId: salesOrder.id,
        invoiceId: invoice.id,
        customerId: customer.id,
        salesRequestId: salesOrder.request.id,
        paymentId: payment.id,
        companyId,
      };

      // Map over items and update or create sales transactions
      const items = await this.items(invoice.itemDetails);
      for (const item of items) {
        // Check if sales transaction already exists for this payment
        const existingTransaction =
          await this.prismaService.salesTransaction.findFirst({
            where: {
              paymentId: payment.id,
              companyId,
            },
          });

        if (existingTransaction) {
          // Update existing sales transaction
          await this.prismaService.salesTransaction.update({
            where: { id: existingTransaction.id },
            data: {
              amount: parseFloat(item.amount.replace(/,/g, '')),
              quantity: Number(item.quantity),
              rate: Number(item.rate),
              productName: item.productName,
              warehouseName: item.warehouseName,
              productId: item.productId,
            },
          });
        } else {
          // Create new sales transaction
          await this.prismaService.salesTransaction.create({
            data: {
              ...salesTransactionData,
              amount: parseFloat(item.amount.replace(/,/g, '')),
              quantity: Number(item.quantity),
              rate: Number(item.rate),
              productName: item.productName,
              warehouseName: item.warehouseName,
              productId: item.productId,
            },
          });
        }
      }

      await this.invoice.updateCustomerBalance(customer.id, companyId);
      return {
        status: 'Success',
        message: 'Payment created successfully',
        data: payment,
      };
    } catch (error) {
      console.log(error);
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while creating purchase order',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getAllPayments(userId: number) {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      // Fetch all payments for the given company
      const payments = await this.prismaService.payment.findMany({
        where: { companyId },
        include: {
          invoice: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        status: 'Success',
        message: 'Payments retrieved successfully',
        data: payments,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while creating purchase order',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getPaymentById(userId: number, paymentId: number) {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const Payment = await this.prismaService.payment.findUnique({
        where: { id: paymentId, companyId },
        include: {
          invoice: true,
        },
      });

      if (!Payment) {
        throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
      }

      return {
        status: 'Success',
        data: Payment,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while creating purchase order',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  private async items(itemDetails: any) {
    try {
      const itemsArray = [];
      for (const item of itemDetails) {
        const product = await this.prismaService.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new HttpException(
            `Invalid product ID number ${item.productId}`,
            HttpStatus.BAD_REQUEST,
          );
        }

        itemsArray.push(item);
      }
      return itemsArray;
    } catch (error) {
      throw error;
    }
  }
}
