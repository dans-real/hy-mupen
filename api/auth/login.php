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
$stmt = $pdo->prepare('SELECT * FROM users WHERE username = ?');
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password'])) {
    $pdo->prepare('INSERT INTO login_log (username, role, status, ip_address) VALUES (?,?,?,?)')
        ->execute([$username, $user['role'] ?? '-', 'gagal', $ip]);
    respond(['ok' => false, 'error' => 'Username atau password salah.'], 401);
}

session_regenerate_id(true);
$_SESSION['user_id']      = $user['id'];
$_SESSION['username']     = $user['username'];
$_SESSION['nama_lengkap'] = $user['nama_lengkap'];
$_SESSION['role']         = $user['role'];

$pdo->prepare('INSERT INTO login_log (username, role, status, ip_address) VALUES (?,?,?,?)')
    ->execute([$username, $user['role'], 'sukses', $ip]);

respond([
    'ok'   => true,
    'user' => [
        'id'           => $user['id'],
        'username'     => $user['username'],
        'nama_lengkap' => $user['nama_lengkap'],
        'role'         => $user['role'],
    ],
]);
