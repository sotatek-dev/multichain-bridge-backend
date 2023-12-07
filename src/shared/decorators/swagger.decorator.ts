import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptions } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

type CustomSwaggerDecorator = ApiPropertyOptions & {
  isRequired?: boolean;
  enum?: Record<string, string>;
};

export function UseSwaggerDecorator(options: CustomSwaggerDecorator = {}) {
  const { isRequired = true } = options;
  const decorators = [] as PropertyDecorator[];
  decorators.push(ApiProperty({ ...options, required: isRequired }));
  if (!isRequired) {
    decorators.push(IsOptional());
  }

  if (options.enum) decorators.push(IsEnum(options.enum));

  return applyDecorators(...decorators);
}
