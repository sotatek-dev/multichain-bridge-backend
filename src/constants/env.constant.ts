export enum EEnvKey {
  NODE_ENV = 'NODE_ENV',
  TZ = 'TZ',
  LOG_LEVEL = 'LOG_LEVEL',
  IS_WRITE_LOG = 'IS_WRITE_LOG',
  GLOBAL_PREFIX = 'GLOBAL_PREFIX',
  SWAGGER_PATH = 'SWAGGER_PATH',
  PORT = 'PORT',
  BULL_MONITOR_PORT = 'BULL_MONITOR_PORT',
  DB_HOST = 'DB_HOST',
  DB_PORT = 'DB_PORT',
  DB_USERNAME = 'DB_USERNAME',
  DB_PASSWORD = 'DB_PASSWORD',
  DB_DATABASE = 'DB_DATABASE',
  BCRYPT_SALT_ROUND = 'BCRYPT_SALT_ROUND',
  JWT_SECRET_KEY = 'JWT_SECRET_KEY',
  JWT_REFRESH_SECRET_KEY = 'JWT_REFRESH_SECRET_KEY',
  JWT_ACCESS_TOKEN_EXPIRE = 'JWT_ACCESS_TOKEN_EXPIRE',
  JWT_REFRESH_TOKEN_EXPIRE = 'JWT_REFRESH_TOKEN_EXPIRE',
  REDIS_HOST = 'REDIS_HOST',
  REDIS_PORT = 'REDIS_PORT',
  ETH_BRIDGE_START_BLOCK = 'ETH_BRIDGE_START_BLOCK',
  MINA_BRIDGE_START_BLOCK = 'MINA_BRIDGE_START_BLOCK',
  CRAWLER_NETWORK = 'CRAWLER_NETWORK',
  MINA_BRIDGE_RPC_OPTIONS = 'MINA_BRIDGE_RPC_OPTIONS',
  MINA_BRIDGE_ARCHIVE_RPC_OPTIONS = 'MINA_BRIDGE_ARCHIVE_RPC_OPTIONS',
  ETH_BRIDGE_RPC_OPTIONS = 'ETH_BRIDGE_RPC_OPTIONS',
  MINA_BRIDGE_CONTRACT_ADDRESS = 'MINA_BRIDGE_CONTRACT_ADDRESS',
  ETH_BRIDGE_CONTRACT_ADDRESS = 'ETH_BRIDGE_CONTRACT_ADDRESS',
  ETH_TOKEN_BRIDGE_ADDRESS = 'ETH_TOKEN_BRIDGE_ADDRESS',
  MINA_TOKEN_BRIDGE_ADDRESS = 'MINA_TOKEN_BRIDGE_ADDRESS',
  MINA_BRIDGE_SC_PRIVATE_KEY = 'MINA_BRIDGE_SC_PRIVATE_KEY',
  SIGNER_PRIVATE_KEY = 'SIGNER_PRIVATE_KEY',
  NUMBER_OF_BLOCK_PER_JOB = 'NUMBER_OF_BLOCK_PER_JOB',
  ADMIN_MESSAGE_FOR_SIGN = 'ADMIN_MESSAGE_FOR_SIGN',
  SIGNER_MINA_PRIVATE_KEY = 'SIGNER_MINA_PRIVATE_KEY',
  DECIMAL_TOKEN_MINA = 'DECIMAL_TOKEN_MINA',
  COINMARKET_KEY = 'COINMARKET_KEY',
  COINMARKET_URL = 'COINMARKET_URL',
  BASE_MINA_BRIDGE_FEE = 'BASE_MINA_BRIDGE_FEE',
  ETH_BRIDGE_DOMAIN_NAME = 'ETH_BRIDGE_DOMAIN_NAME',
  ETH_BRIDGE_DOMAIN_VERSION = 'ETH_BRIDGE_DOMAIN_VERSION',
  DECIMAL_TOKEN_EVM = 'DECIMAL_TOKEN_EVM',
  MINA_VALIDATOR_THRESHHOLD = 'MINA_VALIDATOR_THRESHHOLD',
  EVM_VALIDATOR_THRESHHOLD = 'EVM_VALIDATOR_THRESHHOLD',
  MINA_VALIDATOR_PRIVATE_KEY = 'MINA_VALIDATOR_PRIVATE_KEY',
  EVM_VALIDATOR_PRIVATE_KEY = 'EVM_VALIDATOR_PRIVATE_KEY',
  MINA_CRAWL_SAFE_BLOCK = 'MINA_CRAWL_SAFE_BLOCK',
  THIS_VALIDATOR_INDEX = 'THIS_VALIDATOR_INDEX',
  EVM_SAFE_BLOCK = 'SAFE_BLOCK',
  JOB_PROVIDER_BACKOFF_IN_MINUTES = 'JOB_PROVIDER_BACKOFF_IN_MINUTES',
}

export enum EEnvironments {
  LOCAL = 'local',
  DEV = 'dev',
  TEST = 'test',
  UAT = 'uat',
  PRODUCTION = 'production',
  JEST_TESTING = 'jest',
}
