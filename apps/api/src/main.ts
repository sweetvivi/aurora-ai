import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApplication } from './bootstrap/configure-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const configService = app.get(ConfigService);
  const host = configService.get<string>('API_HOST', '127.0.0.1');
  const port = configService.get<number>('API_PORT', 3001);
  const prefix = configService.get<string>('API_PREFIX', 'api/v1');

  configureApplication(app);
  app.enableShutdownHooks();

  await app.listen(port, host);
  Logger.log(`Aurora API is listening at http://${host}:${port}/${prefix}`, 'Bootstrap');
}

void bootstrap();
