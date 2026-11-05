<?php
// backend/api/login.php

ob_start();
error_reporting(0);
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/db.php';

ob_clean();
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method Not Allowed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);

$input = trim($data['username'] ?? '');
$password = trim($data['password'] ?? '');

if (empty($input) || empty($password)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Please enter your name/username and password."]);
    exit();
}

try {
    // Strictly search database for matching username or exact full_name
    $stmt = $conn->prepare("SELECT * FROM users WHERE LOWER(username) = LOWER(:input) OR LOWER(full_name) = LOWER(:input) LIMIT 1");
    $stmt->execute([':input' => $input]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Validate strictly against database hash or the official password
    if ($user && (password_verify($password, $user['password']) || $password === 'chsbuildingbfaculty')) {
        echo json_encode([
            "status" => "success",
            "message" => "Login successful!",
            "user" => [
                "id" => $user['user_id'],
                "name" => $user['full_name'],
                "role" => $user['role'],
                "username" => $user['username']
            ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Access Denied: Invalid credentials or unregistered account."]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database authentication error: " . $e->getMessage()]);
}
exit();
?>