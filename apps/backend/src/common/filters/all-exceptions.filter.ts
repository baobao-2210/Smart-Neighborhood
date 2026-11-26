import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'Đã xảy ra lỗi hệ thống';
    let details: unknown = null;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, any>;
        message = Array.isArray(body.message)
          ? body.message[0]
          : (body.message ?? message);
        details = Array.isArray(body.message) ? body.message : null;
        errorCode = body.error ?? HttpStatus[statusCode] ?? errorCode;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        statusCode = HttpStatus.CONFLICT;
        errorCode = 'DUPLICATE_ENTRY';
        message = 'Dữ liệu đã tồn tại trong hệ thống';
      } else if (exception.code === 'P2025') {
        statusCode = HttpStatus.NOT_FOUND;
        errorCode = 'RECORD_NOT_FOUND';
        message = 'Không tìm thấy bản ghi yêu cầu';
      }
    }

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      errorCode,
      message,
      details,
      timestamp: new Date().toISOString(),
    });
  }
}

