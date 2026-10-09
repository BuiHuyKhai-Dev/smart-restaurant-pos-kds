import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface ApiResponse<T> {
  success: true;
  data: T;
}

/** Bọc mọi response thành công thành { success: true, data } */
@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    return next.handle().pipe(map((data) => ({ success: true as const, data })));
  }
}

