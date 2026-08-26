<?php
require '../../config/helpers.php';

unset($_SESSION['admin_id'], $_SESSION['admin_username']);

respond(['ok' => true, 'message' => 'Berhasil keluar dari panel admin.']);
