import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@todanpho/shared';
import {
  AuthenticatedUser,
  CurrentUser,
  Roles,
} from '../../common/decorators/auth.decorators';
import {
  AnnouncementQueryDto,
  CreateAnnouncementDto,
  CreateEventDto,
  EventQueryDto,
  EventRegisterDto,
  RegisterDeviceTokenDto,
} from './dto/notification.dto';
import { NotificationService } from './notification.service';

@ApiTags('Announcements & Events (Module 2)')
@ApiBearerAuth()
@Controller('api/v1')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('announcements')
  getAnnouncements(
    @Query() query: AnnouncementQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.getAnnouncements(query, user);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.LEADER, UserRole.STAFF)
  @Post('announcements')
  createAnnouncement(
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.createAnnouncement(dto, user);
  }

  @Post('announcements/:id/read')
  markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.markAsRead(id, user);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.LEADER, UserRole.STAFF)
  @Get('announcements/:id/stats')
  getAnnouncementStats(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.getAnnouncementStats(id, user);
  }

  @Get('events')
  getEvents(
    @Query() query: EventQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.getEvents(query, user);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.LEADER, UserRole.STAFF)
  @Post('events')
  createEvent(
    @Body() dto: CreateEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.createEvent(dto, user);
  }

  @Post('events/:id/register')
  registerEvent(
    @Param('id') id: string,
    @Body() dto: EventRegisterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.registerEvent(id, dto, user);
  }

  @Post('notifications/device-token')
  registerDeviceToken(
    @Body() dto: RegisterDeviceTokenDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.registerDeviceToken(dto, user);
  }
}

