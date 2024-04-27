import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import {
  CloudinaryService,
  PrismaService,
  SerialNumberService,
} from 'src/common';
import { UsersService } from 'src/auth/users/users.service';
import { JwtAuthService } from 'src/common/utils/token.generators';
import { MailService } from 'src/common/mail/mail.service';
import { OTPService } from 'src/common/OTP';

@Module({
  controllers: [TasksController],
  providers: [
    TasksService,
    PrismaService,
    UsersService,
    JwtAuthService,
    CloudinaryService,
    MailService,
    SerialNumberService,
    OTPService,
    CloudinaryService,
  ],
})
export class TasksModule {}
