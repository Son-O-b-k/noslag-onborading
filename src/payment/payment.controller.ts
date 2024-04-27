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
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { JwtGuard } from 'src/common/guards/jwtAuth.guard';
import { CurrentUser, Roles } from 'src/common/decorators';
import { User } from '@prisma/client';

@Controller('api/v1/payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /************************ CREATE PAYMENT *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  // @Permissions('approver')
  @Put('create-payment')
  createPayment(
    @CurrentUser() user: User,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.paymentService.createPayment(user.id, createPaymentDto);
  }

  /************************ GET ALL PAYMENTS *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Get('get-payments')
  getAllPayments(@CurrentUser() user: User) {
    return this.paymentService.getAllPayments(user.id);
  }

  /************************ GET PAYMENT BY ID *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Get(':paymentId')
  getPaymentById(
    @CurrentUser() user: User,
    @Param('paymentId') paymentId: number,
  ) {
    return this.paymentService.getPaymentById(user.id, paymentId);
  }
}
