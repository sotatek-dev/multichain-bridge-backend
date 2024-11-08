import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { isNumber } from 'class-validator';
import * as Joi from 'joi';

import { EEnvKey } from '@constants/env.constant';

import redisConfig from './redis.config';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        [EEnvKey.NODE_ENV]: Joi.string().valid('local', 'dev', 'test', 'uat', 'production').default('dev'),
        [EEnvKey.PORT]: Joi.number().default(3000),
        [EEnvKey.TZ]: Joi.string().default('UTC'),
        [EEnvKey.GLOBAL_PREFIX]: Joi.string(),
        [EEnvKey.SWAGGER_PATH]: Joi.string(),
        [EEnvKey.BCRYPT_SALT_ROUND]: Joi.number(),
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
        [EEnvKey.CRAWLER_START_BLOCK]: Joi.number().optional().allow(''),
        [EEnvKey.RPC_OPTIONS]: Joi.string().required(),
        [EEnvKey.SIGNER_PRIVATE_KEY]: Joi.string().required(),
        [EEnvKey.MINA_BRIDGE_CONTRACT_ADDRESS]: Joi.string().required(),
        // Mina Bridge
        [EEnvKey.ADMIN_ADDRESS]: Joi.string().required(),
      }).custom(value => {
        value[EEnvKey.CRAWLER_START_BLOCK] = isNumber(value[EEnvKey.CRAWLER_START_BLOCK])
          ? value[EEnvKey.CRAWLER_START_BLOCK]
          : Number.MAX_SAFE_INTEGER;
        value[EEnvKey.RPC_OPTIONS] = value[EEnvKey.RPC_OPTIONS].split(',');
        value[EEnvKey.SIGNER_PRIVATE_KEY] = value[EEnvKey.SIGNER_PRIVATE_KEY].split(',');

        return value;
      }),
      load: [redisConfig],
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigurationModule {}
