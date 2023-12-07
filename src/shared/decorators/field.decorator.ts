import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptions } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  isNumber,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsPositive,
  isString,
  IsString,
  matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { getVariableName } from '@shared/utils/util';

import { ToArray, ToBoolean, ToLowerCase, ToUpperCase, Trim } from './transform.decorator';

interface IBaseOptions {
  swagger?: boolean;
  expose?: boolean;
}

interface IStringFieldOptions extends IBaseOptions {
  minLength?: number;
  maxLength?: number;
  toLowerCase?: boolean;
  toUpperCase?: boolean;
  number?: boolean;
}

interface INumberFieldOptions extends IBaseOptions {
  each?: boolean;
  minimum?: number;
  maximum?: number;
  int?: boolean;
  isPositive?: boolean;
}

export function initDecoratorField(
  options: ApiPropertyOptions & Partial<{ expose: boolean }>,
  decorators: PropertyDecorator[],
) {
  if (options?.expose) {
    decorators.push(Expose());
  }

  if (options?.required === false) {
    decorators.push(IsOptional());
  } else {
    decorators.push(IsNotEmpty());
  }

  return applyDecorators(...decorators);
}

export function NumberField(options: Omit<ApiPropertyOptions, 'type'> & INumberFieldOptions = {}): PropertyDecorator {
  const decorators = [Type(() => Number)];

  const { each, int, minimum, maximum, isPositive, swagger } = options;

  if (swagger !== false) {
    decorators.push(ApiProperty({ type: Number, ...options, example: int ? 1 : 1.2 }));
  }

  if (each) {
    decorators.push(ToArray());
  }

  if (int) {
    decorators.push(IsInt({ each }));
  } else {
    decorators.push(IsNumber({}, { each }));
  }

  if (minimum && isNumber(minimum)) {
    decorators.push(Min(minimum, { each }));
  }

  if (maximum && isNumber(maximum)) {
    decorators.push(Max(maximum, { each }));
  }

  if (isPositive) {
    decorators.push(IsPositive({ each }));
  }

  return initDecoratorField(options, decorators);
}

export function NumberFieldOption(
  options: Omit<ApiPropertyOptions, 'type'> & INumberFieldOptions = {},
): PropertyDecorator {
  return NumberField({ ...options, required: false });
}

export function StringField(options: Omit<ApiPropertyOptions, 'type'> & IStringFieldOptions = {}): PropertyDecorator {
  const decorators = [IsNotEmpty(), Trim()];
  const { swagger, minLength, maxLength, toLowerCase, toUpperCase, number } = options;

  if (swagger !== false) {
    decorators.push(ApiProperty({ type: String, ...options }));
  }

  if (minLength) {
    decorators.push(MinLength(minLength));
  }

  if (maxLength) {
    decorators.push(MaxLength(maxLength));
  }

  if (toLowerCase) {
    decorators.push(ToLowerCase());
  }

  if (toUpperCase) {
    decorators.push(ToUpperCase());
  }

  if (number) {
    decorators.push(IsNumberString());
  } else {
    decorators.push(IsString());
  }

  return initDecoratorField(options, decorators);
}

export function StringFieldOption(
  options: Omit<ApiPropertyOptions, 'type'> & IStringFieldOptions = {},
): PropertyDecorator {
  return StringField({ ...options, required: false });
}

export function BooleanField(
  options: Omit<ApiPropertyOptions, 'type'> & Partial<{ swagger: boolean }> = {},
): PropertyDecorator {
  const decorators = [IsBoolean(), ToBoolean()];

  if (options?.swagger !== false) {
    decorators.push(ApiProperty({ type: Boolean, ...options }));
  }

  return initDecoratorField(options, decorators);
}

export function BooleanFieldOption(
  options: Omit<ApiPropertyOptions, 'type'> & Partial<{ swagger: boolean }> = {},
): PropertyDecorator {
  return BooleanField({ ...options, required: false });
}

export function EnumField<TEnum>(
  getEnum: () => TEnum,
  options: Omit<ApiPropertyOptions, 'type' | 'enum' | 'enumName'> &
    Partial<{
      each: boolean;
      swagger: boolean;
      enumNumber: boolean;
    }> = {},
): PropertyDecorator {
  const enumValue = getEnum() as any;
  const decorators = [IsEnum(enumValue)];
  let description = '';

  if (options?.enumNumber) {
    const enumObject = Object.values(enumValue).filter(x => typeof x === 'string');
    description = Object.keys(enumObject)
      .map(key => enumObject[key] + ': ' + enumValue[enumObject[key]])
      .join(', ');
    decorators.push(Type(() => Number));
  } else {
    description = Object.values(enumValue)
      .map(key => key)
      .join(', ');
  }

  if (options?.swagger !== false) {
    options = { ...options, description };
    decorators.push(
      ApiProperty({
        enumName: getVariableName(getEnum),
        ...options,
      }),
    );
  }

  if (options.each) {
    decorators.push(ToArray());
  }

  return initDecoratorField(options, decorators);
}

export function EnumFieldOptional<TEnum>(
  getEnum: () => TEnum,
  options: Omit<ApiPropertyOptions, 'type' | 'required' | 'enum' | 'enumName'> &
    Partial<{ each: boolean; swagger: boolean; enumNumber: boolean }> = {},
): PropertyDecorator {
  return EnumField(getEnum, { ...options, required: false });
}

export function IsDescriptiveNumber(options = {}) {
  const regex = new RegExp(/^~?\d+(\.\d+)?$/);
  return applyDecorators(
    Transform(({ value }) => {
      if (!isString(value)) return value;
      if (matches(value, regex) && value.match(/\d/g).length <= 10) return value; // match the pattern (~)number(.number)
      return -1;
    }),
    IsString({
      message: v => `Field ${v.property} must be a number string with less than 10 digit.`,
    }),
  );
}
