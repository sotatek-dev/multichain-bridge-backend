import { AuthModule } from './auth/auth.module.js';
import { CrawlerModule } from './crawler/crawler.module.js';
import { UsersModule } from './users/users.module.js';

export const MODULES = [AuthModule, CrawlerModule, UsersModule];
