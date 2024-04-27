import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  Param,
  Delete,
  Put,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { CurrentUser, Roles } from 'src/common/decorators';
import { CreateAdminCompanyDto } from './dto/adminCompanyDto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateSystemRoleDto } from './dto/create-system-role.dto';
import { JwtGuard } from 'src/common/guards/jwtAuth.guard';
import { employeeResetPasswordDto } from './dto/employee-reset-password.dto';
import { User } from '@prisma/client';
import { PasswordRecoveryDto } from './dto/password-recovery.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('api/v1')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  /****************** CREATE USERS *******************/
  @Put('/users/create')
  async createAdmin(
    @Body() createAdminComapany: CreateAdminCompanyDto,
    @Body() createUserDto: CreateUserDto,
  ) {
    return await this.userService.createAdmin(
      createAdminComapany,
      createUserDto,
    );
  }

  /************************ Update USER *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  //@Permissions('updateuser')
  @UseInterceptors(FileInterceptor('file'))
  @Put('/users/update-user')
  updateUser(
    @CurrentUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        // .addFileTypeValidator({
        //   fileType: 'jpeg',
        // })
        .addMaxSizeValidator({
          maxSize: 5000000,
        })
        .build({
          fileIsRequired: false,
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
  ) {
    return this.userService.updateUser(user.id, updateUserDto, file);
  }

  /****************** ADMIN PASSWORD RESET *******************/
  @Post('/users/resetPassword')
  async adminResetPassword(@Body() resetPassword: ResetPasswordDto) {
    return await this.userService.adminResetPassword(resetPassword);
  }

  /****************** EMPLOYEE PASSWORD RESET *******************/
  @Post('/users/resetPassword/employee')
  async employeeResetPassword(
    @Body() employeeResetPassword: employeeResetPasswordDto,
  ) {
    return await this.userService.employeeResetPassword(employeeResetPassword);
  }

  @Get('/users/singleUser/:id')
  @UseGuards(JwtGuard)
  async getUser(@Param('id') id: number) {
    return await this.userService.getUserById(id);
  }

  /****************** System Roles *******************/
  @Get('/users/system-roles')
  async getSystemRoles() {
    return await this.userService.getSystemRoles();
  }

  /****************** Get Users With Approver Permission *******************/
  @UseGuards(JwtGuard)
  @Get('/users/approver-permission')
  async getUserPermissions(@CurrentUser() user: User) {
    return await this.userService.getUserPermissions(user.id);
  }

  /****************** SERIAL NUMBER GENERATION *******************/
  @UseGuards(JwtGuard)
  @Get('/serial-number/:prefix/:module')
  async generateSerialNumber(
    @Param('prefix') prefix: string,
    @Param('module') module: string,
    @CurrentUser() user: User,
  ): Promise<{ serialNumber: string }> {
    const serialNumber = await this.userService.generateSerialNumber(
      prefix,
      module,
      user.id,
    );
    return { serialNumber };
  }

  /****************** FORGOT PASSWORD *******************/
  @Post('/users/forgot-password')
  forgotPassword(@Body() passwordRecoveryDto: PasswordRecoveryDto) {
    return this.userService.forgotPassword(passwordRecoveryDto);
  }

  /****************** RESET PASSWORD *******************/
  @Post('/users/reset-password')
  resetPassword(@Body() passwordRecoveryDto: PasswordRecoveryDto) {
    return this.userService.resetPassword(passwordRecoveryDto);
  }

  /****************** SEND OTP *******************/
  @Post('/users/send-otp')
  sendOTP(@Body() passwordRecoveryDto: PasswordRecoveryDto) {
    return this.userService.sendOTP(passwordRecoveryDto);
  }

  /****************** VERIFY OTP *******************/
  @Post('/users/verify-otp')
  verifyOTP(@Body() passwordRecoveryDto: PasswordRecoveryDto) {
    return this.userService.verifyOTP(passwordRecoveryDto);
  }
}
