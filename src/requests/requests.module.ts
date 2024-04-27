import { Logger, Module } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { UsersService } from 'src/auth/users/users.service';
import {
  PrismaService,
  SerialNumberService,
  MailService,
  CloudinaryService,
} from 'src/common';
import { JwtAuthService } from 'src/common/utils/token.generators';
import { OTPService } from 'src/common/OTP';

@Module({
  controllers: [RequestsController],
  providers: [
    RequestsService,
    UsersService,
    PrismaService,
    MailService,
    SerialNumberService,
    JwtAuthService,
    OTPService,
    CloudinaryService,
    Logger,
  ],
})
export class RequestsModule {}
