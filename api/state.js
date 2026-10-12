// The whole studio state (quotes, settings, presets, follower log) is one JSON
// document. Every save writes a new blob and the newest one wins, so a read
// never meets a half-written or cached copy.
import { guard } from '../lib/auth.js';
import { listAll, save, readJson, remove, knownAccess, explain } from '../lib/store.js';

const PREFIX = 'state/';
const KEEP = 3;
const newestFirst = async (req) => (await listAll(req, PREFIX)).sort((a, b) => (a.pathname < b.pathname ? 1 : -1));

export default async function handler(req, res) {
  if (!guard(req, res)) return;
  try {
    if (req.method === 'GET') {
      const blobs = await newestFirst(req);
      if (!blobs.length) { res.status(200).json({ state: null, access: await knownAccess(req) }); return; }
      res.status(200).json({ state: await readJson(req, blobs[0]), savedAt: blobs[0].uploadedAt, access: await knownAccess(req) });
      return;
    }
    if (req.method === 'PUT') {
      const state = req.body && req.body.state;
      if (!state || typeof state !== 'object' || !Array.isArray(state.Q)) { res.status(400).json({ error: 'bad_state' }); return; }
      const stamp = String(Date.now()).padStart(15, '0');
      await save(req, `${PREFIX}${stamp}.json`, JSON.stringify(state), 'application/json');
      const old = (await newestFirst(req)).slice(KEEP).map((b) => b.url);
      if (old.length) await remove(req, old).catch(() => {});
      res.status(200).json({ ok: true, access: await knownAccess(req) });
      return;
    }
    res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    console.error('state', e);
    res.status(500).json({ error: 'store_failed', detail: explain(e) });
  }
}
