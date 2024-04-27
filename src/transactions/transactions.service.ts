import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { PrismaService } from 'src/common';
import { UsersService } from 'src/auth/users/users.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly usersService: UsersService,
  ) {}
  async salesForTimeInterval(
    userId: number,
    interval: string,
    limit?: number,
  ): Promise<any> {
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      let startDate, endDate;
      const today = DateTime.now();

      switch (interval) {
        case 'day':
          startDate = today.startOf('day').toJSDate();
          endDate = today.endOf('day').toJSDate();
          break;
        case 'week':
          startDate = today.startOf('week').toJSDate();
          endDate = today.endOf('week').toJSDate();
          break;
        case 'month':
          startDate = today.startOf('month').toJSDate();
          endDate = today.endOf('month').toJSDate();
          break;
        case 'year':
          startDate = today.startOf('year').toJSDate();
          endDate = today.endOf('year').toJSDate();
          break;
        default:
          throw new Error('Invalid interval');
      }

      // Query the SalesTransaction table to get the sales summary
      const salesSummary = await this.prismaService.salesTransaction.groupBy({
        by: ['productId'],
        _sum: {
          quantity: true,
          rate: true,
          amount: true,
        },
        where: {
          companyId,
          createdAt: {
            gte: startDate,
            lt: endDate,
          },
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: limit,
      });

      // Get the productIds from the salesSummary
      const productIds = salesSummary.map((summary) => summary.productId);
      //console.log(productIds);
      // Fetch the product details from the database
      const products = await this.prismaService.product.findMany({
        where: {
          id: { in: productIds },
        },
        select: {
          id: true,
          name: true,
          image: true,
        },
      });

      // Add product name and id to the salesSummary
      const result = salesSummary.map((summary) => {
        const product = products.find((p) => p.id === summary.productId);
        return {
          ...summary,
          product,
        };
      });

      return result;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching records',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async findTopSellingProducts(
    userId: number,
    year: number,
    limit: number,
  ): Promise<any> {
    const startOfYear = DateTime.local(year, 1, 1); // Start of the year
    const endOfYear = startOfYear.plus({ years: 1 }).minus({ days: 1 }); // End of the year

    // console.log(startOfYear.toISO()); // Output: "2024-01-01T00:00:00.000-08:00" (for example)
    // console.log(endOfYear.toISO());
    // console.log(startOfYear.toJSDate());
    // console.log(endOfYear.toJSDate());
    //
    try {
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;
      const topSellingProducts =
        await this.prismaService.salesTransaction.groupBy({
          by: ['productId'],
          _sum: {
            amount: true,
            quantity: true,
          },
          where: {
            companyId,
            createdAt: {
              gte: startOfYear.toJSDate(),
              lt: endOfYear.toJSDate(),
            },
          },
          orderBy: {
            _sum: {
              amount: 'desc',
            },
          },
          take: limit, // Optionally, limit the number of products returned
        });

      return topSellingProducts;
    } catch (error) {
      // Handle errors
      console.error('Error finding top selling products:', error);
      throw error;
    }
  }

  async getSalesTransactions(userId: number) {
    try {
      // Check if the user exists with associated relationships
      const user = await this.usersService.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      if (!companyId) {
        throw new HttpException(
          'Company ID not found for the user',
          HttpStatus.NOT_FOUND,
        );
      }

      // Retrieve all products based on companyId
      const salesTransactions =
        await this.prismaService.salesTransaction.findMany({
          where: {
            companyId: companyId,
          },
        });

      // Map each sales transaction to a formatted object
      const formattedTransactions = salesTransactions.map((transaction) => ({
        id: transaction.id,
        quantity: transaction.quantity,
        rate: transaction.rate,
        amount: transaction.amount,
        productName: transaction.productName,
        warehouseName: transaction.warehouseName,
        status: transaction.status,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      }));
      return {
        status: 'Success',
        message: 'Sales Transactions retrieved successfully',
        data: formattedTransactions,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching sales transactions',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async getBestSellingItems(
    userId: number,
    startDate: Date,
    endDate: Date,
    limit: number,
  ) {
    const user = await this.usersService.findUserWithRelationships(userId);
    const companyId =
      user.adminCompanyId?.adminID || user.employeeId?.companyId;

    // Convert start and end dates to Luxon DateTime objects
    const start = DateTime.fromJSDate(startDate, { zone: 'utc' });
    const end = DateTime.fromJSDate(endDate, { zone: 'utc' });

    // Calculate the start of the day (00:00:00)
    const startOfDay = start.startOf('day').toJSDate();

    // Calculate the end of the day (23:59:59.999)
    // Adjust the end time to the end of the day
    const endOfDay = end.endOf('day').toJSDate();

    const salesByItem = await this.prismaService.salesTransaction.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
        amount: true,
      },
      where: {
        companyId,
        AND: [
          { createdAt: { gte: startOfDay } },
          { createdAt: { lt: endOfDay } },
        ],
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: limit,
    });

    // Get item details for each sale group
    const bestSellingItems = await Promise.all(
      salesByItem.map(async (item) => {
        const itemId = item.productId;
        const product = await this.prismaService.product.findUnique({
          where: {
            id: itemId,
          },
          select: {
            id: true,
            name: true,
            image: true,
          },
        });

        return {
          ...product,
          totalSalesAmount: item._sum.amount,
          totalQuantity: item._sum.quantity,
        };
      }),
    );

    return {
      status: 'Successfully retrieved sales',
      bestSellingItems,
    };
  }

  async getSalesByMonth(userId: number, year: number, month: number) {
    const user = await this.usersService.findUserWithRelationships(userId);
    const companyId =
      user.adminCompanyId?.adminID || user.employeeId?.companyId;

    if (!companyId) {
      throw new HttpException(
        'Company ID not found for the user',
        HttpStatus.NOT_FOUND,
      );
    }

    const startDate = DateTime.utc(year, month, 1).startOf('day').toJSDate();
    const endDate = DateTime.utc(year, month, {}).endOf('month').toJSDate();

    // Fetch sales transactions within the specified month
    const sales = await this.prismaService.salesTransaction.findMany({
      where: {
        companyId,
        AND: [
          { createdAt: { gte: startDate } },
          { createdAt: { lt: endDate } },
        ],
      },
      select: {
        amount: true,
        createdAt: true,
      },
    });

    // Generate a list of all days in the month
    const daysInMonth = this.generateDaysInMonth(year, month);

    // Merge sales data with the list of all days
    const salesByDay = this.aggregateSalesByDay(sales, daysInMonth);

    return {
      status: 'Sales Transactions retrieved successfully',
      data: salesByDay,
    };
  }

  aggregateSalesByDay(sales: any[], daysInMonth: Date[]) {
    // Map to store total sales amount for each day
    const salesByDayMap = new Map<string, number>();

    // Initialize salesByDayMap with 0 for each day
    daysInMonth.forEach((date) => {
      const dateStr = date.toISOString().split('T')[0];
      salesByDayMap.set(dateStr, 0);
    });

    // Aggregate sales amounts for each day
    daysInMonth.forEach((date) => {
      const dateStr = date.toISOString().split('T')[0];
      const salesForDay = sales.filter((sale) => {
        const saleDateStr = DateTime.fromJSDate(sale.createdAt).toISODate();
        return saleDateStr === dateStr;
      });

      const totalAmount = salesForDay.reduce(
        (acc, sale) => acc + sale.amount,
        0,
      );
      salesByDayMap.set(dateStr, totalAmount);
    });

    // Convert the Map to an array of objects
    const salesByDay = Array.from(salesByDayMap).map(([date, amount]) => ({
      date,
      amount,
    }));

    return salesByDay;
  }

  generateDaysInMonth(year: number, month: number): Date[] {
    const numDays = new Date(year, month, 0).getDate();
    const daysInMonth: Date[] = [];

    for (let i = 1; i <= numDays; i++) {
      daysInMonth.push(new Date(year, month - 1, i + 1));
    }

    return daysInMonth;
  }
}
