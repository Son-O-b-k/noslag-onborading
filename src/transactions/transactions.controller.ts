import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { CurrentUser, Roles } from 'src/common/decorators';
import { JwtGuard } from 'src/common/guards/jwtAuth.guard';
import { User } from '@prisma/client';
import { DateTime } from 'luxon';

@Controller('api/v1/transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /************************ TOP SELLING ITEMS *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Get('top-selling-items')
  async getBestSellingItems(
    @CurrentUser() user: User,
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
    @Query('limit') limit: number,
  ) {
    const bestSellingItems = await this.transactionsService.getBestSellingItems(
      user.id,
      new Date(startDate),
      new Date(endDate),
      limit,
    );
    return bestSellingItems;
  }

  /************************ SALES SUMMARY *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Get('summary-interval')
  salesForTimeInterval(
    @CurrentUser() user: User,
    @Query('interval') interval: string,
    @Query('limit') limit?: number,
  ) {
    return this.transactionsService.salesForTimeInterval(
      user.id,
      interval,
      limit,
    );
  }

  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Get('top')
  findTopSellingProducts(
    @CurrentUser() user: User,
    @Query('limit') limit: number,
    @Query('year') year: number,
    // @Query('endDate') endDate: DateTime,
  ) {
    return this.transactionsService.findTopSellingProducts(
      user.id,
      limit,
      year,
      //endDate,
    );
  }

  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Get('sales')
  getSalesTransactions(@CurrentUser() user: User) {
    return this.transactionsService.getSalesTransactions(user.id);
  }

  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Get('sales-month')
  getSalesByMonth(
    @CurrentUser() user: User,
    @Query('year') year: number,
    @Query('month') month: number,
  ) {
    return this.transactionsService.getSalesByMonth(user.id, year, month);
  }
}
