//NOTE(@jimmylee)
//The one HTTP adapter for every web service route. The routes themselves are pure and live in
//three-isometric-engine/web/routes.js, and next.config.js gives them their public names.

import type { NextApiRequest, NextApiResponse } from 'next';
import { MAX_SHEET_BYTES, respond } from '@engine/web/routes';

export const config = { api: { bodyParser: false, responseLimit: false } };

//NOTE(@jimmylee)
//Stops reading at the limit, so a large upload costs no more than the limit does.
async function readBody(req: NextApiRequest): Promise<Buffer | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_SHEET_BYTES) return null;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { route, ...query } = req.query;
  const parts = Array.isArray(route) ? route : [route ?? ''];
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const body = req.method === 'POST' ? await readBody(req) : Buffer.alloc(0);
  if (body === null) {
    res.status(413).json({ error: { code: 'too_large', message: 'A sheet is under 1 MiB.' } });
    return;
  }

  const response = respond(process.cwd(), { method: req.method ?? 'GET', parts, query, body });
  for (const [name, value] of Object.entries(response.headers)) res.setHeader(name, value as string);
  res.setHeader('Content-Type', response.type);
  res.status(response.status).send(response.body);
}
