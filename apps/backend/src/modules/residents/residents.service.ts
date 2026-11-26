import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@todanpho/shared';
import { AuthenticatedUser } from '../../common/decorators/auth.decorators';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateHouseholdDto,
  CreateHouseholdMemberDto,
  HouseholdQueryDto,
  ResidentQueryDto,
  UpdateHouseholdDto,
  UpdateResidentDto,
} from './dto/residents.dto';

@Injectable()
export class ResidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getHouseholds(query: HouseholdQueryDto, user: AuthenticatedUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {
      neighborhoodId: user.neighborhoodId,
      deletedAt: null,
    };

    if (query.street?.trim()) {
      where.street = { contains: query.street.trim(), mode: 'insensitive' };
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { houseNumber: { contains: s, mode: 'insensitive' } },
        { street: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.household.findMany({
        where,
        skip,
        take: limit,
        orderBy: { code: 'asc' },
        include: {
          members: {
            where: { deletedAt: null },
            select: { id: true, fullName: true, isHead: true },
          },
        },
      }),
      this.prisma.household.count({ where }),
    ]);

    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async createHousehold(dto: CreateHouseholdDto, user: AuthenticatedUser) {
    const household = await this.prisma.household.create({
      data: {
        neighborhoodId: user.neighborhoodId,
        code: dto.code.trim(),
        houseNumber: dto.houseNumber.trim(),
        street: dto.street.trim(),
        addressDetail: dto.addressDetail?.trim(),
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });

    await this.auditService.log({
      neighborhoodId: user.neighborhoodId,
      actorId: user.id,
      action: 'CREATE_HOUSEHOLD',
      resource: 'HOUSEHOLDS',
      resourceId: household.id,
      newData: household,
    });

    return household;
  }

  async getHouseholdById(id: string, user: AuthenticatedUser) {
    const household = await this.prisma.household.findFirst({
      where: {
        id,
        neighborhoodId: user.neighborhoodId,
        deletedAt: null,
      },
      include: {
        members: {
          where: { deletedAt: null },
          orderBy: [{ isHead: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!household) {
      throw new NotFoundException('Không tìm thấy hộ gia đình');
    }

    if (user.role === UserRole.RESIDENT) {
      const isMember = household.members.some((m) => m.userId === user.id);
      if (!isMember) {
        throw new ForbiddenException('Bạn chỉ được phép xem hộ gia đình của mình');
      }
    }

    return {
      ...household,
      members: household.members.map((m) => this.maskMemberPii(m, user.role)),
    };
  }

  async updateHousehold(
    id: string,
    dto: UpdateHouseholdDto,
    user: AuthenticatedUser,
  ) {
    const existing = await this.prisma.household.findFirst({
      where: { id, neighborhoodId: user.neighborhoodId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Không tìm thấy hộ gia đình');

    const updated = await this.prisma.household.update({
      where: { id },
      data: dto,
    });

    await this.auditService.log({
      neighborhoodId: user.neighborhoodId,
      actorId: user.id,
      action: 'UPDATE_HOUSEHOLD',
      resource: 'HOUSEHOLDS',
      resourceId: id,
      oldData: existing,
      newData: updated,
    });

    return updated;
  }

  async getResidents(query: ResidentQueryDto, user: AuthenticatedUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {
      deletedAt: null,
      household: {
        neighborhoodId: user.neighborhoodId,
        deletedAt: null,
      },
    };

    if (query.residenceType) where.residenceType = query.residenceType;
    if (query.residenceStatus) where.residenceStatus = query.residenceStatus;
    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { fullName: { contains: s, mode: 'insensitive' } },
        { cccdNumber: { contains: s } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.householdMember.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fullName: 'asc' },
        include: {
          household: {
            select: { id: true, code: true, houseNumber: true, street: true },
          },
        },
      }),
      this.prisma.householdMember.count({ where }),
    ]);

    return {
      data: items.map((m) => this.maskMemberPii(m, user.role)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async addMember(
    householdId: string,
    dto: CreateHouseholdMemberDto,
    user: AuthenticatedUser,
  ) {
    const household = await this.prisma.household.findFirst({
      where: { id: householdId, neighborhoodId: user.neighborhoodId, deletedAt: null },
    });
    if (!household) throw new NotFoundException('Không tìm thấy hộ gia đình');

    if (dto.isHead) {
      await this.prisma.householdMember.updateMany({
        where: { householdId, isHead: true },
        data: { isHead: false },
      });
    }

    const member = await this.prisma.householdMember.create({
      data: {
        householdId,
        fullName: dto.fullName.trim(),
        cccdNumber: dto.cccdNumber?.trim(),
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender,
        isHead: Boolean(dto.isHead),
        relationToHead: dto.relationToHead ?? 'CON',
        residenceType: dto.residenceType ?? 'THUONG_TRU',
        expiredAt: dto.expiredAt ? new Date(dto.expiredAt) : null,
        notes: dto.notes?.trim(),
      },
    });

    await this.auditService.log({
      neighborhoodId: user.neighborhoodId,
      actorId: user.id,
      action: 'ADD_HOUSEHOLD_MEMBER',
      resource: 'RESIDENTS',
      resourceId: member.id,
      newData: { householdId, fullName: member.fullName },
    });

    return this.maskMemberPii(member, user.role);
  }

  async updateMember(
    memberId: string,
    dto: UpdateResidentDto,
    user: AuthenticatedUser,
  ) {
    const existing = await this.prisma.householdMember.findFirst({
      where: {
        id: memberId,
        deletedAt: null,
        household: { neighborhoodId: user.neighborhoodId },
      },
    });
    if (!existing) throw new NotFoundException('Không tìm thấy nhân khẩu');

    if (dto.isHead) {
      await this.prisma.householdMember.updateMany({
        where: { householdId: existing.householdId, isHead: true },
        data: { isHead: false },
      });
    }

    const updated = await this.prisma.householdMember.update({
      where: { id: memberId },
      data: {
        ...dto,
        ...(dto.expiredAt ? { expiredAt: new Date(dto.expiredAt) } : {}),
      },
    });

    await this.auditService.log({
      neighborhoodId: user.neighborhoodId,
      actorId: user.id,
      action: 'UPDATE_RESIDENT',
      resource: 'RESIDENTS',
      resourceId: memberId,
      oldData: existing,
      newData: updated,
    });

    return this.maskMemberPii(updated, user.role);
  }

  private maskMemberPii<T extends { cccdNumber?: string | null }>(
    member: T,
    role: UserRole,
  ): T {
    if (role === UserRole.LEADER || role === UserRole.SUPER_ADMIN) {
      return member;
    }
    if (!member.cccdNumber || member.cccdNumber.length < 6) {
      return member;
    }
    const cccd = member.cccdNumber;
    const masked = `${cccd.slice(0, 4)}******${cccd.slice(-2)}`;
    return { ...member, cccdNumber: masked };
  }
}

