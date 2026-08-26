<?php
require '../../config/database.php';
require '../../config/helpers.php';

$s   = require_login();
$pdo = db();

$stmt = $pdo->prepare('SELECT * FROM notifikasi WHERE user_id = ? ORDER BY dibuat_pada DESC LIMIT 30');
$stmt->execute([$s['user_id']]);

respond(['ok' => true, 'data' => $stmt->fetchAll()]);
