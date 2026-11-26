import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttachmentEntityType, UserRole } from '@todanpho/shared';
import { AuthenticatedUser } from '../../common/decorators/auth.decorators';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateReportDto,
  ReportQueryDto,
  UpdateReportStatusDto,
} from './dto/reports.dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getReports(query: ReportQueryDto, user: AuthenticatedUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {
      neighborhoodId: user.neighborhoodId,
      deletedAt: null,
    };

    if (query.category) where.category = query.category;
    if (query.status) where.status = query.status;

    if (user.role === UserRole.RESIDENT) {
      // Cư dân chỉ xem được phản ánh PUBLIC hoặc phản ánh PRIVATE do chính mình gửi
      where.OR = [{ visibility: 'PUBLIC' }, { reporterId: user.id }];
    } else if (user.role === UserRole.STAFF) {
      where.OR = [{ visibility: 'PUBLIC' }, { assignedToId: user.id }];
    } else if (query.visibility) {
      where.visibility = query.visibility;
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      where.AND = [
        {
          OR: [
            { title: { contains: s, mode: 'insensitive' } },
            { description: { contains: s, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, fullName: true, avatarUrl: true } },
          assignedTo: { select: { id: true, fullName: true, staffTitle: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getReportById(id: string, user: AuthenticatedUser) {
    const report = await this.prisma.report.findFirst({
      where: {
        id,
        neighborhoodId: user.neighborhoodId,
        deletedAt: null,
      },
      include: {
        reporter: { select: { id: true, fullName: true, avatarUrl: true } },
        assignedTo: { select: { id: true, fullName: true, staffTitle: true } },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: {
            changedBy: { select: { id: true, fullName: true, role: true } },
          },
        },
      },
    });

    if (!report) throw new NotFoundException('Không tìm thấy phản ánh');

    if (report.visibility === 'PRIVATE') {
      const allowed =
        report.reporterId === user.id ||
        report.assignedToId === user.id ||
        user.role === UserRole.LEADER ||
        user.role === UserRole.SUPER_ADMIN;
      if (!allowed) {
        throw new ForbiddenException('Bạn không có quyền xem phản ánh riêng tư này');
      }
    }

    const attachments = await this.prisma.attachment.findMany({
      where: { entityType: AttachmentEntityType.REPORT, entityId: report.id },
    });

    return { ...report, attachments };
  }

  async createReport(dto: CreateReportDto, user: AuthenticatedUser) {
    const report = await this.prisma.report.create({
      data: {
        neighborhoodId: user.neighborhoodId,
        reporterId: user.id,
        title: dto.title.trim(),
        description: dto.description.trim(),
        category: dto.category ?? 'OTHER',
        visibility: dto.visibility ?? 'PUBLIC',
        latitude: dto.latitude,
        longitude: dto.longitude,
        addressText: dto.addressText?.trim(),
      },
    });

    if (dto.mediaUrls?.length) {
      await this.prisma.attachment.createMany({
        data: dto.mediaUrls.map((url) => ({
          uploaderId: user.id,
          entityType: AttachmentEntityType.REPORT,
          entityId: report.id,
          url,
          mimeType: 'image/jpeg',
          fileSize: 0,
        })),
      });
    }

    return report;
  }

  async updateStatus(
    id: string,
    dto: UpdateReportStatusDto,
    user: AuthenticatedUser,
  ) {
    const report = await this.prisma.report.findFirst({
      where: { id, neighborhoodId: user.neighborhoodId, deletedAt: null },
    });
    if (!report) throw new NotFoundException('Không tìm thấy phản ánh');

    if (user.role === UserRole.STAFF && report.assignedToId && report.assignedToId !== user.id) {
      throw new ForbiddenException('Phản ánh này được phân công cho cán bộ khác');
    }

    const updated = await this.prisma.report.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.assignedToId ? { assignedToId: dto.assignedToId } : {}),
      },
    });

    await this.prisma.reportStatusHistory.create({
      data: {
        reportId: id,
        changedById: user.id,
        fromStatus: report.status,
        toStatus: dto.status,
        note: dto.note?.trim(),
      },
    });

    await this.auditService.log({
      neighborhoodId: user.neighborhoodId,
      actorId: user.id,
      action: 'UPDATE_REPORT_STATUS',
      resource: 'REPORTS',
      resourceId: id,
      oldData: { status: report.status },
      newData: { status: dto.status, assignedToId: dto.assignedToId },
    });

    return updated;
  }
}

