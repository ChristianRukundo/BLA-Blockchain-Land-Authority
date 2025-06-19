import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as helmet from 'helmet';
import * as compression from 'compression';
import * as cors from 'cors';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Get configuration service
  const configService = app.get(ConfigService);

  // Use Winston logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Security middleware
  if (configService.get('app.helmet.enabled')) {
    app.use(helmet());
  }

  // Compression middleware
  if (configService.get('app.compression.enabled')) {
    app.use(compression());
  }

  // CORS configuration
  app.use(cors(configService.get('app.cors')));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: configService.get('app.nodeEnv') === 'production',
    }),
  );

  // API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: configService.get('app.apiVersion'),
  });

  // Global prefix
  app.setGlobalPrefix(configService.get('app.apiPrefix'));

  // Swagger documentation
  if (configService.get('app.swagger.enabled')) {
    const config = new DocumentBuilder()
      .setTitle(configService.get('app.swagger.title'))
      .setDescription(configService.get('app.swagger.description'))
      .setVersion(configService.get('app.swagger.version'))
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Authentication', 'User authentication and authorization')
      .addTag('Users', 'User management operations')
      .addTag('User Profiles', 'User profile management')
      .addTag('Land Parcels', 'Land parcel management (LAIS)')
      .addTag('Notifications', 'User notification system')
      .addTag('IPFS', 'Decentralized file storage')
      .addTag('Admin', 'Administrative operations')
      .addTag('Expropriation', 'Land expropriation management')
      .addTag('Health', 'System health checks')
      .addServer(`http://localhost:${configService.get('app.port')}`, 'Development server')
      .addServer('https://api.rwalandchain.com', 'Production server')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(configService.get('app.swagger.path'), app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customSiteTitle: 'RwaLandChain API Documentation',
      customfavIcon: '/favicon.ico',
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #2563eb }
      `,
    });
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  // Start the server
  const port = configService.get('app.port');
  await app.listen(port);

  console.log(`
🚀 RwaLandChain Backend Server Started!

📍 Server URL: http://localhost:${port}
📚 API Documentation: http://localhost:${port}/${configService.get('app.swagger.path')}
🔧 Environment: ${configService.get('app.nodeEnv')}
📊 Health Check: http://localhost:${port}/${configService.get('app.apiPrefix')}/health

🌟 Ready to serve requests!
  `);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

bootstrap();

