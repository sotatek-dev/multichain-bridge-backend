import { calculateUnlockFee } from '../../../shared/utils/bignumber.js';

// test unlock fee calculation amount received = locked amount - tip fee - network gas fee
describe('test amount fee calculation', () => {
  it('correct amount', () => {
    const fromDecimal = 9,
      toDecimal = 18,
      gasFeeWithDecimalPlaces = '0.000001', // network gas fee
      inputAmountNoDecimalPlaces = '200000', // locked amount
      tipPercent = 5; // tip percentage. max 100
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
