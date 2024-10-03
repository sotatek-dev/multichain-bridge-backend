// import BigNumber from 'bignumber.js/bignumber.mjs';
import { BigNumber } from 'bignumber.js';
import { isNumber, isNumberString } from 'class-validator';

import { DECIMAL_BASE } from '../../constants/blockchain.constant.js';

BigNumber.set({
  EXPONENTIAL_AT: 1e9,
});

export const addDecimal = (value: string | number, decimal: number) => {
  if (!isNumber(value) && !isNumberString(value)) return '0';
  return BigNumber(value).multipliedBy(BigNumber(10).pow(decimal)).toFixed(0);
};
export const removeSuffixDecimal = (value: string | number, decimal: number) => {
  if (!isNumber(value) && !isNumberString(value)) return '0';
  return BigNumber(value).div(BigNumber(10).pow(decimal)).toFixed();
};
export const calculateTip = (amount: string, gasFee: string | number, tipPercent: number): BigNumber => {
  return BigNumber(amount).minus(BigNumber(gasFee)).multipliedBy(tipPercent).dividedBy(100);
};
export const calculateFee = (amount: string, gasFee: string | number, tipPercent: number) => {
  const tip = calculateTip(amount, gasFee, tipPercent);
  return BigNumber(gasFee).plus(tip).toFixed(0, BigNumber.ROUND_UP);
};

interface ICalculateFeeResult {
  tipWithDecimalPlaces?: string;
  gasFeeWithDecimalPlaces?: string;
  amountReceiveNoDecimalPlace?: string;
  protocolFeeNoDecimalPlace?: string;
  success: boolean;
  error: Error | null;
}
export const calculateUnlockFee = ({
  fromDecimal,
  gasFeeWithDecimalPlaces,
  inputAmountNoDecimalPlaces,
  tipPercent,
  toDecimal,
}: {
  tipPercent: number;
  gasFeeWithDecimalPlaces: string;
  fromDecimal: number;
  toDecimal: number;
  inputAmountNoDecimalPlaces: string;
}): ICalculateFeeResult => {
  try {
    const amountReceiveConvert = BigNumber(inputAmountNoDecimalPlaces)
      .dividedBy(BigNumber(DECIMAL_BASE).pow(fromDecimal))
      .multipliedBy(BigNumber(DECIMAL_BASE).pow(toDecimal));

    const gasFee = addDecimal(gasFeeWithDecimalPlaces, toDecimal);

    const tip = calculateTip(amountReceiveConvert.toString(), gasFee, tipPercent);

    // protocol fee = tip + gas_fee
    const protocolFeeNoDecimalPlace = tip.plus(gasFee);

    // amount received= total amount - protocol fee
    const amountReceived = BigNumber(amountReceiveConvert).minus(protocolFeeNoDecimalPlace);

    return {
      tipWithDecimalPlaces: removeSuffixDecimal(tip.toString(), toDecimal),
      amountReceiveNoDecimalPlace: amountReceived.toFixed(0),
      gasFeeWithDecimalPlaces: gasFeeWithDecimalPlaces,
      protocolFeeNoDecimalPlace: protocolFeeNoDecimalPlace.toFixed(0),
      error: null,
      success: true,
    };
  } catch (error) {
    return {
      tipWithDecimalPlaces: '0',
      amountReceiveNoDecimalPlace: '0',
      gasFeeWithDecimalPlaces: gasFeeWithDecimalPlaces,
      protocolFeeNoDecimalPlace: '0',
      error,
      success: false,
    };
  }
};
