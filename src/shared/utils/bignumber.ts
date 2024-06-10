import BigNumber from 'bignumber.js';
import { isNumber, isNumberString } from 'class-validator';

export const addDecimal = (value: string | number, decimal: number) => {
  if (!isNumber(value) && !isNumberString(value)) return '0';
  return BigNumber(value).multipliedBy(BigNumber(10).pow(decimal)).toFixed().toString();
};

export const calculateFee = (amount: string, gasFee: string | number, tipPercent: number) => {
  const tip = BigNumber(amount)
    .minus(BigNumber(gasFee))
    .multipliedBy(tipPercent * 10)
    .dividedBy(1000);

  return BigNumber(gasFee).plus(tip).toFixed(0, BigNumber.ROUND_UP);
};
