import { Module } from '@nestjs/common';
import { PriceListService } from './price-list.service';
import { PriceListController } from './price-list.controller';
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
  controllers: [PriceListController],
  providers: [
    PriceListService,
    PrismaService,
    UsersService,
    JwtAuthService,
    MailService,
    SerialNumberService,
    OTPService,
    CloudinaryService,
  ],
})
export class PriceListModule {}
