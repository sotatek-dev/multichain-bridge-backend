import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { isNumber } from 'class-validator';
import Joi from 'joi';

import { MINA_CRAWL_SAFE_BLOCK } from '../constants/entity.constant.js';
import { EEnvironments, EEnvKey } from '../constants/env.constant.js';
import redisConfig from './redis.config.js';

const getEnvFile = () => {
  if (process.env[EEnvKey.NODE_ENV] === EEnvironments.JEST_TESTING) {
    return process.cwd() + '/test.env';
  }
  // fallback to default setting
  return undefined;
};
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvFile(),
      validationSchema: Joi.object({
        [EEnvKey.NODE_ENV]: Joi.string()
          .valid(...Object.values(EEnvironments))
          .default(EEnvironments.DEV),
        [EEnvKey.PORT]: Joi.number().default(3000),
        [EEnvKey.TZ]: Joi.string().default('UTC'),
        [EEnvKey.GLOBAL_PREFIX]: Joi.string(),
        [EEnvKey.SWAGGER_PATH]: Joi.string(),
        [EEnvKey.BCRYPT_SALT_ROUND]: Joi.number(),
        [EEnvKey.LOG_LEVEL]: Joi.string().valid(),
        [EEnvKey.IS_WRITE_LOG]: Joi.string().valid('yes', 'no'),
        // database
        [EEnvKey.DB_HOST]: Joi.string().default('localhost'),
        [EEnvKey.DB_PORT]: Joi.number().default(5432),
        [EEnvKey.DB_USERNAME]: Joi.string().required(),
        [EEnvKey.DB_PASSWORD]: Joi.string().required(),
        // JWT KEY
        [EEnvKey.JWT_SECRET_KEY]: Joi.string().required(),
        [EEnvKey.JWT_REFRESH_SECRET_KEY]: Joi.string().required(),
        [EEnvKey.JWT_ACCESS_TOKEN_EXPIRE]: Joi.string().required(),
        [EEnvKey.JWT_REFRESH_TOKEN_EXPIRE]: Joi.string().required(),
        //crawler
        [EEnvKey.CRAWLER_NETWORK]: Joi.string().required(),
        [EEnvKey.ETH_BRIDGE_START_BLOCK]: Joi.number().optional().allow(''),
        [EEnvKey.MINA_BRIDGE_START_BLOCK]: Joi.string().required(),
        [EEnvKey.MINA_BRIDGE_RPC_OPTIONS]: Joi.string().required(),
        [EEnvKey.MINA_BRIDGE_ARCHIVE_RPC_OPTIONS]: Joi.string().required(),
        [EEnvKey.ETH_BRIDGE_RPC_OPTIONS]: Joi.string().required(),
        [EEnvKey.SIGNER_PRIVATE_KEY]: Joi.string().required(),
        [EEnvKey.MINA_BRIDGE_CONTRACT_ADDRESS]: Joi.string().required(),
        [EEnvKey.ETH_BRIDGE_CONTRACT_ADDRESS]: Joi.string().required(),
        [EEnvKey.ETH_TOKEN_BRIDGE_ADDRESS]: Joi.string().required(),
        [EEnvKey.MINA_TOKEN_BRIDGE_ADDRESS]: Joi.string().required(),
        [EEnvKey.ADMIN_MESSAGE_FOR_SIGN]: Joi.string().required(),
        [EEnvKey.MINA_BRIDGE_SC_PRIVATE_KEY]: Joi.string().required(),
        [EEnvKey.ETH_BRIDGE_DOMAIN_NAME]: Joi.string().required(),
        [EEnvKey.ETH_BRIDGE_DOMAIN_VERSION]: Joi.string().required(),
        [EEnvKey.MINA_CRAWL_SAFE_BLOCK]: Joi.number().default(MINA_CRAWL_SAFE_BLOCK),
        [EEnvKey.EVM_SAFE_BLOCK]: Joi.number().default(10),
        // mina validator
        [EEnvKey.MINA_VALIDATOR_THRESHHOLD]: Joi.number().required(),
        // fee
        [EEnvKey.BASE_MINA_BRIDGE_FEE]: Joi.number().default(1 * Math.pow(10, 8)),
      }).custom(value => {
        value[EEnvKey.ETH_BRIDGE_START_BLOCK] = isNumber(value[EEnvKey.ETH_BRIDGE_START_BLOCK])
          ? value[EEnvKey.ETH_BRIDGE_START_BLOCK]
          : Number.MAX_SAFE_INTEGER;
        value[EEnvKey.MINA_BRIDGE_START_BLOCK] = Number(value[EEnvKey.MINA_BRIDGE_START_BLOCK]).valueOf();
        value[EEnvKey.MINA_BRIDGE_RPC_OPTIONS] = value[EEnvKey.MINA_BRIDGE_RPC_OPTIONS].split(',');
        value[EEnvKey.ETH_BRIDGE_RPC_OPTIONS] = value[EEnvKey.ETH_BRIDGE_RPC_OPTIONS].split(',');

        return value;
      }),
      load: [redisConfig],
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigurationModule {}
