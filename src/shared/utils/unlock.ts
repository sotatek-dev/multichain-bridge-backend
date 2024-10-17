import { EEventStatus } from '../../constants/blockchain.constant.js';

export const canTxRetry = (status: EEventStatus) => {
  return [EEventStatus.FAILED, EEventStatus.WAITING].includes(status);
};
