import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';
import express, { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(compression());
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://www.noslag.thepakegroup.com',
      'https://noslag.thepakegroup.com',
      'https://www.test.noslag.com',
      'https://test.noslag.com',
      'https://www.noslag.com',
      'https://noslag.com'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,PATCH',
    allowedHeaders: 'Content-Type,Authorization',
    credentials: true,
  });

  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  //app.setGlobalPrefix('api');
  // Increase request body size limit (e.g., 50MB)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  const config = new DocumentBuilder()
    .setTitle('NoSlag')
    .setDescription('NoSlag API Documentation')
    .setVersion('1.0')
    .addServer('localhost:3000/', 'Local environment')
    .addTag('NoSlag')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const logger = new Logger('bootstrap');
  SwaggerModule.setup('api', app, document);

  await app.listen(configService.get('PORT'), () => {
    return logger.log(`Server running on port ${configService.get('PORT')}`);
  });
}
bootstrap();
