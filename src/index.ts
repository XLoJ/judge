import { build } from './app';

async function bootstrap() {
  const app = await build();

  await app.listen(app.config.PORT, app.config.HOST);
}

bootstrap();
