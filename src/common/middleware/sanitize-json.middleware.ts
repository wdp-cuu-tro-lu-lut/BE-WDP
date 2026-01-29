import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SanitizeJsonMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.method === 'PUT' || req.method === 'POST' || req.method === 'PATCH') {
      if (req.is('application/json')) {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            // Remove control characters except \t, \n, \r
            const sanitized = body.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
            const parsed = JSON.parse(sanitized);
            req.body = parsed;
            next();
          } catch (e) {
            next();
          }
        });
      } else {
        next();
      }
    } else {
      next();
    }
  }
}
