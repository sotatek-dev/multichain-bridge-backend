import { ENetworkName } from '../../../constants/blockchain.constant.js';

export interface IReceiveCrawledEvent {
  network: ENetworkName;
  eventLogId: number;
}
export interface IReceiveVerifiedSignature {
  eventLogId: number;
  signatureId: number;
  network: ENetworkName;
}
export interface IGenerateSignature {
  eventLogId: number;
}
export interface IUnlockToken {
  eventLogId: number;
}
export interface IJobUnlockPayload {
  eventLogId: number;
  network: ENetworkName;
  senderAddress: string;
}
