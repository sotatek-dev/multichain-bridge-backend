import * as dotenv from 'dotenv';
import { dirname, join } from 'path';
import type { DataSourceOptions } from 'typeorm';

import { EEnvKey } from './constants/env.constant.js';

import { isDevelopmentEnvironment } from './shared/utils/util.js';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config();
export const migrationDir = join(__dirname, 'database/migrations');
export default {
  type: 'postgres',
  host: process.env[EEnvKey.DB_HOST],
  port: +process.env[EEnvKey.DB_PORT],
  username: process.env[EEnvKey.DB_USERNAME],
  password: process.env[EEnvKey.DB_PASSWORD],
  database: process.env[EEnvKey.DB_DATABASE],
  entities: [join(__dirname, '/modules/**/entities/*.entity{.js,.ts}')],
  migrationsTableName: 'custom_migration_table',
  migrations: [join(migrationDir, '*{.js,.ts}')],
  logging: isDevelopmentEnvironment(),
  cache: true,
  timezone: 'Z',
  extra: { decimalNumbers: true },
} as DataSourceOptions;
