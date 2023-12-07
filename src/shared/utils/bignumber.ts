import BigNumber from 'bignumber.js';
import { isNumber, isNumberString } from 'class-validator';

import { DEFAULT_DECIMAL_PLACES } from '@constants/blockchain.constant';

export const addDecimal = (value: string | number) => {
  if (!isNumber(value) && !isNumberString(value)) return '0';
  return BigNumber(value).multipliedBy(BigNumber(10).pow(DEFAULT_DECIMAL_PLACES)).toFixed().toString();
};
