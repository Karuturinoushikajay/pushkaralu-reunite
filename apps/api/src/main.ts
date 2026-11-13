import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { APP_CONFIG } from './config/env';
import type { AppConfig } from './config/env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  app.enableShutdownHooks();

  // Expo web (localhost:8081) and Vite dashboard (5173) call the API from the browser.
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const config = app.get<AppConfig>(APP_CONFIG);
  await app.listen(config.API_PORT);
  Logger.log(`Pushkaralu API listening on http://localhost:${config.API_PORT}`, 'Bootstrap');
}

void bootstrap();
