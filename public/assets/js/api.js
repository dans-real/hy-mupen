/* ══════════════════════════════════════════════════════════
   HyMupen — API helper
   Semua panggilan ke backend PHP lewat sini. Sesuaikan API_BASE
   jika struktur folder deploy kamu berbeda.
   ══════════════════════════════════════════════════════════ */
const API_BASE = '../api';

async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}/${path}`, {
    credentials: 'include',
    headers: opts.body ? { 'Content-Type': 'application/json' } : {},
    ...opts,
  });
  let data;
  try { data = await res.json(); }
  catch { data = { ok: false, error: 'Respons server tidak valid.' }; }
  return { status: res.status, ...data };
}

const apiGet  = (path) => api(path);
const apiPost = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body || {}) });
