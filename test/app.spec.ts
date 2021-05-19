import { FastifyInstance } from 'fastify';
import { build } from '../src/app';
import * as assert from 'assert';

describe('Test app', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await build();
  });

  test('Hello', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/'
    });
    assert.strictEqual(
      response.statusCode,
      200,
      'returns a status code of 200'
    );
  });
});
