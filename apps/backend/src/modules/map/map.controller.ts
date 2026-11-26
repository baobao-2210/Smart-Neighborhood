import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportCategory, ReportStatus } from '@todanpho/shared';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/auth.decorators';
import { MapService } from './map.service';

@ApiTags('Community Map (Module 4)')
@ApiBearerAuth()
@Controller('api/v1/map')
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Get('markers')
  getMarkers(
    @CurrentUser() user: AuthenticatedUser,
    @Query('category') category?: ReportCategory,
    @Query('reportStatus') reportStatus?: ReportStatus,
  ) {
    return this.mapService.getMarkers(user.neighborhoodId, {
      category,
      reportStatus,
    });
  }

  @Get('reports/:id')
  getPublicReportDetail(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mapService.getPublicReportDetail(id, user.neighborhoodId);
  }
}

