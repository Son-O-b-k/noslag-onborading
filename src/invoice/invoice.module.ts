import { Logger, Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import {
  CloudinaryService,
  JwtAuthService,
  MailService,
  PrismaService,
  SerialNumberService,
} from 'src/common';
import { UsersService } from 'src/auth/users/users.service';
import { OTPService } from 'src/common/OTP';

@Module({
  controllers: [InvoiceController],
  providers: [
    InvoiceService,
    PrismaService,
    UsersService,
    MailService,
    JwtAuthService,
    SerialNumberService,
    OTPService,
    CloudinaryService,
    Logger,
  ],
})
export class InvoiceModule {}
