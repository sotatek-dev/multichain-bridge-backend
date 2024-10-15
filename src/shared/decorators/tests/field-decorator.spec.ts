import { validateAndTransform } from '../../../shared/utils/class-validator.js';
import { StringField } from '../field.decorator.js';

class StringTest {
  @StringField({
    required: true,
  })
  fieldStringRequired?: string;

  @StringField({
    required: false,
  })
  fieldStringNonRequired?: string;

  @StringField({
    required: false,
    isArray: true,
  })
  arrayString?: string[];
}
class NumberStringRequired {
  @StringField({
    required: false,
    number: true,
  })
  numberStringNonRequired?: string;

  @StringField({
    required: false,
    isArray: true,
    number: true,
  })
  arrayInt?: string[];

  @StringField({
    required: false,
    isArray: true,
    number: {
      maxDecimalPlaces: 2,
    },
  })
  arrayDecimals?: string[];
}

describe('test primitives function', () => {
  test('valid string', async () => {
    const { errors, transformed } = await validateAndTransform(
      {
        fieldStringRequired: 'string',
        fieldStringNonRequired: undefined,
        arrayString: ['string1', 'string2'],
      } as StringTest,
      StringTest,
    );

    expect(errors.length).toEqual(0);
    expect(transformed.arrayString).toBeDefined();
  });
  test('missing required string', async () => {
    const { errors } = await validateAndTransform(
      { arrayString: [], fieldStringNonRequired: 'non-required' } as StringTest,
      StringTest,
    );
    expect(errors.length).toBeGreaterThan(0);
  });
  test('valid number strings', async () => {
    const { errors } = await validateAndTransform(
      { numberStringNonRequired: '123' } as NumberStringRequired,
      NumberStringRequired,
    );

    expect(errors.length).toEqual(0);
  });

  test('invalid number strings', async () => {
    const { errors } = await validateAndTransform(
      { numberStringNonRequired: '123s' } as NumberStringRequired,
      NumberStringRequired,
    );

    expect(errors.length).toEqual(1);
  });

  test('valid number string array', async () => {
    const { errors, transformed } = await validateAndTransform(
      { arrayInt: ['1', '2', 3], arrayDecimals: ['1.12', 2.34, 1] } as NumberStringRequired,
      NumberStringRequired,
    );

    expect(errors.length).toEqual(0);
    expect(transformed.arrayInt).toEqual(['1', '2', '3']);
    expect(transformed.arrayDecimals).toEqual(['1.12', '2.34', '1']);
  });

  test('invalid decimals string array', async () => {
    const { errors } = await validateAndTransform(
      { arrayDecimals: ['1.1', '2.1', 3.123] } as NumberStringRequired,
      NumberStringRequired,
    );

    expect(errors.length).toEqual(1);
  });
});
