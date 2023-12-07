import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { EEnvKey } from './constants/env.constant';
import './core/paginate-typeorm';
import { initSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix(configService.get<string>(EEnvKey.GLOBAL_PREFIX) || 'api');
  app.enableCors();
  // Swagger
  if (configService.get(EEnvKey.SWAGGER_PATH)) {
    initSwagger(app, configService.get(EEnvKey.SWAGGER_PATH));
  }
  const listenPort = configService.get(EEnvKey.PORT) || 3000;
  await app.listen(listenPort);
  console.log(`🚀🚀🚀 Mina Bridge backend is running on port ${listenPort}`);
}
bootstrap();
