import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
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
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    PrismaService,
    UsersService,
    MailService,
    JwtAuthService,
    SerialNumberService,
    OTPService,
    CloudinaryService,
  ],
})
export class NotificationsModule {}
