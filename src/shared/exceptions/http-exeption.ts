import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { EError } from '../../constants/error.constant.js';

// 400
export function httpBadRequest(errorCode: EError, metaData?: object): never {
  throw new BadRequestException({
    statusCode: 400,
    errorCode,
    metaData,
  });
}

// 401
export function httpUnAuthorized(errorCode?: EError, metaData?: object): never {
  throw new UnauthorizedException({
    statusCode: 401,
    errorCode: errorCode || EError.UNAUTHORIZED,
    metaData,
  });
}

// 403
export function httpForbidden(errorCode?: EError, metaData?: object): never {
  throw new ForbiddenException({
    statusCode: 403,
    errorCode: errorCode || EError.FORBIDDEN_RESOURCE,
    metaData,
  });
}

// 404
export function httpNotFound(errorCode: EError, metaData?: object): never {
  throw new NotFoundException({
    statusCode: 404,
    errorCode,
    metaData,
  });
}

// 500
export function httpInternalServerErrorException(message?: string, errorCode?: EError, metaData?: object) {
  if (!metaData) {
    metaData = { error: message };
  }
  throw new InternalServerErrorException({
    statusCode: 500,
    errorCode: errorCode || EError.OTHER_SYSTEM_ERROR,
    message,
    metaData,
  });
}
