import { validateAndTransform } from '../../../shared/utils/class-validator.js';
import { UpdateCommonConfigBodyDto } from '../dto/common-config-request.dto.js';

describe('test dto', () => {
  test('invalid data type', async () => {
    const wrongDataType = {
      dailyQuota: '1s',
      feeUnlockEth: '1s',
      feeUnlockMina: '1s',
      tip: '1s',
    };
    // expect 4 error message
    const { errors } = await validateAndTransform(wrongDataType, UpdateCommonConfigBodyDto);
    expect(errors.find(e => e.property === 'feeUnlockEth')).toBeDefined();
    expect(errors.find(e => e.property === 'feeUnlockMina')).toBeDefined();
    expect(errors.find(e => e.property === 'dailyQuota')).toBeDefined();
    expect(errors.find(e => e.property === 'tip')).toBeDefined();
  });
  test('exceed decimal place limit', async () => {
    const maxDecimalLimit = {
      feeUnlockEth: '1.1110001110001112221', // more than env.DECIMAL_TOKEN_EVM decimal places
      feeUnlockMina: 1.11111000111, // more than env.DECIMAL_TOKEN_MINA decimal places
    };

    const { errors } = await validateAndTransform(maxDecimalLimit, UpdateCommonConfigBodyDto);
    expect(errors.find(e => e.property === 'feeUnlockEth')).toBeDefined();
    expect(errors.find(e => e.property === 'feeUnlockMina')).toBeDefined();
  });
  test('wrong decimal format', async () => {
    const maxDecimalLimit = {
      feeUnlockEth: 1e-10,
    };
    const { errors } = await validateAndTransform(maxDecimalLimit, UpdateCommonConfigBodyDto);
    expect(errors.find(e => e.property === 'feeUnlockEth')).toBeDefined();
  });
});
