import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestSizeMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const contentLength = req.headers['content-length'];
    if (contentLength) {
      const payloadSize = parseInt(contentLength, 50);
      res.setHeader('X-Payload-Size', payloadSize);
    }
    next();
  }
}
