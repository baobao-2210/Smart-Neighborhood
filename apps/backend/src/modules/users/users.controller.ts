import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/auth.decorators';
import {
  CreateDeletionRequestDto,
  HistoryQueryDto,
  UpdateProfileDto,
  UpdateUserSettingDto,
} from './dto/users.dto';
import { UsersService } from './users.service';

@ApiTags('Users (Module 6)')
@ApiBearerAuth()
@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMe(user.id);
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get('me/household')
  getMyHousehold(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMyHousehold(user.id);
  }

  @Get('me/history')
  getMyHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: HistoryQueryDto,
  ) {
    return this.usersService.getMyHistory(user.id, query);
  }

  @Patch('me/settings')
  updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateUserSettingDto,
  ) {
    return this.usersService.updateSettings(user.id, dto);
  }

  @Post('me/deletion-request')
  createDeletionRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDeletionRequestDto,
  ) {
    return this.usersService.createDeletionRequest(
      user.id,
      user.neighborhoodId,
      dto,
    );
  }
}

