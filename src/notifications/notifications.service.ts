import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { PrismaService } from 'src/common';
import { UsersService } from 'src/auth/users/users.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly usersservice: UsersService,
  ) {}

  create(createNotificationDto: CreateNotificationDto) {
    return 'This action adds a new notification';
  }

  async findAll(userId: number) {
    try {
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const unreadNotifications =
        await this.prismaService.approvalNotifications.findMany({
          where: {
            notifierId: userId,
            companyId,
          },
          include: {
            salesOrder: { where: { companyId } },
            purchaseOrder: { where: { companyId } },
            request: { where: { companyId } },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

      return {
        status: 'Success',
        message: 'Notifications retrieved',
        data: unreadNotifications,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while fetching approval',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  async deleteApprovals(userId: number, id: number) {
    try {
      // Check if the user exists with associated relationships
      const user = await this.usersservice.findUserWithRelationships(userId);
      const companyId =
        user.adminCompanyId?.adminID || user.employeeId?.companyId;

      const approvals =
        await this.prismaService.approvalNotifications.findUnique({
          where: { id, companyId },
        });

      if (!approvals) {
        throw new HttpException('Approvals not found', HttpStatus.NOT_FOUND);
      }

      await this.prismaService.approvalNotifications.delete({
        where: {
          id,
        },
      });

      return {
        status: 'Success',
        message: 'Approval deleted successfully',
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new HttpException(
          'An error occurred while deleting approval',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} notification`;
  }

  update(id: number, updateNotificationDto: UpdateNotificationDto) {
    return `This action updates a #${id} notification`;
  }

  remove(id: number) {
    return `This action removes a #${id} notification`;
  }
}
