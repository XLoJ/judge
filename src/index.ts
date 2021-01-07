import fastify from 'fastify';
import hyperid from 'hyperid';

async function bootstrap() {
  const server = fastify({
    bodyLimit: 16 * 1024 * 1024, // 16 MB
    logger: {
      prettyPrint: true,
    },
    genReqId(req) {
      const instance = hyperid({ urlSafe: true });
      return instance.uuid;
    },
  });

  await server.listen(3000, '127.0.0.1');
}

bootstrap();
