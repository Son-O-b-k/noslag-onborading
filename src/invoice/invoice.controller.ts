import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { JwtGuard } from 'src/common/guards/jwtAuth.guard';
import { CurrentUser, Roles } from 'src/common/decorators';
import { User } from '@prisma/client';

@Controller('api/v1/invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  /************************ CREATE INVOICE *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  // @Permissions('approver')
  @Put('create-invoice')
  CreateSalesOrder(
    @CurrentUser() user: User,
    @Body() createInvoiceDto: CreateInvoiceDto,
  ) {
    return this.invoiceService.createInvoice(user.id, createInvoiceDto);
  }

  /************************ GET ALL INVOICES *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Get('get-invoices')
  getAllInvoices(@CurrentUser() user: User) {
    return this.invoiceService.getAllInvoices(user.id);
  }

  /************************ GET INVOICE BY ID *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Get(':invoiceId')
  getCustomerById(
    @CurrentUser() user: User,
    @Param('invoiceId') invoiceId: number,
  ) {
    return this.invoiceService.getInvoiceById(user.id, invoiceId);
  }

  /************************ DELETE INVOICE *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Delete('delete/:id')
  deleteInvoice(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.invoiceService.deleteInvoice(user.id, id);
  }

  /************************ CANCEL INVOICE *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Patch('cancel/:id')
  cancelInvoice(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Body('comment') comment?: string,
  ) {
    return this.invoiceService.cancelInvoice(user.id, id, comment);
  }
}
