import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import {
  CloudinaryService,
  PrismaService,
  SerialNumberService,
} from 'src/common';
import { AdminService } from 'src/admin/admin.service';
import { JwtAuthService } from 'src/common/utils/token.generators';
import { MailService } from 'src/common/mail/mail.service';
import { UsersService } from 'src/auth/users/users.service';
import { OTPService } from 'src/common/OTP';

@Module({
  controllers: [EmployeesController],
  providers: [
    EmployeesService,
    PrismaService,
    AdminService,
    MailService,
    JwtAuthService,
    SerialNumberService,
    UsersService,
    OTPService,
    CloudinaryService,
  ],
})
export class EmployeesModule {}
