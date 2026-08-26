<?php
require '../../config/database.php';
require '../../config/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['ok' => false, 'error' => 'Method tidak diizinkan.'], 405);
}

$in       = json_input();
$username = trim($in['username'] ?? '');
$password = (string) ($in['password'] ?? '');

if ($username === '' || $password === '') {
    respond(['ok' => false, 'error' => 'Username dan password wajib diisi.'], 400);
}

$pdo  = db();
$ip   = $_SERVER['REMOTE_ADDR'] ?? '-';
$stmt = $pdo->prepare('SELECT * FROM admins WHERE username = ?');
$stmt->execute([$username]);
$admin = $stmt->fetch();

if (!$admin || !password_verify($password, $admin['password'])) {
    $pdo->prepare('INSERT INTO login_log (username, role, status, ip_address) VALUES (?,?,?,?)')
        ->execute([$username, 'admin', 'gagal', $ip]);
    respond(['ok' => false, 'error' => 'Username atau password admin salah.'], 401);
}

session_regenerate_id(true);
$_SESSION['admin_id']       = $admin['id'];
$_SESSION['admin_username'] = $admin['username'];

$pdo->prepare('INSERT INTO login_log (username, role, status, ip_address) VALUES (?,?,?,?)')
    ->execute([$username, 'admin', 'sukses', $ip]);

respond(['ok' => true, 'admin' => ['username' => $admin['username']]]);
