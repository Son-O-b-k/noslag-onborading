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
  ParseIntPipe,
} from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CreateSalesRequestDto } from './dto/create-sales-request.dto';
import { CurrentUser, Permissions, Roles } from 'src/common/decorators';
import { JwtGuard } from 'src/common/guards/jwtAuth.guard';
import { User } from '@prisma/client';
import { UpdateSalesRequestDto } from './dto/update-sales-request.dto';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { UpdatePurchaseRequestDto } from './dto/update-purchase-request.dto';

@Controller('api/v1/requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  /************************ CREATE SALES REQUESTS *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Put('create-sales-request')
  createSalesRequest(
    @CurrentUser() user: User,
    @Body() createSalesRequestDto: CreateSalesRequestDto,
  ) {
    return this.requestsService.createSalesRequest(
      user.id,
      createSalesRequestDto,
    );
  }

  /************************ GET SALES REQUESTS *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Get('get-sales-requests')
  getSalesRequests(@CurrentUser() user: User) {
    return this.requestsService.getSalesRequests(user.id);
  }

  /************************ GET PURCHASE REQUESTS ********************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Get('get-purchase-requests')
  getPurchaseRequests(@CurrentUser() user: User) {
    return this.requestsService.getPurchaseRequests(user.id);
  }

  /************************ GET APPROVED PURCHASE REQUESTS ********************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Get('get-approved-purchase-requests')
  getApprovedPurchaseRequests(@CurrentUser() user: User) {
    return this.requestsService.getApprovedPurchaseRequests(user.id);
  }

  /************************ GET APPROVED SALES REQUESTS ********************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Get('get-approved-sales-requests')
  getApprovedSalesRequests(@CurrentUser() user: User) {
    return this.requestsService.getApprovedSalesRequests(user.id);
  }

  /************************ UPDATE SALES APPROVAL REQUEST *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Permissions('approver')
  @Patch('sales/:salesId')
  updateSalesApprovalRequest(
    @CurrentUser() user: User,
    @Param('salesId') salesId: number,
    @Body() updateRequestDto: UpdateSalesRequestDto,
  ): Promise<any> {
    return this.requestsService.updateSalesApprovalRequest(
      user.id,
      salesId,
      updateRequestDto,
    );
  }

  /************************ EDIT PURCHASE REQUEST*****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('approver')
  @Put('purchase/:id')
  editPurchaseRequest(
    @CurrentUser() user: User,
    @Param('id') id: number,
    @Body() updatePurchaseRequestDto: UpdatePurchaseRequestDto,
  ): Promise<any> {
    return this.requestsService.editPurchaseRequest(
      user.id,
      id,
      updatePurchaseRequestDto,
    );
  }

  /************************ GET REQUEST BY REQUEST SERIAL NUMBER *********/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Get(':req')
  getRequestByREQ(
    @CurrentUser() user: User,
    @Param('req') req: string,
  ): Promise<any> {
    return this.requestsService.getRequestByREQ(user.id, req);
  }

  /************************ CREATE PURCHASE REQUESTS *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('createProduct')
  @Put('create-purchase-request')
  createRequest(
    @CurrentUser() user: User,
    @Body() createRequestDto: CreatePurchaseRequestDto,
  ) {
    return this.requestsService.createPurchaseRequest(
      user.id,
      createRequestDto,
    );
  }

  /************************ EDIT PURCHASE REQUEST*****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('approver')
  @Put('sales/:id')
  editSalesRequest(
    @CurrentUser() user: User,
    @Param('id') id: number,
    @Body() updateSalesRequestDto: UpdateSalesRequestDto,
  ): Promise<any> {
    return this.requestsService.editSalesRequest(
      user.id,
      id,
      updateSalesRequestDto,
    );
  }

  /************************ UPDATE PURCHASE APPROVAL REQUEST *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Permissions('approver')
  @Patch('purchase/:purchaseId')
  updatePurchaseApprovalRequest(
    @CurrentUser() user: User,
    @Param('purchaseId') purchaseId: number,
    @Body() updateRequestDto: UpdateSalesRequestDto,
  ): Promise<any> {
    return this.requestsService.updatePurchaseApprovalRequest(
      user.id,
      purchaseId,
      updateRequestDto,
    );
  }

  /************************ SEND QUOTE *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Post('quote/mail/:id')
  sendEmailToCustomer(
    @CurrentUser() user: User,
    @Param('id') id: number,
  ): Promise<any> {
    return this.requestsService.sendEmailToCustomer(user.id, id);
  }

  /************************ CANCEL SALES REQUEST *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Patch('sales/cancel/:id')
  cancelSalesRequest(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Body('comment') comment?: string,
  ) {
    return this.requestsService.cancelSalesRequest(user.id, id, comment);
  }
}
