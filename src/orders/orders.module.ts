import { Logger, Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import {
  CloudinaryService,
  PrismaService,
  SerialNumberService,
} from 'src/common';
import { UsersService } from 'src/auth/users/users.service';
import { MailService } from 'src/common/mail/mail.service';
import { JwtAuthService } from 'src/common/utils/token.generators';
import { OTPService } from 'src/common/OTP';

@Module({
  controllers: [OrdersController],
  providers: [
    OrdersService,
    PrismaService,
    UsersService,
    MailService,
    JwtAuthService,
    SerialNumberService,
    OTPService,
    CloudinaryService,
    Logger
  ],
})
export class OrdersModule {}
