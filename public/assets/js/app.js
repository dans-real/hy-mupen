/* ══════════════════════════════════════════════════════════
   HyMupen — Logika aplikasi utama
   ══════════════════════════════════════════════════════════ */

function $(id) { return document.getElementById(id); }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function toast(msg, type = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + (type || '');
  t.textContent = msg;
  $('toasts').appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 250); }, 2800);
}
function openSheet(id) { $(id).classList.add('on'); }
function closeSheet(id) { $(id).classList.remove('on'); }
function shClick(e, id) { if (e.target === $(id)) closeSheet(id); }

const statusLabel = { baik: 'Baik', peringatan: 'Perhatian', kritis: 'Kritis' };
const statusClass = { baik: 'ok', peringatan: 'warn', kritis: 'crit' };

/* ═══════════════ STATE ═══════════════ */
let ME = null;           // {id, username, nama_lengkap, role}
let curTab = '';
let LAHAN = [];           // daftar petak (punya sendiri / semua, tergantung role)
let SEL = null;           // id petak terpilih (petani)
let notifUnread = 0;
let tickTimer = null;

/* ═══════════════ INIT ═══════════════ */
(async function init() {
  const r = await apiGet('auth/session.php');
  if (!r.ok || !r.logged_in) { window.location.href = 'login.html'; return; }
  ME = r.user;

  const badge = $('tb-badge');
  badge.textContent = ME.role === 'petani' ? 'Petani' : 'Penyuluh';
  badge.className = 'tb-badge ' + (ME.role === 'petani' ? 'badge-petani' : 'badge-penyuluh');

  buildNav();
  await loadLahan();
  goTab(ME.role === 'petani' ? 'beranda' : 'ringkasan');
  refreshNotifPip();

  if (ME.role === 'petani') {
    tickTimer = setInterval(sensorTick, 8000);
  }
})();

async function handleLogout() {
  if (tickTimer) clearInterval(tickTimer);
  await apiPost('auth/logout.php');
  window.location.href = 'login.html';
}

/* ═══════════════ NAV ═══════════════ */
const NAVS = {
  petani:   [
    { id: 'beranda',    ico: '🏡', lbl: 'Beranda' },
    { id: 'lahan',      ico: '🌾', lbl: 'Lahan' },
    { id: 'prediksi',   ico: '🔮', lbl: 'Prediksi' },
    { id: 'notifikasi', ico: '🔔', lbl: 'Notifikasi' },
  ],
  penyuluh: [
    { id: 'ringkasan', ico: '📊', lbl: 'Ringkasan' },
    { id: 'petani',    ico: '🧑‍🌾', lbl: 'Petani' },
    { id: 'notifikasi',ico: '🔔', lbl: 'Notifikasi' },
  ],
};

function buildNav() {
  const items = NAVS[ME.role] || [];
  $('bnav').innerHTML = items.map(n => `
    <button class="bn" id="bn-${n.id}" onclick="goTab('${n.id}')">
      <span class="bn-ico">${n.ico}</span>
      <span class="bn-lbl">${n.lbl}</span>
    </button>`).join('');

  $('sidebar').innerHTML = `
    <div style="padding:8px 10px 16px">
      <div style="font-size:12px;font-weight:700;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em">Menu</div>
    </div>
    ${items.map(n => `<button class="sb-link" id="sb-${n.id}" onclick="goTab('${n.id}')"><span class="si">${n.ico}</span>${n.lbl}</button>`).join('')}
    <div style="margin-top:20px;padding:12px;background:var(--mist);border-radius:var(--r2)">
      <div style="font-size:12px;color:var(--ink-3)">Masuk sebagai</div>
      <div style="font-weight:700;font-size:14px;color:var(--leaf);margin-top:2px">${esc(ME.nama_lengkap)}</div>
    </div>`;
}

function goTab(id) {
  curTab = id;
  render(id);
  document.querySelectorAll('.bn').forEach(b => b.classList.remove('on'));
  document.querySelectorAll('.sb-link').forEach(s => s.classList.remove('on'));
  $('bn-' + id)?.classList.add('on');
  $('sb-' + id)?.classList.add('on');
  $('scroll-area').scrollTop = 0;
}

const ROUTES = {
  beranda: renderBeranda, lahan: renderLahan, prediksi: renderPrediksi,
  notifikasi: renderNotifikasi, ringkasan: renderRingkasan, petani: renderPetaniList,
};
function render(id) {
  const pm = $('page-mount');
  if (ROUTES[id]) ROUTES[id](pm);
  else pm.innerHTML = '<div class="empty-state"><div class="ico">🌿</div><p>Halaman tidak ditemukan</p></div>';
}

