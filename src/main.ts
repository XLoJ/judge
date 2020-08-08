import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { isUndef } from './utils';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const host = configService.get<string>('HOST') ?? 'localhost';
  const port = configService.get<string>('PORT') ?? 3000;

  if (isUndef(configService.get('USERNAME'))) {
    Logger.error('You should specify a username');
    process.exit(1);
  }
  if (isUndef(configService.get('PASSWORD'))) {
    Logger.error('You should specify a password');
    process.exit(1);
  }

  if (configService.get('USE_RMQ') === 'true') {
    const rmqUrl = configService.get<string>('RMQ_URL');
    const queue = configService.get<string>('RMQ_QUEUE') || 'judge';
    app.connectMicroservice({
      transport: Transport.RMQ,
      options: {
        urls: [rmqUrl],
        queue,
        queueOptions: {}
      }
    });
    await app.startAllMicroservicesAsync();
  }

  if (configService.get('NODE_ENV') !== 'PRODUCTION') {
    const documentOptions = new DocumentBuilder()
      .setTitle('XLoJ Judge Server')
      .setDescription(
        'XLorJudge is Competitive Programming Contest Judge Server for XLor Online Judge.'
      )
      .setVersion('1.0')
      .addTag('Judge')
      .build();
    const document = SwaggerModule.createDocument(app, documentOptions);
    SwaggerModule.setup('api', app, document);
  }

  await app.listen(port, host);

  Logger.log(
    `XLorJudge is running on: ${await app.getUrl()}`,
    configService.get('SERVER_NAME')
  );
}

bootstrap();
