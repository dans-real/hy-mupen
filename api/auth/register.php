<?php
require '../../config/database.php';
require '../../config/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['ok' => false, 'error' => 'Method tidak diizinkan.'], 405);
}

$in       = json_input();
$username = trim($in['username'] ?? '');
$password = (string) ($in['password'] ?? '');
$nama     = trim($in['nama_lengkap'] ?? '');
$role     = $in['role'] ?? '';
$telepon  = trim($in['telepon'] ?? '');

if ($username === '' || $password === '' || $nama === '' || !in_array($role, ['petani', 'penyuluh'], true)) {
    respond(['ok' => false, 'error' => 'Semua field wajib diisi dengan benar.'], 400);
}
if (!preg_match('/^[a-zA-Z0-9_.]{4,30}$/', $username)) {
    respond(['ok' => false, 'error' => 'Username 4-30 karakter, hanya huruf/angka/underscore.'], 400);
}
if (strlen($password) < 6) {
    respond(['ok' => false, 'error' => 'Password minimal 6 karakter.'], 400);
}

$pdo = db();

$chk = $pdo->prepare('SELECT id FROM users WHERE username = ?');
$chk->execute([$username]);
if ($chk->fetch()) {
    respond(['ok' => false, 'error' => "Username '{$username}' sudah dipakai, coba yang lain."], 409);
}

$hash = password_hash($password, PASSWORD_DEFAULT);
$pdo->prepare('INSERT INTO users (username, password, nama_lengkap, role, telepon) VALUES (?,?,?,?,?)')
    ->execute([$username, $hash, $nama, $role, $telepon ?: null]);

$userId = (int) $pdo->lastInsertId();

if ($role === 'petani') {
    $pdo->prepare('INSERT INTO stok_hidrogel (user_id, stok_g) VALUES (?, 2400)')->execute([$userId]);
}

respond(['ok' => true, 'message' => 'Akun berhasil dibuat. Silakan login.']);
