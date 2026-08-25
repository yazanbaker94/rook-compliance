import { createServer } from 'node:http';
import { createYoga } from 'graphql-yoga';
import { z } from 'zod';
import { schema } from './schema.js';
import { dataStore } from './data-store.js';

const port = Number(process.env.PORT ?? 4000);
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:8081').split(',');
const yoga = createYoga({ schema, graphqlEndpoint: '/graphql', cors: { origin: allowedOrigins, credentials: true } });
const syncBodySchema = z.object({ changes: z.array(z.object({ localId: z.string(), obligationId: z.string(), inspector: z.string(), completedAt: z.string().datetime(), notes: z.string(), reading: z.string(), photoCount: z.number().int().min(0) })) });

function json(response: import('node:http').ServerResponse, status: number, data: unknown) {
  response.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': allowedOrigins[0] ?? '*' });
  response.end(JSON.stringify(data));
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  if (request.method === 'GET' && url.pathname === '/health') return json(response, 200, { status: 'ok', service: 'rook-api', time: new Date().toISOString() });
  if (request.method === 'GET' && url.pathname === '/api/mobile/bootstrap') return json(response, 200, { facilities: await dataStore.listFacilities(), obligations: await dataStore.listObligations(), submissions: await dataStore.listSubmissions(), serverTime: new Date().toISOString() });
  if (request.method === 'POST' && url.pathname === '/api/mobile/sync') {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const body = syncBodySchema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      return json(response, 200, await dataStore.syncMobile(body.changes));
    } catch (error) {
      return json(response, 400, { error: error instanceof Error ? error.message : 'Invalid sync request' });
    }
  }
  return yoga(request, response);
});

await dataStore.initialize();
server.listen(port, () => console.log(`Rook API listening on http://localhost:${port}/graphql`));
