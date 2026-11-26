import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttachmentEntityType,
  ReportPriority,
  ReportStatus,
  UserRole,
} from '@todanpho/shared';
import { AuthenticatedUser } from '../../common/decorators/auth.decorators';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { FeedGateway } from '../feed/feed.gateway';
import {
  AcceptReportDto,
  AssignReportDto,
  CreateReportDto,
  ReportQueryDto,
  UpdateReportStatusDto,
} from './dto/reports.dto';

const ALLOWED_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  [ReportStatus.NEW]: [
    ReportStatus.PENDING,
    ReportStatus.ACCEPTED,
    ReportStatus.REJECTED,
  ],
  [ReportStatus.PENDING]: [
    ReportStatus.ACCEPTED,
    ReportStatus.IN_PROGRESS,
    ReportStatus.REJECTED,
  ],
  [ReportStatus.ACCEPTED]: [
    ReportStatus.IN_PROGRESS,
    ReportStatus.RESOLVED,
    ReportStatus.REJECTED,
  ],
  [ReportStatus.IN_PROGRESS]: [
    ReportStatus.RESOLVED,
    ReportStatus.REJECTED,
  ],
  [ReportStatus.RESOLVED]: [],
  [ReportStatus.REJECTED]: [],
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly feedGateway: FeedGateway,
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
      where.OR = [{ visibility: 'PUBLIC' }, { reporterId: user.id }];
    } else if (user.role === UserRole.STAFF) {
      where.OR = [{ visibility: 'PUBLIC' }, { assignedToId: user.id }, { reporterId: user.id }];
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
            { code: { contains: s, mode: 'insensitive' } },
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
      where: {
        entityType: report.postId ? AttachmentEntityType.POST : AttachmentEntityType.REPORT,
        entityId: report.postId ?? report.id,
      },
    });

    return { ...report, attachments };
  }

  async createReport(dto: CreateReportDto, user: AuthenticatedUser) {
    const year = new Date().getFullYear();
    const code = `PA-${year}-${Math.floor(1000 + Math.random() * 9000)}`;

    const report = await this.prisma.$transaction(async (tx) => {
      const created = await tx.report.create({
        data: {
          code,
          neighborhoodId: user.neighborhoodId,
          reporterId: user.id,
          title: dto.title.trim(),
          description: dto.description.trim(),
          category: dto.category ?? 'OTHER',
          priority: dto.priority ?? ReportPriority.NORMAL,
          visibility: dto.visibility ?? 'PUBLIC',
          status: ReportStatus.NEW,
          latitude: dto.latitude,
          longitude: dto.longitude,
          addressText: dto.addressText?.trim(),
        },
      });

      await tx.reportStatusHistory.create({
        data: {
          reportId: created.id,
          changedById: user.id,
          fromStatus: ReportStatus.NEW,
          toStatus: ReportStatus.NEW,
          note: 'Cư dân gửi phản ánh mới',
        },
      });

      if (dto.mediaUrls?.length) {
        await tx.attachment.createMany({
          data: dto.mediaUrls.map((url) => ({
            uploaderId: user.id,
            entityType: AttachmentEntityType.REPORT,
            entityId: created.id,
            url,
            mimeType: 'image/jpeg',
            fileSize: 0,
          })),
        });
      }

      return created;
    });

    this.feedGateway.emitFeedEvent(
      user.neighborhoodId,
      'incident.created',
      report,
      { isPrivate: report.visibility === 'PRIVATE', ownerId: user.id },
    );

    return report;
  }

  async acceptReport(
    id: string,
    dto: AcceptReportDto,
    user: AuthenticatedUser,
  ) {
    const report = await this.ensureReport(id, user.neighborhoodId);
    this.assertValidTransition(report.status as ReportStatus, ReportStatus.ACCEPTED);

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.report.update({
        where: { id },
        data: {
          status: ReportStatus.ACCEPTED,
          assignedToId: report.assignedToId ?? user.id,
        },
        include: {
          assignedTo: { select: { id: true, fullName: true, staffTitle: true } },
        },
      });

      await tx.reportStatusHistory.create({
        data: {
          reportId: id,
          changedById: user.id,
          fromStatus: report.status,
          toStatus: ReportStatus.ACCEPTED,
          note: dto.note?.trim() || 'Ban điều hành đã tiếp nhận phản ánh',
        },
      });

      await tx.notification.create({
        data: {
          userId: report.reporterId,
          type: 'INCIDENT_ACCEPTED',
          title: `Phản ánh ${report.code ?? ''} đã được tiếp nhận`,
          body: dto.note?.trim() || 'Cán bộ Tổ dân phố đã tiếp nhận xử lý.',
          referenceId: id,
        },
      });

      return next;
    });

    this.feedGateway.emitFeedEvent(
      user.neighborhoodId,
      'incident.accepted',
      updated,
      { isPrivate: report.visibility === 'PRIVATE', ownerId: report.reporterId },
    );

    return updated;
  }

  async assignReport(
    id: string,
    dto: AssignReportDto,
    user: AuthenticatedUser,
  ) {
    const report = await this.ensureReport(id, user.neighborhoodId);

    const assignee = await this.prisma.user.findFirst({
      where: {
        id: dto.assignedToId,
        neighborhoodId: user.neighborhoodId,
        status: 'ACTIVE',
      },
      select: { id: true, fullName: true },
    });
    if (!assignee) {
      throw new NotFoundException('Không tìm thấy cán bộ được phân công');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const nextStatus =
        report.status === ReportStatus.NEW || report.status === ReportStatus.PENDING
          ? ReportStatus.ACCEPTED
          : (report.status as ReportStatus);

      const next = await tx.report.update({
        where: { id },
        data: {
          assignedToId: dto.assignedToId,
          status: nextStatus,
        },
        include: {
          assignedTo: { select: { id: true, fullName: true, staffTitle: true } },
        },
      });

      await tx.reportStatusHistory.create({
        data: {
          reportId: id,
          changedById: user.id,
          fromStatus: report.status,
          toStatus: nextStatus,
          note: dto.note?.trim() || `Phân công xử lý cho ${assignee.fullName}`,
        },
      });

      await tx.notification.createMany({
        data: [
          {
            userId: dto.assignedToId,
            type: 'INCIDENT_ASSIGNED',
            title: `Bạn được phân công xử lý ${report.code ?? 'phản ánh'}`,
            body: report.title,
            referenceId: id,
          },
          {
            userId: report.reporterId,
            type: 'INCIDENT_ASSIGNED',
            title: `Phản ánh ${report.code ?? ''} đã được phân công`,
            body: `Cán bộ phụ trách: ${assignee.fullName}`,
            referenceId: id,
          },
        ],
      });

      return next;
    });

    this.feedGateway.emitFeedEvent(
      user.neighborhoodId,
      'incident.assigned',
      updated,
      { isPrivate: report.visibility === 'PRIVATE', ownerId: report.reporterId },
    );

    return updated;
  }

  async updateStatus(
    id: string,
    dto: UpdateReportStatusDto,
    user: AuthenticatedUser,
  ) {
    const report = await this.ensureReport(id, user.neighborhoodId);

    if (user.role === UserRole.STAFF && report.assignedToId && report.assignedToId !== user.id) {
      throw new ForbiddenException('Phản ánh này được phân công cho cán bộ khác');
    }

    this.assertValidTransition(report.status as ReportStatus, dto.status);

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.report.update({
        where: { id },
        data: {
          status: dto.status,
          ...(dto.assignedToId ? { assignedToId: dto.assignedToId } : {}),
        },
        include: {
          assignedTo: { select: { id: true, fullName: true, staffTitle: true } },
        },
      });

      await tx.reportStatusHistory.create({
        data: {
          reportId: id,
          changedById: user.id,
          fromStatus: report.status,
          toStatus: dto.status,
          note: dto.note?.trim(),
        },
      });

      await tx.notification.create({
        data: {
          userId: report.reporterId,
          type: dto.status === ReportStatus.RESOLVED ? 'INCIDENT_RESOLVED' : 'INCIDENT_STATUS_CHANGED',
          title: `Cập nhật phản ánh ${report.code ?? ''}: ${dto.status}`,
          body: dto.note?.trim() || report.title,
          referenceId: id,
        },
      });

      return next;
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

    this.feedGateway.emitFeedEvent(
      user.neighborhoodId,
      dto.status === ReportStatus.RESOLVED ? 'incident.resolved' : 'incident.status_changed',
      updated,
      { isPrivate: report.visibility === 'PRIVATE', ownerId: report.reporterId },
    );

    return updated;
  }

  private async ensureReport(id: string, neighborhoodId: string) {
    const report = await this.prisma.report.findFirst({
      where: { id, neighborhoodId, deletedAt: null },
    });
    if (!report) throw new NotFoundException('Không tìm thấy phản ánh');
    return report;
  }

  private assertValidTransition(from: ReportStatus, to: ReportStatus) {
    if (from === to) return;
    const allowed = ALLOWED_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Không thể chuyển trạng thái phản ánh từ ${from} sang ${to}`,
      );
    }
  }
}
