import type { Plugin } from 'vite';
import type { IncomingMessage } from 'node:http';
import { SimulatedAccountVerificationProvider } from '../src/domain/proof/accountVerification';
import { createCheckHandler, createProofHandler, createReportHandler, createTransactionHandler } from './handlers';
import { randomProofId, sha256Hex } from './crypto';
import { InMemoryProofRepository, InMemoryReportRepository } from './repositories';
import { MemoryRateLimiter } from './rateLimit';

async function requestFromNode(req: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const body = Buffer.concat(chunks);
  return new Request(`http://localhost${req.url ?? '/'}`, {
    method: req.method,
    headers: Object.fromEntries(Object.entries(req.headers).flatMap(([key, value]) => (value ? [[key, Array.isArray(value) ? value.join(', ') : value]] : []))),
    body: body.length > 0 ? body : undefined,
    duplex: 'half',
  } as RequestInit);
}

export function viteApiPlugin(): Plugin {
  const deps = {
    reports: new InMemoryReportRepository(),
    proofs: new InMemoryProofRepository(),
    avs: new SimulatedAccountVerificationProvider(),
    rateLimiter: new MemoryRateLimiter(),
    now: () => new Date(),
    newProofId: randomProofId,
    hash: sha256Hex,
  };
  const check = createCheckHandler(deps);
  const report = createReportHandler(deps);
  const proof = createProofHandler(deps);
  const transaction = createTransactionHandler(deps);

  return {
    name: 'trustshield-e2e-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          next();
          return;
        }
        const request = await requestFromNode(req);
        const url = new URL(request.url);
        const context = { ip: req.socket.remoteAddress, params: { id: url.pathname.split('/').pop() ?? '', key: url.pathname.split('/').pop() ?? '' } };
        const response = url.pathname === '/api/check'
          ? await check(request, context)
          : url.pathname === '/api/report' || url.pathname.startsWith('/api/reports/')
            ? await report(request, context)
            : url.pathname === '/api/proof/create' || url.pathname.startsWith('/api/proof/')
              ? await proof(request, context)
              : url.pathname === '/api/transaction/check'
                ? await transaction(request, context)
                : new Response('Not found', { status: 404 });
        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(Buffer.from(await response.arrayBuffer()));
      });
    },
  };
}