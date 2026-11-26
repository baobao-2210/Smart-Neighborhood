import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiEnvelope<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiEnvelope<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiEnvelope<T>> {
    const response = context.switchToHttp().getResponse();
    const statusCode = response.statusCode ?? 200;

    return next.handle().pipe(
      map((res: any) => {
        const hasMeta = res && typeof res === 'object' && 'data' in res && 'meta' in res;
        return {
          success: true,
          statusCode,
          message: res?.message ?? 'Thành công',
          data: hasMeta ? res.data : res,
          ...(hasMeta ? { meta: res.meta } : {}),
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}

