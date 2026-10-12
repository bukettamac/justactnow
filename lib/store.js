// Everything that talks to the Blob store goes through here. A store is either
// public or private (chosen when it was created in Vercel); this code works with
// both and learns which one it is from the store itself.
import { put, list, del, get, issueSignedToken, presignUrl } from '@vercel/blob';
import { blobAuth } from './auth.js';

let mode = null; // 'public' | 'private' once known

export const accessOf = (url) => (/\.private\.blob\.vercel-storage\.com/.test(String(url)) ? 'private' : /\.public\.blob\.vercel-storage\.com/.test(String(url)) ? 'public' : null);
export const isVideoPath = (p) => /^videos\/[A-Za-z0-9._-]{1,160}\.(mp4|webm)$/.test(String(p));
export const explain = (e) => String((e && e.message) || e).replace(/^Vercel Blob:\s*/, '').slice(0, 300);

export async function listAll(req, prefix) {
  const { blobs } = await list({ prefix, limit: 1000, ...blobAuth(req) });
  if (blobs.length && !mode) mode = accessOf(blobs[0].url);
  return blobs;
}

export async function knownAccess(req) {
  if (!mode) { try { await listAll(req, ''); } catch (e) {} }
  return mode;
}

// Writes a blob. When the store type is not known yet, public is tried first, then private.
export async function save(req, pathname, body, contentType) {
  const order = mode ? [mode] : ['public', 'private'];
  let first;
  for (const access of order) {
    try {
      const r = await put(pathname, body, { access, addRandomSuffix: true, contentType, ...blobAuth(req) });
      mode = accessOf(r.url) || access;
      return r;
    } catch (e) { first = first || e; }
  }
  throw first;
}

export async function readJson(req, blob) {
  const access = accessOf(blob.url) || mode || 'public';
  const r = await get(blob.url, { access, useCache: false, ...blobAuth(req) });
  if (!r || !r.stream) throw new Error('read_failed');
  return JSON.parse(await new Response(r.stream).text());
}

export const remove = (req, urls) => del(urls, blobAuth(req));

// The address the page uses to play a stored video. Public blobs play from their
// own address; private ones go through /api/file, which checks the session first.
export const playUrl = (r) => (accessOf(r.url) === 'private' ? '/api/file?p=' + encodeURIComponent(r.pathname) : r.url);

export async function signedGetUrl(req, pathname) {
  const validUntil = Date.now() + 6 * 3600 * 1000;
  const token = await issueSignedToken({ pathname, operations: ['get'], validUntil, ...blobAuth(req) });
  return (await presignUrl(token, { operation: 'get', pathname, access: 'private', validUntil })).presignedUrl;
}

export const openPrivate = (req, pathname) => get(pathname, { access: 'private', ...blobAuth(req) });
