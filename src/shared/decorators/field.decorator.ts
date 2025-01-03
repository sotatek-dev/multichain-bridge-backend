import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptions } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDecimal,
  IsEmail,
  IsEnum,
  IsEthereumAddress,
  IsInt,
  IsNotEmpty,
  isNumber,
  IsNumber,
  IsNumberString,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { isDevelopmentEnvironment } from '../../shared/utils/util.js';
import { ToBoolean, ToBooleanArray, ToLowerCase, ToUpperCase, Trim } from './transform.decorator.js';

interface IStringFieldOptions {
  minLength?: number;
  maxLength?: number;
  toLowerCase?: boolean;
  toUpperCase?: boolean;
  number?:
    | boolean
    | {
        maxDecimalPlaces: number;
      };
  isEmail?: boolean;
  isEthereumAddress?: boolean;
}
const initSharedDecorator = (options: ApiPropertyOptions, type: any) => {
  const sharedDecorators = [];
  if (isDevelopmentEnvironment()) {
    sharedDecorators.push(ApiProperty({ ...options, type }));
  }
  if (options.required) {
    sharedDecorators.push(IsNotEmpty());
  } else {
    sharedDecorators.push(IsOptional());
  }
  if (options.enum) {
    sharedDecorators.push(IsEnum(options.enum));
  }
  if (options.isArray) {
    sharedDecorators.push(IsArray());
  }

  return sharedDecorators;
};
interface INumberFieldOptions {
  each?: boolean;
  minimum?: number;
  maximum?: number;
  int?: boolean;
  isPositive?: boolean;
}

export function NumberField(options: Omit<ApiPropertyOptions, 'type'> & INumberFieldOptions = {}): PropertyDecorator {
  const decorators = [Type(() => Number), ...initSharedDecorator(options, Number)];

  const { int, minimum, maximum, isPositive, isArray: each = false } = options;

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

  return applyDecorators(...decorators);
}

export function StringField(options: Omit<ApiPropertyOptions, 'type'> & IStringFieldOptions = {}): PropertyDecorator {
  const decorators = [Trim(), ...initSharedDecorator(options, String)];

  const {
    minLength,
    maxLength,
    toLowerCase,
    toUpperCase,
    number,
    isEmail,
    isEthereumAddress,
    isArray = false,
  } = options;

  if (minLength) {
    decorators.push(MinLength(minLength));
  }

  if (maxLength) {
    decorators.push(MaxLength(maxLength));
  }

  if (toLowerCase) {
    decorators.push(ToLowerCase());
  }
  if (isEthereumAddress) {
    decorators.push(IsEthereumAddress());
  }
  if (toUpperCase) {
    decorators.push(ToUpperCase());
  }
  // strings, number string validation
  if (typeof number == 'object') {
    decorators.push(
      IsDecimal(
        { decimal_digits: '0,' + number.maxDecimalPlaces },
        {
          each: isArray,
          message: ctx => `${ctx.property} must be a number with max decimal places equals ${number.maxDecimalPlaces}`,
        },
      ),
    );
  } else if (typeof number === 'boolean') {
    decorators.push(IsNumberString({}, { each: isArray }));
  } else {
    decorators.push(IsString({ each: isArray }));
  }
  //
  if (isEmail) {
    decorators.push(IsEmail());
  }

  return applyDecorators(...decorators);
}

export function BooleanField(
  options: Omit<ApiPropertyOptions, 'type'> & Partial<{ swagger: boolean }> = {},
): PropertyDecorator {
  const decorators = [...initSharedDecorator(options, Boolean)];
  if (options.isArray) {
    decorators.push(IsBoolean({ each: true }), ToBooleanArray());
  } else {
    decorators.push(IsBoolean(), ToBoolean());
  }
  return applyDecorators(...decorators);
}

export function ObjectField(options: Omit<ApiPropertyOptions, 'type'> & { type: CallableFunction }) {
  const decorators = initSharedDecorator(options, options.type);

  decorators.push(Type(() => options.type));
  decorators.push(ValidateNested({ each: true }));
  if (options.isArray) {
    decorators.push(IsArray());
  } else {
    decorators.push(IsObject());
  }
  return applyDecorators(...decorators);
}
