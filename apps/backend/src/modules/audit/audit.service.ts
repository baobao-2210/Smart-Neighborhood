import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface CreateAuditLogInput {
  neighborhoodId?: string;
  actorId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldData?: unknown;
  newData?: unknown;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: CreateAuditLogInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        neighborhoodId: input.neighborhoodId,
        actorId: input.actorId,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        oldData: input.oldData as any,
        newData: input.newData as any,
        ipAddress: input.ipAddress,
      },
    });
  }
}

