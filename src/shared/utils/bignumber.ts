import BigNumber from 'bignumber.js';
import { isNumber, isNumberString } from 'class-validator';

import { DEFAULT_DECIMAL_PLACES } from '@constants/blockchain.constant';

export const addDecimal = (value: string | number, decimal: number) => {
  if (!isNumber(value) && !isNumberString(value)) return '0';
  return BigNumber(value).multipliedBy(BigNumber(10).pow(decimal)).toFixed().toString();
};

export const calculateFee = (amount: string, gasFee: string | number, tipPercent: number) => {
  const tip = BigNumber(amount).minus(BigNumber(gasFee)).multipliedBy(tipPercent * 100).dividedBy(100);

  return BigNumber(gasFee).plus(tip).toFixed(0, BigNumber.ROUND_UP);
}
