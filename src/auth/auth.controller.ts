import {
  Controller,
  Get,
  Post,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
  Body,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { SigninDto } from './dto/signinPararams';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() signinDto: SigninDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const loginRes = await this.authService.login(signinDto);

    // delete loginRes.result?.token;
    delete loginRes.result?.user.randomNumber;
    delete loginRes.result?.user.password;
    delete loginRes.result.user.resetToken;
    delete loginRes.result.user.resetTokenExpiresAt;

    return loginRes;
  }
}
