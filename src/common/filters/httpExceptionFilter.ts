import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
} from '@prisma/client/runtime/library';

export interface HttpExceptionResponse {
  statusCode: number;
  message: string;
  error: string;
}

// @Catch()
// export class AllExceptionsFilter implements ExceptionFilter {
//   constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

//   catch(exception: unknown, host: ArgumentsHost): void {
//     const { httpAdapter } = this.httpAdapterHost;
//     const ctx = host.switchToHttp();
//     const httpStatus =
//       exception instanceof HttpException
//         ? exception.getStatus()
//         : HttpStatus.INTERNAL_SERVER_ERROR;

//     const exceptionResponse =
//       exception instanceof HttpException
//         ? exception.getResponse()
//         : String(exception);

//     const responseBody = {
//       success: false,
//       statusCode: httpStatus,
//       timestamp: new Date().toISOString(),
//       path: httpAdapter.getRequestUrl(ctx.getRequest()),
//       message:
//         (exceptionResponse as HttpExceptionResponse).error ||
//         (exceptionResponse as HttpExceptionResponse).message ||
//         exceptionResponse ||
//         'Something went wrong',
//       errorResponse: exceptionResponse as HttpExceptionResponse,
//     };

//     httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
//   }
// }

export interface HttpExceptionResponse {
  statusCode: number;
  message: string;
  error: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let exceptionResponse: any;
    if (exception instanceof HttpException) {
      exceptionResponse = exception.getResponse();
    } else if (exception instanceof PrismaClientKnownRequestError) {
      exceptionResponse = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Something went wrong, try again',
        error: 'Something went wrong, try again',
      };
    } else if (exception instanceof PrismaClientUnknownRequestError) {
      exceptionResponse = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Something went wrong, try again',
        error: 'Something went wrong, try again',
      };
    } else {
      exceptionResponse = String(exception);
    }

    const responseBody = {
      success: false,
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
      message:
        (exceptionResponse as HttpExceptionResponse).error ||
        (exceptionResponse as HttpExceptionResponse).message ||
        exceptionResponse ||
        'Something went wrong',
      errorResponse: exceptionResponse as HttpExceptionResponse,
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
