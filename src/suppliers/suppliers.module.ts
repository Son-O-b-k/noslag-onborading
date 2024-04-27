import { Logger, Module } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import {
  CloudinaryService,
  MailService,
  PrismaService,
  SerialNumberService,
} from 'src/common';
import { JwtAuthService } from 'src/common/utils/token.generators';
import { UsersService } from 'src/auth/users/users.service';
import { OTPService } from 'src/common/OTP';

@Module({
  controllers: [SuppliersController],
  providers: [
    SuppliersService,
    PrismaService,
    JwtAuthService,
    UsersService,
    MailService,
    SerialNumberService,
    OTPService,
    CloudinaryService,
    Logger,
  ],
})
export class SuppliersModule {}
