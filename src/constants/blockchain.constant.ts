export const DEFAULT_DECIMAL_PLACES = 6;
export const DEFAULT_ADDRESS_PREFIX = '0x';
export const DECIMAL_BASE = 10;
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
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ETokenPairStatus {
  ENABLE = 'enable',
  DISABLE = 'disable',
  CREATED = 'created',
  DEPLOYING = 'deploying',
  DEPLOY_FAILED = 'deploy_failed',
}

export enum EMinaChainEnviroment {
  TESTNET = 'testnet',
  MAINNET = 'mainnet',
}

export enum ECoinMarketCapTokenId {
  ETH = 1027,
  MINA = 8646,
}
