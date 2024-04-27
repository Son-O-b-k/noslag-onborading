import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Put,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';
import { JwtGuard } from 'src/common/guards/jwtAuth.guard';
import { CurrentUser, Permissions, Roles } from 'src/common/decorators';
import { User } from '@prisma/client';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { CreateOrderConfirmationDto } from './dto/create-purchase-confirmation.dto';
import { DateTime } from 'luxon';

@Controller('api/v1/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /************************ CREATE SALES ORDER *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  // @Permissions('approver')
  @Put('create-sales-order')
  CreateSalesOrder(
    @CurrentUser() user: User,
    @Body() createSalesOrderDto: CreateSalesOrderDto,
  ) {
    return this.ordersService.CreateSalesOrder(createSalesOrderDto, user.id);
  }

  /************************ GET SALESORDER *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Get('get-sales-order')
  getSalesOrder(@CurrentUser() user: User) {
    return this.ordersService.getSalesOrder(user.id);
  }

  /************************ GET SALES ORDER DRAFT *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Get('get-sales-draft')
  getSalesOrderDraft(@CurrentUser() user: User) {
    return this.ordersService.getSalesOrderDraft(user.id);
  }

  /************************ UPDATE SALES ORDER APPROVAL*****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Permissions('approver')
  @Patch('sales/:salesId')
  updateApprovedSalesOrder(
    @CurrentUser() user: User,
    @Param('salesId') salesId: number,
    @Body() updateOrderDto: UpdateSalesOrderDto,
  ): Promise<any> {
    return this.ordersService.updateApprovedSalesOrder(
      user.id,
      salesId,
      updateOrderDto,
    );
  }

  /************************ EDIT SALES ORDER FIELDS*****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Permissions('approver')
  @Put('sales/:salesId')
  updateSalesOrderFields(
    @CurrentUser() user: User,
    @Param('salesId') salesId: number,
    @Body() updateOrderDto: UpdateSalesOrderDto,
  ): Promise<any> {
    return this.ordersService.updateSalesOrderFields(
      user.id,
      salesId,
      updateOrderDto,
    );
  }

  /************************ GET SALES ORDER BY ID *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Get('sales/:id')
  getSalesOrderById(
    @CurrentUser() user: User,
    @Param('id') id: number,
  ): Promise<any> {
    return this.ordersService.getSalesOrderById(user.id, id);
  }

  /************************ CANCEL SALES ORDER *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Patch('sales/cancel/:id')
  cancelSalesRequest(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Body('comment') comment?: string,
  ) {
    return this.ordersService.cancelSalesOrder(user.id, id, comment);
  }

  /************************ GET PURCHASE ORDER BY ID *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Get('purchase/:id')
  getPurchaseOrderById(
    @CurrentUser() user: User,
    @Param('id') id: number,
  ): Promise<any> {
    return this.ordersService.getPurchaseOrderById(user.id, id);
  }

  /************************ GET CONFIRM ORDER BY ID *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Get('confirm/:id')
  getConfirmationOrderById(
    @CurrentUser() user: User,
    @Param('id') id: number,
  ): Promise<any> {
    return this.ordersService.getConfirmationOrderById(user.id, id);
  }

  /************************ GET ALL PURCHASE ORDER *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Get('get-purchase-order')
  getAllPurchaseOrder(@CurrentUser() user: User) {
    return this.ordersService.getAllPurchaseOrder(user.id);
  }

  /************************ GET APPROVED SALES ORDER ********************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Get('get-approved-sales')
  getApprovedSalesOrder(@CurrentUser() user: User) {
    return this.ordersService.getApprovedSalesOrder(user.id);
  }

  /************************ GET APPROVED PURCHASE ORDER ********************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Get('get-approved-purchase')
  getApprovedPurchaseOrder(@CurrentUser() user: User) {
    return this.ordersService.getApprovedPurchaseOrder(user.id);
  }

  /************************ CREATE PURCHASE ORDER *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  // @Permissions('approver')
  @Put('create-purchase-order')
  CreatePurchaseOrder(
    @CurrentUser() user: User,
    @Body() createPurchaseOrderDto: CreatePurchaseOrderDto,
  ) {
    return this.ordersService.CreatePurchaseOrder(
      createPurchaseOrderDto,
      user.id,
    );
  }

  /************************ CREATE PURCHASE CONFIRMATION *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  // @Permissions('approver')
  @Put('create-purchase-confirmation')
  createPurchaseOrderConfirmation(
    @CurrentUser() user: User,
    @Body() createOrderConfirmationDto: CreateOrderConfirmationDto,
  ) {
    return this.ordersService.createPurchaseOrderConfirmation(
      user.id,
      createOrderConfirmationDto,
    );
  }

  /************************ GET PURCHASE ORDER CONFIRMATION********************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Get('get-purchase-confirmation')
  getAllOrderConfirmationsWithDetails(@CurrentUser() user: User) {
    return this.ordersService.getAllOrderConfirmationsWithDetails(user.id);
  }

  /************************ GET PURCHASE ORDER DRAFT *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Get('get-purchase-draft')
  getPurchaseOrderDraft(@CurrentUser() user: User) {
    return this.ordersService.getPurchaseOrderDraft(user.id);
  }

  /************************ UPDATE PURCHASE ORDER *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Permissions('approver')
  @Patch('purchase/:purchaseId')
  updateApprovedPurchaseOrder(
    @CurrentUser() user: User,
    @Param('purchaseId') purchaseId: number,
    @Body() updateOrderDto: UpdatePurchaseOrderDto,
  ): Promise<any> {
    return this.ordersService.updateApprovedPurchaseOrder(
      user.id,
      purchaseId,
      updateOrderDto,
    );
  }

  /************************ EDIT PURCHASE ORDER FIELDS*****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Permissions('approver')
  @Put('purchase/:purchaseId')
  updatePurchaseOrderFields(
    @CurrentUser() user: User,
    @Param('purchaseId') purchaseId: number,
    @Body() updateOrderDto: UpdateSalesOrderDto,
  ): Promise<any> {
    return this.ordersService.updatePurchaseOrderFields(
      user.id,
      purchaseId,
      updateOrderDto,
    );
  }

  /************************ STAT PURCHASE ORDER *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Get('purchase-stats')
  async getAllPurchaseOrderByFiltering(
    @CurrentUser() user: User,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    try {
      const processedStartDate = this.processDate(startDate);
      const processedEndDate = this.processDate(endDate);

      // Parse the startDate and endDate strings into Luxon DateTime objects
      const start = DateTime.fromISO(processedStartDate);
      const end = DateTime.fromISO(processedEndDate);

      // Check if the parsed dates are valid
      if (!start.isValid || !end.isValid) {
        throw new Error('Invalid date format');
      }

      // Adjust the parsed dates to start and end of the day
      const startOfDay = start.startOf('day');
      const endOfDay = end.endOf('day');

      const stats = await this.ordersService.getAllPurchaseOrderByFiltering(
        user.id,
        startOfDay,
        endOfDay,
      );
      return stats;
    } catch (error) {
      // Handle errors appropriately
      console.error('Error:', error);
      throw error;
    }
  }

  /************************ STAT PURCHASE ORDER *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Get('sales-stats')
  async getAllSalesOrderStatsByFiltering(
    @CurrentUser() user: User,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    try {
      const processedStartDate = this.processDate(startDate);
      const processedEndDate = this.processDate(endDate);

      // Parse the startDate and endDate strings into Luxon DateTime objects
      const start = DateTime.fromISO(processedStartDate);
      const end = DateTime.fromISO(processedEndDate);

      // Check if the parsed dates are valid
      if (!start.isValid || !end.isValid) {
        throw new Error('Invalid date format');
      }

      // Adjust the parsed dates to start and end of the day
      const startOfDay = start.startOf('day');
      const endOfDay = end.endOf('day');

      const stats = await this.ordersService.getAllSalesOrderStatsByFiltering(
        user.id,
        startOfDay,
        endOfDay,
      );
      return stats;
    } catch (error) {
      // Handle errors appropriately
      console.error('Error:', error);
      throw error;
    }
  }

  processDate(dateString: string): string {
    const [year, month, day] = dateString.split('-').map(Number);
    const processedDate = new Date(Date.UTC(year, month - 1, day));
    const isoDateString = processedDate.toISOString().split('T')[0]; // Extract date part
    return isoDateString + 'T00:00:00.000Z'; // Append time and UTC timezone
  }
}
