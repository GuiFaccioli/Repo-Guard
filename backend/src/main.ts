import { NestFactory } from '@nestjs/core';
import session from 'express-session';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

function parseAllowedOrigins(frontendUrlValue: string) {
  return frontendUrlValue
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const expressApp = app.getHttpAdapter().getInstance();

  const frontendUrlValue =
    configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
  const sessionSecret = configService.get<string>('SESSION_SECRET');
  const nodeEnv = configService.get<string>('NODE_ENV') ?? 'development';
  const portValue = configService.get<string>('PORT') ?? '3001';
  const port = Number.parseInt(portValue, 10);
  const isProduction = nodeEnv === 'production';
  const allowedOrigins = parseAllowedOrigins(frontendUrlValue);

  if (!allowedOrigins.length) {
    throw new Error('FRONTEND_URL must define at least one allowed origin.');
  }

  if (!sessionSecret || sessionSecret.trim().length < 16) {
    throw new Error(
      'SESSION_SECRET is required and must be at least 16 characters long.',
    );
  }

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('PORT must be a valid positive integer.');
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
  });

  if (isProduction) {
    expressApp.set('trust proxy', 1);
  }

  app.use(
    session({
      name: 'repoguard.sid',
      secret: sessionSecret,
      proxy: isProduction,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 1000 * 60 * 60 * 24,
      },
    }),
  );

  await app.listen(port);
}
bootstrap();
