import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Put,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { CurrentUser, Roles } from 'src/common/decorators';
import { User } from '@prisma/client';
import { JwtGuard } from 'src/common/guards/jwtAuth.guard';

@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Put()
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  /************************ DELETE APPROVALS *****************************/
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'EMPLOYEE')
  @Delete('delete/:id')
  deleteApprovals(
    @CurrentUser() user: User,
    @Param('id') id: number,
  ): Promise<any> {
    return this.notificationsService.deleteApprovals(user.id, id);
  }

  @UseGuards(JwtGuard)
  @Get()
  findAll(@CurrentUser() user: User) {
    return this.notificationsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationsService.update(+id, updateNotificationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notificationsService.remove(+id);
  }
}
