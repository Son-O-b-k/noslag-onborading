import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthService } from '../utils/token.generators';
import { PrismaService } from '../prisma';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtAuthService: JwtAuthService,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      'permissions',
      [context.getHandler(), context.getClass()],
    );

    if (requiredRoles?.length) {
      const user = await this.validateUser(context);

      this.checkRoles(user, requiredRoles);
      this.checkPermissions(user, requiredPermissions);

      return true;
    }

    return true;
  }

  private async validateUser(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const jwt = request.headers['authorization']?.split(' ')[1];

    const decoded: any = await this.jwtAuthService.decodeAuthToken(jwt);

    const user = await this.prismaService.user.findUnique({
      where: {
        id: decoded.id,
      },
      include: {
        systemRoles: true,
        customRoles: true,
      },
    });

    if (!user) {
      console.log('Invalid');
      console.log(user);
      console.log(decoded);
      throw new UnauthorizedException('Invalid user');
    }

    return user;
  }
  //
  private checkRoles(user: any, requiredRoles: string[]) {
    //console.log(user);
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRequiredRole =
        user.systemRoles.some((role) => requiredRoles.includes(role.name)) ||
        user.customRoles.some((role) => requiredRoles.includes(role.name));
      if (!hasRequiredRole) {
        throw new UnauthorizedException('Access Denied for user');
      }
    }
  }

  private checkPermissions(user: any, requiredPermissions: string[]) {
    if (requiredPermissions && requiredPermissions.length > 0) {
      const userPermissions = [
        ...user.systemRoles.map((role) => role.permissions).flat(),
        ...user.customRoles.map((role) => role.permissions).flat(),
      ];

      for (const permission of requiredPermissions) {
        if (
          !userPermissions.some((userPermission) => userPermission[permission])
        ) {
          throw new UnauthorizedException('Insufficient permissions');
        }
      }
    }
  }
}
