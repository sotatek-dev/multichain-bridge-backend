export const DEFAULT_DECIMAL_PLACES = 6;

export enum ENetworkName {
  ETH = 'eth',
  MINA = 'mina',
}

export enum EEventName {
  LOCK = 'Lock',
  UNLOCK = 'Unlock',
}

export enum EEventStatus {
  WAITING = 'waiting',
  PROCESSING = 'processing',
  DONE = 'done',
  FAILED = 'failed',
}

export enum ETokenPairStatus {
  ENABLE = 'enable',
  DISABLE = 'disable'
}
