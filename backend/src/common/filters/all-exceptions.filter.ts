import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

/**
 * Chuẩn hoá MỌI lỗi về một format:
 * { success: false, statusCode, message, error, path, timestamp }
 * Lỗi Prisma phổ biến được map sang HTTP status phù hợp thay vì 500.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      this.logger.error('Unhandled non-HTTP exception:', exception);
      return;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Lỗi hệ thống, vui lòng thử lại sau';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else {
        const body = res as { message?: string | string[]; error?: string };
        message = body.message ?? exception.message;
        error = body.error ?? exception.name;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      ({ statusCode, message, error } = this.mapPrismaError(exception));
    } else {
      this.logger.error(
        `Unhandled error on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private mapPrismaError(e: Prisma.PrismaClientKnownRequestError) {
    switch (e.code) {
      case 'P2002':
        return { statusCode: HttpStatus.CONFLICT, message: 'Dữ liệu bị trùng lặp', error: 'Conflict' };
      case 'P2025':
        return { statusCode: HttpStatus.NOT_FOUND, message: 'Không tìm thấy dữ liệu', error: 'Not Found' };
      case 'P2003':
        return { statusCode: HttpStatus.BAD_REQUEST, message: 'Tham chiếu dữ liệu không hợp lệ', error: 'Bad Request' };
      default:
        this.logger.error(`Prisma error ${e.code}: ${e.message}`);
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Lỗi cơ sở dữ liệu',
          error: 'Database Error',
        };
    }
  }
}

