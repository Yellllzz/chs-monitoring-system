<?php
// backend/api/students.php

ob_start();
error_reporting(0);
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../models/Student.php';

ob_clean();
header("Content-Type: application/json; charset=UTF-8");

$studentModel = new Student($conn);
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $studentsList = $studentModel->getAll();
        echo json_encode(["status" => "success", "data" => $studentsList]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit();
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);

    if (empty($data['first_name']) || empty($data['last_name']) || empty($data['grade_level']) || empty($data['section'])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Please complete all required student fields."]);
        exit();
    }

    try {
        $result = $studentModel->create($data);

        if ($result['status'] === 'success') {
            echo json_encode([
                "status" => "success",
                "message" => "Student added successfully!",
                "student_id" => $result['student_id']
            ]);
        } else if ($result['status'] === 'duplicate') {
            http_response_code(409);
            echo json_encode(["status" => "error", "message" => $result['message']]);
        } else {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $result['message']]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "SQL Error: " . $e->getMessage()]);
    }
    exit();
}

if ($method === 'DELETE') {
    $rawInput = file_get_contents("php://input");
    $data = !empty($rawInput) ? json_decode($rawInput, true) : [];
    
    $studentId = $data['id'] ?? $_GET['id'] ?? null;

    if (!$studentId) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Student ID is required for archiving."]);
        exit();
    }

    try {
        $archived = $studentModel->archive($studentId);

        if ($archived) {
            echo json_encode([
                "status" => "success",
                "message" => "Student record moved to archives."
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Failed to archive student record in database."]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "SQL Error: " . $e->getMessage()]);
    }
    exit();
}

http_response_code(405);
echo json_encode(["status" => "error", "message" => "Method Not Allowed"]);
exit();
?>