<?php
require '../../config/helpers.php';

if (empty($_SESSION['user_id'])) {
    respond(['ok' => true, 'logged_in' => false]);
}

respond([
    'ok'        => true,
    'logged_in' => true,
    'user'      => [
        'id'           => $_SESSION['user_id'],
        'username'     => $_SESSION['username'],
        'nama_lengkap' => $_SESSION['nama_lengkap'],
        'role'         => $_SESSION['role'],
    ],
]);
