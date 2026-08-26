<?php
require '../../config/database.php';
require '../../config/helpers.php';

require_admin();
$pdo = db();

$login = $pdo->query('SELECT * FROM login_log ORDER BY waktu DESC LIMIT 50')->fetchAll();
$irigasi = $pdo->query(
    'SELECT il.*, l.kode, u.username
     FROM irigasi_log il
     JOIN lahan l ON l.id = il.lahan_id
     JOIN users u ON u.id = l.user_id
     ORDER BY il.dilakukan_pada DESC LIMIT 50'
)->fetchAll();

respond(['ok' => true, 'login_log' => $login, 'irigasi_log' => $irigasi]);
