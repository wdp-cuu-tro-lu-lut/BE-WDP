import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    errorCode?: string,
  ) {
    super(
      {
        statusCode,
        message,
        errorCode: errorCode || 'ERROR',
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }
}

export class ResourceNotFoundException extends AppException {
  constructor(resource: string, id?: string) {
    super(
      `${resource}${id ? ` with id ${id}` : ''} not found`,
      HttpStatus.NOT_FOUND,
      'RESOURCE_NOT_FOUND',
    );
  }
}

export class UnauthorizedException extends AppException {
  constructor(message = 'Unauthorized') {
    super(message, HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED');
  }
}

export class ForbiddenException extends AppException {
  constructor(message = 'Forbidden') {
    super(message, HttpStatus.FORBIDDEN, 'FORBIDDEN');
  }
}

export class ConflictException extends AppException {
  constructor(message: string) {
    super(message, HttpStatus.CONFLICT, 'CONFLICT');
  }
}
