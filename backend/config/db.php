<?php
// backend/config/db.php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$host     = getenv('DB_HOST') ?: 'mysql-104a3d4b-chs-monitoring-system.c.aivencloud.com';
$db_name  = getenv('DB_NAME') ?: 'defaultdb';
$username = getenv('DB_USER') ?: 'avnadmin';
$password = getenv('DB_PASSWORD') ?: 'AVNS_cugZ_aLc_dNLuRynrLM';
$port     = getenv('DB_PORT') ?: '25993';

try {
    $dsn = "mysql:host=" . $host . ";port=" . $port . ";dbname=" . $db_name . ";charset=utf8mb4";
    $conn = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status"  => "error",
        "message" => "Server connection error: " . $e->getMessage()
    ]);
    exit();
}
?>