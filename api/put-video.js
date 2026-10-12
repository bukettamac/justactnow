// Small videos (the usual case: a few megabytes) are stored through the server
// in one request. Larger ones use /api/upload instead.
import { guard } from '../lib/auth.js';
import { save, playUrl, explain } from '../lib/store.js';

const LIMIT = 4 * 1024 * 1024; // a function accepts request bodies up to about 4.5 MB

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  if (!guard(req, res)) return;
  const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const name = String(q.name || '');
  if (!/^[A-Za-z0-9._-]{1,120}\.(mp4|webm)$/.test(name)) { res.status(400).json({ error: 'bad_name' }); return; }
  try {
    let buf = Buffer.isBuffer(req.body) ? req.body : null;
    if (!buf) { const chunks = []; for await (const c of req) chunks.push(c); buf = Buffer.concat(chunks); }
    if (!buf.length) { res.status(400).json({ error: 'empty' }); return; }
    if (buf.length > LIMIT) { res.status(413).json({ error: 'too_large' }); return; }
    const r = await save(req, 'videos/' + name, buf, name.endsWith('.webm') ? 'video/webm' : 'video/mp4');
    res.status(200).json({ url: playUrl(r) });
  } catch (e) {
    console.error('put-video', e);
    res.status(500).json({ error: 'store_failed', detail: explain(e) });
  }
}
