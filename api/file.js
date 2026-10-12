// Plays or downloads a video from a private store. Only a signed-in session gets
// through; playback is handed to a short-lived address on the store itself.
import { Readable } from 'node:stream';
import { guard } from '../lib/auth.js';
import { isVideoPath, signedGetUrl, openPrivate, explain } from '../lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  if (!guard(req, res)) return;
  const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const p = String(q.p || '');
  if (!isVideoPath(p)) { res.status(400).json({ error: 'bad_path' }); return; }
  try {
    if (q.download) {
      const r = await openPrivate(req, p);
      if (!r || !r.stream) { res.status(404).json({ error: 'not_found' }); return; }
      res.statusCode = 200;
      res.setHeader('content-type', p.endsWith('.webm') ? 'video/webm' : 'video/mp4');
      res.setHeader('content-disposition', `attachment; filename="${p.split('/').pop()}"`);
      res.setHeader('cache-control', 'private, no-store');
      Readable.fromWeb(r.stream).pipe(res);
      return;
    }
    res.statusCode = 302;
    res.setHeader('location', await signedGetUrl(req, p));
    res.setHeader('cache-control', 'private, max-age=1800');
    res.end();
  } catch (e) {
    console.error('file', e);
    res.status(500).json({ error: 'store_failed', detail: explain(e) });
  }
}
