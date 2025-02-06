import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Transform } from 'class-transformer';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import pkg from 'lodash';

const { castArray, isArray, isNil, map, trim } = pkg;
export function Trim(): PropertyDecorator {
  return Transform(params => {
    const value = params.value as string[] | string;

    if (isArray(value)) {
      return map(value, (v: any) => trim(v).replace(/\s\s+/g, ' '));
    }

    return trim(value).replace(/\s\s+/g, ' ');
  });
}
function toBoolean(value: string | number | boolean): boolean {
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return Boolean(value).valueOf();
}
export function ToBoolean(): PropertyDecorator {
  return Transform(
    ({ value }) => {
      if (value) return toBoolean(value);
    },
    { toClassOnly: true },
  );
}
export function ToBooleanArray(): PropertyDecorator {
  return Transform(
    params => {
      if (isArray(params.value)) {
        return params.value.map((v: string | number | boolean) => toBoolean(v));
      }
    },
    { toClassOnly: true },
  );
}

export function ToInt(): PropertyDecorator {
  return Transform(
    params => {
      const value = params.value as string;

      return Number.parseInt(value, 10);
    },
    { toClassOnly: true },
  );
}

export function ToArray(): PropertyDecorator {
  return Transform(
    params => {
      const value = params.value;

      if (isNil(value)) {
        return [];
      }

      return castArray(value);
    },
    { toClassOnly: true },
  );
}

export function ToLowerCase(): PropertyDecorator {
  return Transform(
    params => {
      const value = params.value;

      if (!value) {
        return;
      }

      if (!Array.isArray(value)) {
        return value.toLowerCase();
      }

      return value.map(v => v.toLowerCase());
    },
    {
      toClassOnly: true,
    },
  );
}

export function ToUpperCase(): PropertyDecorator {
  return Transform(
    params => {
      const value = params.value;

      if (!value) {
        return;
      }

      if (!Array.isArray(value)) {
        return value.toUpperCase();
      }

      return value.map(v => v.toUpperCase());
    },
    {
      toClassOnly: true,
    },
  );
}

export const RawBody = createParamDecorator((data: unknown, ctx: ExecutionContext): any => {
  const request = ctx.switchToHttp().getRequest();
  return request.body;
});
