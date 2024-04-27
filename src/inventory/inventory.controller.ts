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
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { JwtGuard } from 'src/common/guards/jwtAuth.guard';
import { CurrentUser, Permissions, Roles } from 'src/common/decorators';
import { User } from '@prisma/client';
import { TransferDto } from './dto/warehouse-transfer.dto';
import { UpdateRequestDto } from './dto/update-warehouse-transfer.dto';
import { DateTime } from 'luxon';

@Controller('api/v1/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /************************ CREATE ADJUST INVENTORY *****************************/

  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Put('adjustinventory')
  createAdjustInventory(
    @CurrentUser() user: User,
    @Body() adjustInventoryDto: AdjustInventoryDto,
  ) {
    return this.inventoryService.createAdjustInventory(
      user.id,
      adjustInventoryDto,
    );
  }

  /************************ GET ALL ADJUST INVENTORY *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Get('adjustinventory')
  getAdjustInventory(@CurrentUser() user: User) {
    return this.inventoryService.getAdjustInventory(user.id);
  }

  /************************ GET INVENTORY REPORT *********/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Get('report')
  calculateInventoryMetrics(
    @CurrentUser() user: User,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<any> {
    try {
      const processedStartDate = this.processDate(startDate);
      const processedEndDate = this.processDate(endDate);

      const start = DateTime.fromISO(processedStartDate);
      const end = DateTime.fromISO(processedEndDate);

      if (!start.isValid || !end.isValid) {
        throw new Error('Invalid date format');
      }

      const startOfDay = start.startOf('day');
      const endOfDay = end.endOf('day');

      return this.inventoryService.calculateInventoryMetrics(
        user.id,
        startOfDay,
        endOfDay,
      );
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  /************************ GET DEBTORS REPORT *********/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Get('debtors/report')
  debtorsMetrics(
    @CurrentUser() user: User,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<any> {
    try {
      const processedStartDate = this.processDate(startDate);
      const processedEndDate = this.processDate(endDate);

      const start = DateTime.fromISO(processedStartDate);
      const end = DateTime.fromISO(processedEndDate);

      if (!start.isValid || !end.isValid) {
        throw new Error('Invalid date format');
      }

      const startOfDay = start.startOf('day');
      const endOfDay = end.endOf('day');

      return this.inventoryService.debtorsMetrics(
        user.id,
        startOfDay,
        endOfDay,
      );
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  /************************ GET ALL ADJUST INVENTORY *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Get('/:id')
  getAdjustInventoryById(@CurrentUser() user: User, @Param('id') id: number) {
    return this.inventoryService.getAdjustInventoryById(user.id, id);
  }

  /************************ TRANSFER WAREHOUSE QUANTITY *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Put('transfer')
  transferRequest(@CurrentUser() user: User, @Body() transferDto: TransferDto) {
    return this.inventoryService.transferRequest(user.id, transferDto);
  }

  /*********************** GET ALL STOCK REQUEST *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Get('/stock/request')
  getStockRequest(@CurrentUser() user: User) {
    return this.inventoryService.getStockRequest(user.id);
  }

  /************************ UPDATE APPROVAL REQUEST *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Permissions('approver')
  @Patch('stock/request/:id')
  updateStockApprovalRequest(
    @CurrentUser() user: User,
    @Param('id') id: number,
    @Body() updateRequestDto: UpdateRequestDto,
  ): Promise<any> {
    return this.inventoryService.updateStockApprovalRequest(
      user.id,
      id,
      updateRequestDto,
    );
  }

  /************************ GET REQUEST BY REQUEST SERIAL NUMBER *********/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Get('stock/request/:req')
  getRequestByREQ(
    @CurrentUser() user: User,
    @Param('req') req: string,
  ): Promise<any> {
    return this.inventoryService.getRequestByREQ(user.id, req);
  }

  /************************ EDIT TRANSFER REQUEST*****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('approver')
  @Put('stock/request/:id')
  editStockRequest(
    @CurrentUser() user: User,
    @Param('id') id: number,
    @Body() updateRequestDto: UpdateRequestDto,
  ): Promise<any> {
    return this.inventoryService.editStockRequest(
      user.id,
      id,
      updateRequestDto,
    );
  }

  /************************ CREATE STOCK CONFIRMATION *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  // @Permissions('approver')
  @Put('stock/confirmation/:id')
  stockConfirmation(
    @CurrentUser() user: User,
    @Param('id') id: number,
    @Body() updateRequestDto: UpdateRequestDto,
  ) {
    return this.inventoryService.stockConfirmation(
      user.id,
      id,
      updateRequestDto,
    );
  }

  /************************ DELETE STOCK REQUEST *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Delete('stock/delete/:id')
  deleteStockRequest(
    @CurrentUser() user: User,
    @Param('id') id: number,
  ): Promise<any> {
    return this.inventoryService.deleteStockRequest(user.id, id);
  }

  processDate(dateString: string): string {
    const [year, month, day] = dateString.split('-').map(Number);
    const processedDate = new Date(Date.UTC(year, month - 1, day));
    const isoDateString = processedDate.toISOString().split('T')[0]; // Extract date part
    return isoDateString + 'T00:00:00.000Z'; // Append time and UTC timezone
  }
}
