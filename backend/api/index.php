<?php
// index.php - System Entry Redirector

header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

header("Location: login.html");
exit();
?>