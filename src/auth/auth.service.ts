import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from './users/users.service';
import { JwtAuthService } from 'src/common/utils/token.generators';
import { SigninDto } from './dto/signinPararams';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtAuthService: JwtAuthService,
    private readonly usersservice: UsersService,
  ) {}

  async login(signinDto: SigninDto) {
    try {
      // console.log(companyEmail, password);
      const user = await this.usersservice.verifyUser(
        signinDto.companyEmail,
        signinDto.password,
      );

      const token = this.jwtAuthService.generateAuthToken(
        user.user.id,
        user.user.primaryContactName,
      );

      return {
        success: true,
        message: 'Login successful',
        result: {
          user,
          token,
        },
      };
    } catch (error) {
      throw error;
    }
  }
}
