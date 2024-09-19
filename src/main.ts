import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { EEnvKey } from './constants/env.constant.js';
import './core/paginate-typeorm.js';
import { isDevelopmentEnvironment } from './shared/utils/util.js';
import { initSwagger } from './swagger.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const listenPort = configService.get(EEnvKey.PORT) || 3000;

  app.setGlobalPrefix(configService.get<string>(EEnvKey.GLOBAL_PREFIX) || 'api');
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  if (isDevelopmentEnvironment()) {
    initSwagger(app, configService.get(EEnvKey.SWAGGER_PATH));
  }
  await app.listen(listenPort, async () => {
    const appUrl = await app.getUrl();
    console.log(`🚀🚀🚀 Mina Bridge backend is running at ${appUrl}`);
    if (isDevelopmentEnvironment()) {
      console.log(`📖📖📖 Documentation is running at ${appUrl}/${configService.get(EEnvKey.SWAGGER_PATH)}`);
    }
  });
}
bootstrap();
