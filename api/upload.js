// Large videos go from the browser straight to Vercel Blob. This route only
// hands out a short-lived, single-file upload permission, and only to a
// signed-in session. It speaks both flows the Blob client can use: presigned
// URLs (store connected by id) and client tokens (store with a read-write token).
import { handleUpload, handleUploadPresigned } from '@vercel/blob/client';
import { issueSignedToken } from '@vercel/blob';
import { hasPassword, hasBlob, isAuthed, blobAuth } from '../lib/auth.js';

const TYPES = ['video/mp4', 'video/webm'];
const MAX = 80 * 1024 * 1024;
const okPath = (p) => /^videos\/[A-Za-z0-9._-]{1,120}\.(mp4|webm)$/.test(String(p));

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  if (!hasPassword() || !hasBlob()) { res.status(503).json({ error: 'not_configured' }); return; }
  if (!isAuthed(req)) { res.status(401).json({ error: 'unauthorized' }); return; }
  const body = req.body || {};
  const check = (pathname) => { if (!isAuthed(req)) throw new Error('unauthorized'); if (!okPath(pathname)) throw new Error('bad_pathname'); };
  try {
    let result;
    if (body.type === 'blob.generate-client-token') {
      result = await handleUpload({
        body, request: req,
        onBeforeGenerateToken: async (pathname) => { check(pathname); return { allowedContentTypes: TYPES, maximumSizeInBytes: MAX, addRandomSuffix: true }; },
      });
    } else {
      result = await handleUploadPresigned({
        body, request: req,
        getSignedToken: async (pathname) => {
          check(pathname);
          const validUntil = Date.now() + 15 * 60 * 1000;
          const token = await issueSignedToken({ pathname, operations: ['put'], validUntil, allowedContentTypes: TYPES, maximumSizeInBytes: MAX, ...blobAuth(req) });
          return { token, urlOptions: { validUntil, allowedContentTypes: TYPES, maximumSizeInBytes: MAX, addRandomSuffix: true } };
        },
      });
    }
    res.status(200).json(result);
  } catch (e) {
    const msg = String((e && e.message) || e);
    res.status(msg === 'unauthorized' ? 401 : 400).json({ error: msg.slice(0, 300) });
  }
}