/* ═══════════════ DATA ═══════════════ */
async function loadLahan() {
  const r = await apiGet('lahan/list.php');
  if (r.ok) {
    LAHAN = r.data;
    if (ME.role === 'petani' && !SEL && LAHAN.length) SEL = LAHAN[0].id;
  }
  return r.ok;
}

async function sensorTick() {
  const r = await apiPost('sensor/tick.php');
  if (!r.ok) return;
  r.data.forEach(updated => {
    const idx = LAHAN.findIndex(l => l.id === updated.id);
    if (idx > -1) LAHAN[idx] = { ...LAHAN[idx], ...updated };
  });
  if (r.notifikasi_baru?.length) {
    refreshNotifPip();
    if (curTab === 'beranda' || curTab === 'lahan') render(curTab);
  }
}

async function refreshNotifPip() {
  const r = await apiGet('notifikasi/list.php');
  if (!r.ok) return;
  notifUnread = r.data.filter(n => !n.dibaca).length;
  $('notif-pip').classList.toggle('on', notifUnread > 0);
}

/* ═══════════════════════════════════════
   PETANI — BERANDA
═══════════════════════════════════════ */
function renderBeranda(el) {
  if (!LAHAN.length) {
    el.innerHTML = `
      <div class="page-head"><h2>Beranda</h2></div>
      <div class="empty-state">
        <div class="ico">🌾</div>
        <p>Belum ada petak lahan. Tambahkan dulu di menu <b>Lahan</b>.</p>
      </div>`;
    return;
  }
  if (!SEL || !LAHAN.find(l => l.id === SEL)) SEL = LAHAN[0].id;
  const f = LAHAN.find(l => l.id === SEL);
  const st = f.status;
  const msg = {
    baik: 'Kelembapan tanah dalam kondisi baik. Tidak perlu tindakan saat ini.',
    peringatan: 'Kelembapan mendekati ambang batas. Pertimbangkan irigasi segera.',
    kritis: 'Kelembapan sangat rendah. Segera jalankan irigasi untuk mencegah kerusakan tanaman.',
  }[st];

  el.innerHTML = `
    <div class="page-head">
      <h2>Halo, ${esc(ME.nama_lengkap.split(' ')[0])} 👋</h2>
      <p>Pantau kondisi lahan kamu hari ini</p>
    </div>

    ${LAHAN.length > 1 ? `
    <div style="display:flex;gap:8px;overflow-x:auto;margin-bottom:14px;padding-bottom:2px">
      ${LAHAN.map(l => `
        <button onclick="SEL=${l.id};render('beranda')"
          style="flex-shrink:0;padding:8px 14px;border-radius:20px;border:1.5px solid ${l.id === SEL ? 'var(--leaf)' : 'var(--bdr2)'};
                 background:${l.id === SEL ? 'var(--mist)' : 'var(--surf)'};color:${l.id === SEL ? 'var(--leaf)' : 'var(--ink-3)'};
                 font-size:13px;font-weight:700">${esc(l.kode)}</button>`).join('')}
    </div>` : ''}

    <div class="status-card ${statusClass[st]}">
      <div class="sc-top">
        <div>
          <div class="sc-label">${esc(f.nama)} · ${esc(f.jenis_tanaman)}</div>
          <div class="sc-vwc">${Number(f.vwc).toFixed(0)}<small>% VWC</small></div>
        </div>
        <div class="sc-temp">🌡️ ${Number(f.suhu).toFixed(1)}°C</div>
      </div>
      <div class="sc-msg">${msg}</div>
    </div>

    <button class="btn-irigasi" onclick="openIrigasiConfirm(${f.id})">
      💧 Jalankan Irigasi Sekarang
    </button>

    <div class="card">
      <div class="card-title">📋 Ringkasan petak lain</div>
      ${LAHAN.filter(l => l.id !== SEL).map(l => `
        <div class="field-row" onclick="SEL=${l.id};render('beranda')" style="margin-bottom:8px">
          <div class="fr-dot dot-${statusClass[l.status]}"></div>
          <div class="fr-body">
            <div class="fr-name">${esc(l.kode)} — ${esc(l.nama)}</div>
            <div class="fr-sub">${esc(l.jenis_tanaman)}</div>
          </div>
          <div class="fr-vwc ${statusClass[l.status]}">${Number(l.vwc).toFixed(0)}%</div>
        </div>`).join('') || '<p style="font-size:13px;color:var(--ink-3)">Hanya ada satu petak.</p>'}
    </div>`;
}

