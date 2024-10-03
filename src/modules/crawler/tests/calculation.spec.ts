import { calculateUnlockFee } from '../../../shared/utils/bignumber.js';

describe('test amount fee calculation', () => {
  it('correct amount', () => {
    const fromDecimal = 18,
      toDecimal = 9,
      gasFeeWithDecimalPlaces = '0.000001',
      inputAmountNoDecimalPlaces = '159719371259000000',
      tipPercent = 5;
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
