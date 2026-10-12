// Removes a stored video when it is replaced by a newer export.
import { guard } from '../lib/auth.js';
import { isVideoPath, listAll, remove, explain } from '../lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  if (!guard(req, res)) return;
  const given = String((req.body && req.body.delete) || '');
  try {
    let target = null;
    if (given.startsWith('/api/file?')) { // private store: find the blob by its path
      const p = new URLSearchParams(given.slice(10)).get('p') || '';
      if (isVideoPath(p)) { const hit = (await listAll(req, p)).find((b) => b.pathname === p); target = hit ? hit.url : null; }
    } else {
      const u = new URL(given);
      if (u.protocol === 'https:' && u.hostname.endsWith('.blob.vercel-storage.com') && u.pathname.startsWith('/videos/')) target = u.origin + u.pathname;
    }
    if (!target) { res.status(400).json({ error: 'bad_url' }); return; }
    await remove(req, target);
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('video', e);
    res.status(e instanceof TypeError ? 400 : 500).json({ error: 'store_failed', detail: explain(e) });
  }
}
