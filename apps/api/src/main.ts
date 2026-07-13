import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  // deploy-trigger: retrigger after Root Directory -> repo root change (2026-07-13)
  const app = await NestFactory.create(AppModule);

  // PD-3 — security headers (API-appropriate defaults; CSP is a browser concern
  // handled by the Next.js app, so it is disabled here)
  app.use(helmet({ contentSecurityPolicy: false }));

  // Increase body size limit to 10 MB to allow base64-encoded receipt images
  // sent inline from the WorkflowActionModal file picker.
  // PD-3 — buffer the raw body so webhook HMAC verification signs exactly the
  // bytes the sender signed (never a re-serialized JSON approximation).
  app.use(json({
    limit: '10mb',
    verify: (req, _res, buf) => { (req as unknown as { rawBody?: Buffer }).rawBody = buf; },
  }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  // Global API prefix
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS — tighten in production
  app.enableCors({
    origin: process.env['APP_URL'] ?? 'http://localhost:3000',
    credentials: true,
  });

  const port = parseInt(process.env['PORT'] ?? '4000', 10);
  await app.listen(port);

  console.warn(`Lados API running on http://localhost:${port}/api/v1`);
  console.warn(`Health: http://localhost:${port}/api/v1/health`);
}

bootstrap();
