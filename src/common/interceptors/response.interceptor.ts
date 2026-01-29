import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AppResponse } from '../responses/app-response.dto';

/**
 * Interceptor that wraps all successful responses with standardized format
 * Transforms: data => { statusCode, success, message, data, timestamp }
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();
    const statusCode = response.statusCode || 200;

    return next.handle().pipe(
      map((data) => {
        // If data is already an AppResponse, return as is
        if (data instanceof AppResponse) {
          return data;
        }

        // Default success message based on HTTP method
        const request = context.switchToHttp().getRequest();
        const method = request.method;
        let defaultMessage = 'Success';

        if (method === 'POST') {
          // Use a more accurate message when the POST is for logging in
          const url = (request.url || request.originalUrl || '').toString();
          if ( url.toLowerCase().includes('logout')) {
            defaultMessage = 'Logged out successfully';
          } else if (url.toLowerCase().includes('login')) {
            defaultMessage = 'Logged in successfully';
          } else {
            defaultMessage = 'Created successfully';
          }
        } else if (method === 'PUT' || method === 'PATCH') {
          defaultMessage = 'Updated successfully';
        } else if (method === 'DELETE') {
          defaultMessage = 'Deleted successfully';
        } else if (method === 'GET') {
          defaultMessage = 'Retrieved successfully';
        }

        return new AppResponse(
          statusCode,
          defaultMessage,
          data,
        );
      }),
    );
  }
}
