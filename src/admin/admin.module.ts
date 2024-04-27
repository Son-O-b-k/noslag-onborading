import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { JwtAuthService } from 'src/common/utils/token.generators';
import {
  CloudinaryService,
  PrismaService,
  SerialNumberService,
} from 'src/common';
import { UsersService } from 'src/auth/users/users.service';
import { MailService } from 'src/common/mail/mail.service';
import { OTPService } from 'src/common/OTP';

@Module({
  controllers: [AdminController],
  providers: [
    AdminService,
    JwtAuthService,
    PrismaService,
    UsersService,
    MailService,
    SerialNumberService,
    OTPService,
    CloudinaryService,
  ],
})
export class AdminModule {}