function openIrigasiConfirm(lahanId) {
  const f = LAHAN.find(l => l.id === lahanId);
  if (!f) return;
  $('irigasi-detail').textContent =
    `Petak ${f.kode} (${f.nama}) akan menerima ${f.dosis_hidrogel}g hidrogel. Kelembapan saat ini ${Number(f.vwc).toFixed(0)}%.`;
  $('btn-confirm-irigasi').dataset.lahanId = lahanId;
  openSheet('ov-irigasi');
}

async function confirmIrigasi() {
  const lahanId = Number($('btn-confirm-irigasi').dataset.lahanId);
  const btn = $('btn-confirm-irigasi');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';

  const r = await apiPost('irigasi/trigger.php', { lahan_id: lahanId });

  btn.disabled = false; btn.textContent = 'Ya, jalankan';
  closeSheet('ov-irigasi');

  if (!r.ok) { toast('⚠️ ' + (r.error || 'Gagal menjalankan irigasi.'), 'red'); return; }
  toast('✅ Irigasi berhasil dijalankan', 'green');
  await loadLahan();
  render(curTab);
}

/* ═══════════════════════════════════════
   PETANI — LAHAN (CRUD)
═══════════════════════════════════════ */
function renderLahan(el) {
  el.innerHTML = `
    <div class="page-head">
      <h2>Petak Lahan</h2>
      <p>${LAHAN.length} petak terdaftar</p>
    </div>
    ${LAHAN.length ? LAHAN.map(l => `
      <div class="field-row" onclick="openLahanForm('edit',${l.id})">
        <div class="fr-dot dot-${statusClass[l.status]}"></div>
        <div class="fr-body">
          <div class="fr-name">${esc(l.kode)} — ${esc(l.nama)}</div>
          <div class="fr-sub">${esc(l.jenis_tanaman)} · Ambang ${Number(l.ambang_vwc).toFixed(0)}%</div>
        </div>
        <div class="fr-vwc ${statusClass[l.status]}">${Number(l.vwc).toFixed(0)}%</div>
      </div>`).join('') : `
      <div class="empty-state">
        <div class="ico">🌾</div>
        <p>Belum ada petak lahan.<br>Ketuk tombol + untuk menambahkan.</p>
      </div>`}
    <button class="fab" onclick="openLahanForm('add')" title="Tambah petak">+</button>`;
}

function openLahanForm(mode, lahanId) {
  $('form-lahan').reset();
  $('lf-id').value = '';
  $('lf-delete-btn').style.display = 'none';

  if (mode === 'edit') {
    const l = LAHAN.find(x => x.id === lahanId);
    if (!l) return;
    $('lahan-form-title').textContent = 'Edit petak lahan';
    $('lf-id').value = l.id;
    $('lf-kode').value = l.kode; $('lf-kode').disabled = true;
    $('lf-nama').value = l.nama;
    $('lf-jenis').value = l.jenis_tanaman;
    $('lf-lokasi').value = l.lokasi || '';
    $('lf-ambang').value = l.ambang_vwc;
    $('lf-dosis').value = l.dosis_hidrogel;
    $('lf-delete-btn').style.display = 'block';
  } else {
    $('lahan-form-title').textContent = 'Tambah petak lahan';
    $('lf-kode').disabled = false;
  }
  openSheet('ov-lahan');
}

$('form-lahan').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('lf-id').value;
  const payload = {
    kode: $('lf-kode').value.trim().toUpperCase(),
    nama: $('lf-nama').value.trim(),
    jenis_tanaman: $('lf-jenis').value.trim(),
    lokasi: $('lf-lokasi').value.trim(),
    ambang_vwc: Number($('lf-ambang').value),
    dosis_hidrogel: Number($('lf-dosis').value),
  };

  const btn = $('lf-submit-btn');
  btn.disabled = true; btn.textContent = 'Menyimpan...';

  let r;
  if (id) { payload.id = Number(id); r = await apiPost('lahan/update.php', payload); }
  else { r = await apiPost('lahan/create.php', payload); }

  btn.disabled = false; btn.textContent = 'Simpan';

  if (!r.ok) { toast('⚠️ ' + (r.error || 'Gagal menyimpan.'), 'red'); return; }
  toast(id ? '✅ Petak berhasil diperbarui' : '✅ Petak berhasil ditambahkan', 'green');
  closeSheet('ov-lahan');
  await loadLahan();
  render(curTab);
});

