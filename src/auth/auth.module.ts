import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
//import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from './users/users.module';
import { PrismaModule } from 'src/common';
import { JwtAuthService } from 'src/common/utils/token.generators';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtAuthService],
  imports: [
    PrismaModule,
    ConfigModule,
    UsersModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: `${configService.get('JWT_EXPIRATION')}s`,
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AuthModule {}
