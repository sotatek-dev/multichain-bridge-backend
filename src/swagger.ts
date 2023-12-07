import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('MinaBridge')
  .setDescription('MinaBridge API')
  .setVersion('1.0')
  .addTag('MinaBridge')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
    'Authorization',
  )
  .build();

export function initSwagger(app: INestApplication, path?: string) {
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(path || 'api/docs', app, document);
}