async function handleDeleteLahan() {
  const id = Number($('lf-id').value);
  if (!id) return;
  if (!confirm('Hapus petak lahan ini? Semua riwayat sensor & irigasinya juga akan terhapus.')) return;

  const r = await apiPost('lahan/delete.php', { id });
  if (!r.ok) { toast('⚠️ ' + (r.error || 'Gagal menghapus.'), 'red'); return; }
  toast('🗑️ Petak berhasil dihapus', 'green');
  closeSheet('ov-lahan');
  if (SEL === id) SEL = null;
  await loadLahan();
  render(curTab);
}

/* ═══════════════════════════════════════
   PETANI — PREDIKSI
═══════════════════════════════════════ */
async function renderPrediksi(el) {
  if (!LAHAN.length) {
    el.innerHTML = `<div class="page-head"><h2>Prediksi</h2></div>
      <div class="empty-state"><div class="ico">🔮</div><p>Tambahkan petak lahan dulu untuk melihat prediksi.</p></div>`;
    return;
  }
  if (!SEL || !LAHAN.find(l => l.id === SEL)) SEL = LAHAN[0].id;

  el.innerHTML = `
    <div class="page-head">
      <h2>Prediksi Kekeringan</h2>
      <p>Perkiraan kelembapan 7 hari ke depan</p>
    </div>
    <div style="display:flex;gap:8px;overflow-x:auto;margin-bottom:14px">
      ${LAHAN.map(l => `
        <button onclick="SEL=${l.id};renderPrediksi($('page-mount'))"
          style="flex-shrink:0;padding:8px 14px;border-radius:20px;border:1.5px solid ${l.id === SEL ? 'var(--leaf)' : 'var(--bdr2)'};
                 background:${l.id === SEL ? 'var(--mist)' : 'var(--surf)'};color:${l.id === SEL ? 'var(--leaf)' : 'var(--ink-3)'};
                 font-size:13px;font-weight:700">${esc(l.kode)}</button>`).join('')}
    </div>
    <div class="card" id="prediksi-box"><p style="font-size:13px;color:var(--ink-3)">Memuat prediksi...</p></div>`;

  const r = await apiGet(`prediksi/kekeringan.php?lahan_id=${SEL}&horizon=7`);
  const box = $('prediksi-box');
  if (!r.ok) { box.innerHTML = `<p style="font-size:13px;color:var(--red)">${esc(r.error || 'Gagal memuat prediksi.')}</p>`; return; }

  const risikoPill = { rendah: 'ok', sedang: 'warn', tinggi: 'crit' }[r.risiko];
  const max = Math.max(...r.perkiraan, 60);
  box.innerHTML = `
    <div class="card-title">📈 Perkiraan VWC · risiko <span class="pill pill-${risikoPill}" style="margin-left:2px">${r.risiko}</span></div>
    <div style="display:flex;align-items:flex-end;gap:8px;height:110px;margin:14px 0 8px">
      ${r.perkiraan.map((v, i) => `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px">
          <div style="font-size:10.5px;color:var(--ink-3)">${v}%</div>
          <div style="width:100%;border-radius:5px 5px 0 0;background:var(--${v < 30 ? 'red' : v < 45 ? 'amber' : 'sprout'});
                      height:${Math.max(6, (v / max) * 80)}px"></div>
          <div style="font-size:10px;color:var(--ink-4)">H+${i + 1}</div>
        </div>`).join('')}
    </div>
    ${r.catatan ? `<p style="font-size:12px;color:var(--ink-3);margin-top:8px">ℹ️ ${esc(r.catatan)}</p>` : ''}`;
}

/* ═══════════════════════════════════════
   NOTIFIKASI (petani & penyuluh)
═══════════════════════════════════════ */
async function renderNotifikasi(el) {
  el.innerHTML = `<div class="page-head"><h2>Notifikasi</h2></div><div id="notif-list"><p style="font-size:13px;color:var(--ink-3)">Memuat...</p></div>`;
  const r = await apiGet('notifikasi/list.php');
  const list = $('notif-list');
  if (!r.ok || !r.data.length) {
    list.innerHTML = `<div class="empty-state"><div class="ico">🔔</div><p>Belum ada notifikasi.</p></div>`;
    return;
  }
  const ico = { kritis: '🚨', peringatan: '⚠️', sukses: '✅', info: 'ℹ️' };
  list.innerHTML = r.data.map(n => `
    <div class="notif-item ${n.dibaca ? '' : 'unread'}">
      <div class="ni-ico">${ico[n.tipe] || 'ℹ️'}</div>
      <div style="flex:1">
        <div class="ni-title">${esc(n.judul)}</div>
        <div class="ni-body">${esc(n.isi)}</div>
        <div class="ni-time">${formatWaktu(n.dibuat_pada)}</div>
      </div>
    </div>`).join('');

  const unreadIds = r.data.filter(n => !n.dibaca).map(n => n.id);
  for (const id of unreadIds) await apiPost('notifikasi/baca.php', { id });
  refreshNotifPip();
}

function formatWaktu(sqlDatetime) {
  const d = new Date(sqlDatetime.replace(' ', 'T'));
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  if (diffMin < 1440) return `${Math.round(diffMin / 60)} jam lalu`;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

/* ═══════════════════════════════════════
   PENYULUH — RINGKASAN
═══════════════════════════════════════ */
async function renderRingkasan(el) {
  el.innerHTML = `<div class="page-head"><h2>Ringkasan</h2><p>Kondisi lahan binaan hari ini</p></div>
    <div id="ringkasan-box"><p style="font-size:13px;color:var(--ink-3)">Memuat...</p></div>`;

  const r = await apiGet('penyuluh/ringkasan.php');
  const box = $('ringkasan-box');
  if (!r.ok) { box.innerHTML = `<p style="color:var(--red);font-size:13px">${esc(r.error)}</p>`; return; }

  box.innerHTML = `
    <div class="stat-grid">
      <div class="stat-box"><div class="sv">${r.total_petani}</div><div class="sl">Petani binaan</div></div>
      <div class="stat-box"><div class="sv">${r.total_lahan}</div><div class="sl">Total petak lahan</div></div>
      <div class="stat-box crit"><div class="sv">${r.kritis}</div><div class="sl">Petak kritis</div></div>
      <div class="stat-box warn"><div class="sv">${r.peringatan}</div><div class="sl">Perlu perhatian</div></div>
    </div>
    <div class="card">
      <div class="card-title">🚨 Petak yang perlu ditindaklanjuti</div>
      ${LAHAN.filter(l => l.status !== 'baik').map(l => `
        <div class="field-row">
          <div class="fr-dot dot-${statusClass[l.status]}"></div>
          <div class="fr-body">
            <div class="fr-name">${esc(l.kode)} — ${esc(l.pemilik)}</div>
            <div class="fr-sub">${esc(l.jenis_tanaman)} · ${esc(l.lokasi || '-')}</div>
          </div>
          <div class="fr-vwc ${statusClass[l.status]}">${Number(l.vwc).toFixed(0)}%</div>
        </div>`).join('') || '<p style="font-size:13px;color:var(--ink-3)">Semua petak dalam kondisi baik ✅</p>'}
    </div>`;
}

/* ═══════════════════════════════════════
   PENYULUH — DAFTAR PETANI
═══════════════════════════════════════ */
async function renderPetaniList(el) {
  el.innerHTML = `<div class="page-head"><h2>Petani Binaan</h2></div><div id="petani-box"><p style="font-size:13px;color:var(--ink-3)">Memuat...</p></div>`;
  const r = await apiGet('penyuluh/petani.php');
  const box = $('petani-box');
  if (!r.ok) { box.innerHTML = `<p style="color:var(--red);font-size:13px">${esc(r.error)}</p>`; return; }
  if (!r.data.length) { box.innerHTML = `<div class="empty-state"><div class="ico">🧑‍🌾</div><p>Belum ada petani terdaftar.</p></div>`; return; }

  box.innerHTML = r.data.map(p => `
    <div class="card">
      <div class="card-title">🧑‍🌾 ${esc(p.nama_lengkap)} ${p.telepon ? `· 📞 ${esc(p.telepon)}` : ''}</div>
      ${p.lahan.length ? p.lahan.map(l => `
        <div class="field-row" style="cursor:default">
          <div class="fr-dot dot-${statusClass[l.status]}"></div>
          <div class="fr-body">
            <div class="fr-name">${esc(l.kode)} — ${esc(l.nama)}</div>
            <div class="fr-sub">${esc(l.jenis_tanaman)}</div>
          </div>
          <div class="fr-vwc ${statusClass[l.status]}">${Number(l.vwc).toFixed(0)}%</div>
        </div>`).join('') : '<p style="font-size:12.5px;color:var(--ink-3)">Belum ada petak lahan.</p>'}
    </div>`).join('');
}
