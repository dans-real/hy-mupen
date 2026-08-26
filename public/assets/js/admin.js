/* ══════════════════════════════════════════════════════════
   HyMupen — Logika panel admin/dev
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

let adminTab = 'sensor';

$('form-admin-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('btn-admin-login');
  btn.disabled = true; $('admin-login-label').innerHTML = '<span class="spinner"></span>';
  $('admin-alert').innerHTML = '';

  const r = await apiPost('auth/admin_login.php', {
    username: $('ad-username').value.trim(),
    password: $('ad-password').value,
  });

  btn.disabled = false; $('admin-login-label').textContent = 'Masuk';

  if (!r.ok) {
    $('admin-alert').innerHTML = `<div class="alert alert-err">⚠️ ${esc(r.error || 'Gagal masuk.')}</div>`;
    return;
  }
  enterPanel();
});

async function adminLogout() {
  await apiPost('admin/logout.php');
  window.location.reload();
}

function enterPanel() {
  $('admin-login-shell').style.display = 'none';
  $('admin-panel').style.display = 'block';
  showAdminTab('sensor');
}

function showAdminTab(tab) {
  adminTab = tab;
  $('at-sensor').classList.toggle('on', tab === 'sensor');
  $('at-log').classList.toggle('on', tab === 'log');
  tab === 'sensor' ? loadSensorTab() : loadLogTab();
}

async function loadSensorTab() {
  const box = $('admin-content');
  box.innerHTML = '<p style="font-size:13px;color:var(--ink-3)">Memuat...</p>';
  const r = await apiGet('admin/sensor.php');
  if (!r.ok) { box.innerHTML = `<p style="color:var(--red);font-size:13px">${esc(r.error)}</p>`; return; }

  box.innerHTML = `
    <div class="card" style="overflow-x:auto">
      <table>
        <thead><tr>
          <th>Kode</th><th>Pemilik</th><th>Tanaman</th><th>VWC</th><th>Suhu</th><th>Baterai</th><th>Node</th><th>Status</th>
        </tr></thead>
        <tbody>
          ${r.data.map(l => `
            <tr>
              <td><b>${esc(l.kode)}</b></td>
              <td>${esc(l.pemilik)}</td>
              <td>${esc(l.jenis_tanaman)}</td>
              <td>${Number(l.vwc).toFixed(2)}%</td>
              <td>${Number(l.suhu).toFixed(1)}°C</td>
              <td>${l.baterai}%</td>
              <td>${esc(l.node_sensor || '-')}</td>
              <td><span class="pill pill-${{baik:'ok',peringatan:'warn',kritis:'crit'}[l.status]}">${l.status}</span></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

async function loadLogTab() {
  const box = $('admin-content');
  box.innerHTML = '<p style="font-size:13px;color:var(--ink-3)">Memuat...</p>';
  const r = await apiGet('admin/log.php');
  if (!r.ok) { box.innerHTML = `<p style="color:var(--red);font-size:13px">${esc(r.error)}</p>`; return; }

  box.innerHTML = `
    <div class="card" style="overflow-x:auto">
      <div class="card-title">🔑 Percobaan login terakhir</div>
      <table>
        <thead><tr><th>Waktu</th><th>Username</th><th>Role</th><th>Status</th><th>IP</th></tr></thead>
        <tbody>
          ${r.login_log.map(l => `
            <tr>
              <td>${esc(l.waktu)}</td><td>${esc(l.username)}</td><td>${esc(l.role)}</td>
              <td><span class="pill pill-${l.status === 'sukses' ? 'ok' : 'crit'}">${l.status}</span></td>
              <td>${esc(l.ip_address || '-')}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="card" style="overflow-x:auto">
      <div class="card-title">💧 Riwayat irigasi terakhir</div>
      <table>
        <thead><tr><th>Waktu</th><th>Petak</th><th>Petani</th><th>Dosis</th><th>Dipicu</th></tr></thead>
        <tbody>
          ${r.irigasi_log.map(l => `
            <tr>
              <td>${esc(l.dilakukan_pada)}</td><td>${esc(l.kode)}</td><td>${esc(l.username)}</td>
              <td>${l.dosis_g}g</td><td>${esc(l.dipicu_oleh)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── Cek jika admin sudah login (mis. setelah refresh halaman) ──
(async function checkAdminSession() {
  // Panel admin pakai session terpisah (admin_id), bukan session pengguna biasa,
  // jadi kita coba panggil endpoint yang butuh admin dan lihat responsnya.
  const r = await apiGet('admin/sensor.php');
  if (r.ok) enterPanel();
})();
