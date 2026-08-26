<?php
require '../../config/database.php';
require '../../config/helpers.php';

$s  = require_login();
$in = json_input();
$id = (int) ($in['id'] ?? 0);

$pdo = db();
$pdo->prepare('UPDATE notifikasi SET dibaca = 1 WHERE id = ? AND user_id = ?')->execute([$id, $s['user_id']]);

respond(['ok' => true]);
