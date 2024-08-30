import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { EEnvKey } from './constants/env.constant';
import './core/paginate-typeorm';
import { initSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const swaggerPath = configService.get(EEnvKey.SWAGGER_PATH);
  const listenPort = configService.get(EEnvKey.PORT) || 3000;

  app.setGlobalPrefix(configService.get<string>(EEnvKey.GLOBAL_PREFIX) || 'api');
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  // Swagger

  if (swaggerPath) {
    initSwagger(app, swaggerPath);
  }
  await app.listen(listenPort, async () => {
    const appUrl = await app.getUrl();
    console.log(`🚀🚀🚀 Mina Bridge backend is running at ${appUrl}`);
    if (swaggerPath) {
      console.log(`📖📖📖 Documentation is running at ${appUrl}/${swaggerPath}`);
    }
  });
}
bootstrap();
