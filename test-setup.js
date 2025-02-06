import { jest } from '@jest/globals';
import * as dotenv from 'dotenv';

dotenv.config({
  path: './test.env',
});
process.env.NODE_ENV = 'jest';
global.jest = jest;
