import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
  CreateHouseholdDto,
  CreateHouseholdMemberDto,
  HouseholdQueryDto,
  ResidentQueryDto,
  UpdateHouseholdDto,
  UpdateResidentDto,
} from './dto/residents.dto';
import { ResidentsService } from './residents.service';

@ApiTags('Residents (Module 3)')
@ApiBearerAuth()
@Controller('api/v1')
export class ResidentsController {
  constructor(private readonly residentsService: ResidentsService) {}

  @Roles(UserRole.SUPER_ADMIN, UserRole.LEADER, UserRole.STAFF)
  @Get('households')
  getHouseholds(
    @Query() query: HouseholdQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.residentsService.getHouseholds(query, user);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.LEADER, UserRole.STAFF)
  @Post('households')
  createHousehold(
    @Body() dto: CreateHouseholdDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.residentsService.createHousehold(dto, user);
  }

  @Get('households/:id')
  getHouseholdById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.residentsService.getHouseholdById(id, user);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.LEADER, UserRole.STAFF)
  @Patch('households/:id')
  updateHousehold(
    @Param('id') id: string,
    @Body() dto: UpdateHouseholdDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.residentsService.updateHousehold(id, dto, user);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.LEADER, UserRole.STAFF)
  @Get('residents')
  getResidents(
    @Query() query: ResidentQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.residentsService.getResidents(query, user);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.LEADER, UserRole.STAFF)
  @Post('households/:id/members')
  addMember(
    @Param('id') householdId: string,
    @Body() dto: CreateHouseholdMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.residentsService.addMember(householdId, dto, user);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.LEADER, UserRole.STAFF)
  @Patch('residents/:id')
  updateMember(
    @Param('id') memberId: string,
    @Body() dto: UpdateResidentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.residentsService.updateMember(memberId, dto, user);
  }
}

