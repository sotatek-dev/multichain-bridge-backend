import { HttpException, HttpStatus } from '@nestjs/common';

export const fileFilter = (_: Request, file: any, callback) => {
  if (!file) {
    throw new HttpException({ key: 'FILE_NOT_EMPTY', message: 'File Not Empty!' }, HttpStatus.BAD_REQUEST);
  }

  if (!file.originalname?.toLowerCase()?.match(/\.(jpg|jpeg|png|heic|jfif|svg|gif|bmp|doc|docx|csv|pdf|mp4|mov)$/)) {
    return callback(new HttpException({ message: 'File invalid!' }, HttpStatus.BAD_REQUEST), false);
  }
  callback(null, true);
};
