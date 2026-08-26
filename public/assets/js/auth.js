/* ══════════════════════════════════════════════════════════
   HyMupen — Logika halaman login & daftar
   ══════════════════════════════════════════════════════════ */

let regRole = 'petani';

function showForm(which) {
  const isLogin = which === 'login';
  $('form-login').style.display    = isLogin ? 'block' : 'none';
  $('form-register').style.display = isLogin ? 'none' : 'block';
  $('switch-to-register').style.display = isLogin ? 'block' : 'none';
  $('switch-to-login').style.display    = isLogin ? 'none' : 'block';
  clearAlert();
}

function $(id) { return document.getElementById(id); }

function showAlert(type, msg) {
  $('alert-box').innerHTML = `<div class="alert alert-${type}">${type === 'err' ? '⚠️' : '✅'} ${msg}</div>`;
}
function clearAlert() { $('alert-box').innerHTML = ''; }

function toast(msg, type = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + (type || '');
  t.textContent = msg;
  $('toasts').appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 250); }, 2600);
}

function setLoading(btnId, labelId, loading, text) {
  $(btnId).disabled = loading;
  $(labelId).innerHTML = loading ? '<span class="spinner"></span>' : text;
}

// ── Cek jika sudah login, langsung lempar ke app ──
(async function checkExisting() {
  const r = await apiGet('auth/session.php');
  if (r.ok && r.logged_in) window.location.href = 'app.html';
})();

// ── Role picker (daftar) ──
document.querySelectorAll('#reg-role-pick button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#reg-role-pick button').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    regRole = btn.dataset.role;
  });
});

// ── Submit login ──
$('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();
  setLoading('btn-login', 'login-label', true);

  const r = await apiPost('auth/login.php', {
    username: $('li-username').value.trim(),
    password: $('li-password').value,
  });

  setLoading('btn-login', 'login-label', false, 'Masuk');

  if (!r.ok) { showAlert('err', r.error || 'Gagal masuk.'); return; }
  window.location.href = 'app.html';
});

// ── Submit daftar ──
$('form-register').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();
  setLoading('btn-register', 'register-label', true);

  const r = await apiPost('auth/register.php', {
    username: $('rg-username').value.trim(),
    password: $('rg-password').value,
    nama_lengkap: $('rg-nama').value.trim(),
    telepon: $('rg-telepon').value.trim(),
    role: regRole,
  });

  setLoading('btn-register', 'register-label', false, 'Buat akun');

  if (!r.ok) { showAlert('err', r.error || 'Gagal mendaftar.'); return; }

  toast('✅ Akun berhasil dibuat, silakan masuk', 'green');
  showForm('login');
  $('li-username').value = $('rg-username').value.trim();
  $('form-register').reset();
});
