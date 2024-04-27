import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { UsersService } from 'src/auth/users/users.service';
import {
  CloudinaryService,
  JwtAuthService,
  MailService,
  PrismaService,
  SerialNumberService,
} from 'src/common';
import { OTPService } from 'src/common/OTP';

@Module({
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    UsersService,
    PrismaService,
    MailService,
    SerialNumberService,
    JwtAuthService,
    OTPService,
    CloudinaryService,
  ],
})
export class TransactionsModule {}
