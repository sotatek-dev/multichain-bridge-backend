import { ValidationError } from '@nestjs/common';
import { ClassConstructor, plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

export const validateAndTransform = async <T>(
  plain: object,
  type: ClassConstructor<T>,
): Promise<{ errors: ValidationError[]; transformed: T }> => {
  const transformed = plainToClass(type, plain);
  const errors = await validate(transformed as object);
  if (errors.length > 0) {
    // 'These error logs is created on purpose.'
    console.warn(errors);
  }
  console.log(transformed);
  return { transformed, errors };
};
