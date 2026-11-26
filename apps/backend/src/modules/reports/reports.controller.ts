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
  CreateReportDto,
  ReportQueryDto,
  UpdateReportStatusDto,
} from './dto/reports.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reports (Module 1)')
@ApiBearerAuth()
@Controller('api/v1/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  getReports(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.getReports(query, user);
  }

  @Post()
  createReport(
    @Body() dto: CreateReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.createReport(dto, user);
  }

  @Get(':id')
  getReportById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.getReportById(id, user);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.LEADER, UserRole.STAFF)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReportStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.updateStatus(id, dto, user);
  }
}

