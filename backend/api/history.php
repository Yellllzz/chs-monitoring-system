<?php
// backend/api/history.php

ob_start();
error_reporting(0);
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../models/HistoryModel.php';

ob_clean();
header("Content-Type: application/json; charset=UTF-8");

$historyModel = new HistoryModel($conn);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $logs = $historyModel->getAll();
        echo json_encode(["status" => "success", "data" => $logs]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit();
}

http_response_code(405);
echo json_encode(["status" => "error", "message" => "Method Not Allowed"]);
exit();
?>