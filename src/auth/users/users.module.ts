import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import {
  CloudinaryService,
  PrismaModule,
  SerialNumberService,
} from 'src/common';
import { JwtGuard } from 'src/common/guards/jwtAuth.guard';
import { JwtAuthService } from 'src/common/utils/token.generators';
import { MailModule } from 'src/common/mail/mail.module';
import { OTPService } from 'src/common/OTP';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    JwtGuard,
    JwtAuthService,
    SerialNumberService,
    OTPService,
    CloudinaryService,
  ],
  exports: [UsersService],
})
export class UsersModule {}
