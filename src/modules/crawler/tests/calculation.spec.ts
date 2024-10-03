import { calculateUnlockFee } from '../../../shared/utils/bignumber.js';

describe('test amount fee calculation', () => {
  it('correct amount', () => {
    const fromDecimal = 9,
      toDecimal = 18,
      gasFeeWithDecimalPlaces = '0.000001',
      inputAmountNoDecimalPlaces = '200000',
      tipPercent = 0.0001;
    const result = calculateUnlockFee({
      fromDecimal,
      gasFeeWithDecimalPlaces,
      inputAmountNoDecimalPlaces,
      tipPercent,
      toDecimal,
    });
    console.log(result);

    expect(result.success).toBeTruthy();
  });
});
