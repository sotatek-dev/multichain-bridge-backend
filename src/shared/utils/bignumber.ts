// import BigNumber from 'bignumber.js/bignumber.mjs';
import { BigNumber } from 'bignumber.js';
import { isNumber, isNumberString } from 'class-validator';

import { DECIMAL_BASE } from '../../constants/blockchain.constant.js';

// display number with many decimal places in the same format, i.e: 0.00000001 instead of 1e-8.
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

/**
 * Calculation result from @function calculateUnlockFee
 */
interface ICalculateFeeResult {
  /**
   * @property the tip percent which is taken by x percentage of locked amount (in ETH or MINA)
   */
  tipWithDecimalPlaces?: string;

  /**
   * @property the gas fee that user need to pay for the bridge (in ETH or MINA)
   */
  gasFeeWithDecimalPlaces?: string;

  /**
   * @property final amount receive after minus tip and gas fee (in wei or nano-mina)
   */
  amountReceiveNoDecimalPlace?: string;

  /**
   * @property sum of tip and gas fee (in wei or nano-mina)
   */
  protocolFeeNoDecimalPlace?: string;

  /**
   * @property the calculation success or not
   */
  success: boolean;

  /**
   * @property any error if exists
   */
  error: Error | null;
}
/**
 * calculate unlocked fee with formula amount received = locked amount - tip - gas fee.
  @param tipPercent [1 - 100] percentage.
  @param gasFeeWithDecimalPlaces network gas fee with in ETH or MINA
  @param fromDecimal locked token decimal
  @param toDecimal unlocked token decimal
  @param inputAmountNoDecimalPlaces locked amount with unit wei or nano-mina
 */
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
