import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AttachmentEntityType,
  ReportCategory,
  ReportStatus,
} from '@todanpho/shared';
import { PrismaService } from '../../database/prisma.service';

export interface MapFilterQuery {
  category?: ReportCategory;
  reportStatus?: ReportStatus;
}

@Injectable()
export class MapService {
  constructor(private readonly prisma: PrismaService) {}

  async getMarkers(neighborhoodId: string, query: MapFilterQuery) {
    const reportWhere: Record<string, any> = {
      neighborhoodId,
      visibility: 'PUBLIC', // TUYỆT ĐỐI không trả về phản ánh PRIVATE trên bản đồ công khai
      deletedAt: null,
      latitude: { not: null },
      longitude: { not: null },
    };
    if (query.category) reportWhere.category = query.category;
    if (query.reportStatus) reportWhere.status = query.reportStatus;

    const [neighborhood, reports, events, places] = await Promise.all([
      this.prisma.neighborhood.findUnique({
        where: { id: neighborhoodId },
        select: { id: true, name: true, boundaryGeoJson: true },
      }),
      this.prisma.report.findMany({
        where: reportWhere,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          category: true,
          title: true,
          status: true,
          latitude: true,
          longitude: true,
          addressText: true,
          createdAt: true,
          // Không select reporterId hay thông tin cá nhân người gửi
        },
      }),
      this.prisma.event.findMany({
        where: {
          neighborhoodId,
          deletedAt: null,
          status: { in: ['UPCOMING', 'ONGOING'] },
          latitude: { not: null },
          longitude: { not: null },
        },
        select: {
          id: true,
          title: true,
          locationName: true,
          latitude: true,
          longitude: true,
          startTime: true,
          status: true,
        },
      }),
      this.prisma.communityPlace.findMany({
        where: { neighborhoodId },
        select: {
          id: true,
          name: true,
          category: true,
          address: true,
          latitude: true,
          longitude: true,
        },
      }),
    ]);

    return {
      neighborhood,
      reports,
      events,
      places,
    };
  }

  async getPublicReportDetail(reportId: string, neighborhoodId: string) {
    const report = await this.prisma.report.findFirst({
      where: {
        id: reportId,
        neighborhoodId,
        visibility: 'PUBLIC',
        deletedAt: null,
      },
      select: {
        id: true,
        category: true,
        title: true,
        description: true,
        status: true,
        latitude: true,
        longitude: true,
        addressText: true,
        createdAt: true,
        updatedAt: true,
        // Ẩn hoàn toàn reporter / PII người gửi trên API bản đồ
      },
    });

    if (!report) {
      throw new NotFoundException('Không tìm thấy phản ánh công khai trên bản đồ');
    }

    const attachments = await this.prisma.attachment.findMany({
      where: { entityType: AttachmentEntityType.REPORT, entityId: report.id },
      select: { id: true, url: true, mimeType: true },
    });

    return { ...report, attachments };
  }
}

