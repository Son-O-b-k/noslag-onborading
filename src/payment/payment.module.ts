import { Logger, Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import {
  CloudinaryService,
  JwtAuthService,
  MailService,
  PrismaService,
  SerialNumberService,
} from 'src/common';
import { UsersService } from 'src/auth/users/users.service';
import { OTPService } from 'src/common/OTP';
import { InvoiceService } from 'src/invoice/invoice.service';

@Module({
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PrismaService,
    UsersService,
    MailService,
    JwtAuthService,
    SerialNumberService,
    OTPService,
    CloudinaryService,
    InvoiceService,
    Logger,
  ],
})
export class PaymentModule {}
