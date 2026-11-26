import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '@todanpho/shared';
import { AuthenticatedUser } from '../decorators/auth.decorators';

@Injectable()
export class NeighborhoodScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;
    if (!user) return true;

    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    const paramNeighborhoodId =
      request.params?.neighborhoodId ||
      request.query?.neighborhoodId ||
      request.body?.neighborhoodId;

    if (paramNeighborhoodId && paramNeighborhoodId !== user.neighborhoodId) {
      throw new ForbiddenException(
        'Không được phép truy cập dữ liệu của tổ dân phố khác',
      );
    }

    return true;
  }
}

