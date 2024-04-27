import { Logger, Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import {
  CloudinaryService,
  PrismaModule,
  PrismaService,
  SerialNumberService,
} from 'src/common';
import { UsersService } from 'src/auth/users/users.service';
import { MailService } from 'src/common/mail/mail.service';
import { JwtAuthService } from 'src/common/utils/token.generators';
import { OTPService } from 'src/common/OTP';

@Module({
  imports: [PrismaModule],
  controllers: [CustomersController],
  providers: [
    CustomersService,
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
export class CustomersModule {}
