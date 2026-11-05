<?php
// backend/api/cases.php

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
require_once __DIR__ . '/../models/CaseModel.php';
require_once __DIR__ . '/../config/sms.php';

ob_clean();
header("Content-Type: application/json; charset=UTF-8");

$caseModel = new CaseModel($conn);
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $cases = $caseModel->getAll();
        echo json_encode(["status" => "success", "data" => $cases]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit();
}

if ($method === 'POST') {
    // 1. Check for Late Narrative Upload via FormData
    if (isset($_POST['action']) && $_POST['action'] === 'upload_narrative') {
        $caseIdVal = $_POST['case_id'] ?? null;

        if (!$caseIdVal || !isset($_FILES['narrative_file']) || $_FILES['narrative_file']['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Please select a valid narrative report file."]);
            exit();
        }

        $fileName = $_FILES['narrative_file']['name'];
        $fileTmpPath = $_FILES['narrative_file']['tmp_name'];
        $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

        $allowed = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
        if (!in_array($fileExtension, $allowed)) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Invalid file format."]);
            exit();
        }

        $uploadDir = __DIR__ . '/../uploads/';
        if (!file_exists($uploadDir)) @mkdir($uploadDir, 0777, true);

        $newFileName = 'narrative_' . time() . '_' . rand(100, 999) . '.' . $fileExtension;
        $destPath = $uploadDir . $newFileName;

        if (move_uploaded_file($fileTmpPath, $destPath)) {
            $narrativeFilePath = 'uploads/' . $newFileName;

            $stmt = $conn->prepare("UPDATE cases SET narrative_report = :filepath WHERE id = :case_id OR case_no = :case_id");
            $stmt->execute([':filepath' => $narrativeFilePath, ':case_id' => $caseIdVal]);

            echo json_encode(["status" => "success", "message" => "Narrative report attached successfully!"]);
        } else {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Failed to save file."]);
        }
        exit();
    }

    // Process JSON input for Status Updates & SMS Dispatches
    $inputRaw = file_get_contents("php://input");
    $inputJson = !empty($inputRaw) ? json_decode($inputRaw, true) : null;

    // 2. Action: Update Case Status
    if ($inputJson && isset($inputJson['action']) && $inputJson['action'] === 'update_status') {
        try {
            $caseIdVal = $inputJson['case_id'] ?? null;
            $newStatus = $inputJson['status'] ?? null;

            if (!$caseIdVal || !$newStatus) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Case ID and Status required."]);
                exit();
            }

            $updated = $caseModel->updateStatus($caseIdVal, $newStatus);
            echo json_encode(["status" => "success", "message" => "Case status updated to {$newStatus}."]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "SQL Error: " . $e->getMessage()]);
        }
        exit();
    }

    // 3. Action: Send Manual SMS Notice to Parent (JOINs sanctions table to retrieve sanction_type)
    if ($inputJson && isset($inputJson['action']) && $inputJson['action'] === 'send_sms_notice') {
        $caseIdVal = $inputJson['case_id'] ?? null;

        if (!$caseIdVal) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Case ID is required."]);
            exit();
        }

        try {
            $stmt = $conn->prepare("
                SELECT c.case_no, c.incident_type, 
                       san.sanction_type, 
                       s.first_name, s.last_name, s.guardian_contact, s.guardian_name
                FROM cases c
                JOIN students s ON c.student_id = s.id
                LEFT JOIN sanctions san ON san.case_id = c.id
                WHERE c.id = :id OR c.case_no = :id
                LIMIT 1
            ");
            $stmt->execute([':id' => $caseIdVal]);
            $info = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($info && !empty($info['guardian_contact'])) {
                $studentName = trim($info['first_name'] . ' ' . $info['last_name']);
                $sanction = !empty($info['sanction_type']) ? $info['sanction_type'] : 'Under Assessment';
                $msg = "Caloocan High School Notice: Disciplinary record ({$info['case_no']}) regarding student {$studentName} for {$info['incident_type']}. Sanction: {$sanction}. Please contact the Guidance Office.";

                if (function_exists('sendSMS')) {
                    sendSMS($info['guardian_contact'], $msg);
                }

                echo json_encode(["status" => "success", "message" => "SMS notification sent to parent!"]);
            } else {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Guardian contact number is missing."]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "SMS Error: " . $e->getMessage()]);
        }
        exit();
    }

    // 4. Process POST FormData for Multi-Incident Case Creation
    $data = $_POST;
    if (empty($data['student_id']) || empty($data['incident_type']) || empty($data['description'])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Please select student, incident, and write description."]);
        exit();
    }

    $narrativeFilePath = null;
    if (isset($_FILES['narrative_file']) && $_FILES['narrative_file']['error'] === UPLOAD_ERR_OK) {
        $fileTmpPath = $_FILES['narrative_file']['tmp_name'];
        $fileName = $_FILES['narrative_file']['name'];
        $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

        $allowed = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
        if (in_array($fileExtension, $allowed)) {
            $uploadDir = __DIR__ . '/../uploads/';
            if (!file_exists($uploadDir)) @mkdir($uploadDir, 0777, true);
            $newFileName = 'narrative_' . time() . '_' . rand(100, 999) . '.' . $fileExtension;
            if (move_uploaded_file($fileTmpPath, $uploadDir . $newFileName)) {
                $narrativeFilePath = 'uploads/' . $newFileName;
            }
        }
    }

    $data['narrative_report'] = $narrativeFilePath;

    try {
        $caseNo = $caseModel->create($data);
        echo json_encode(["status" => "success", "message" => "Case logged successfully!", "case_no" => $caseNo]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Database Error: " . $e->getMessage()]);
    }
    exit();
}

// 5. DELETE Request Handler for Case Removal / Expungement
if ($method === 'DELETE') {
    $rawInput = file_get_contents("php://input");
    $data = !empty($rawInput) ? json_decode($rawInput, true) : [];
    
    $caseId = $data['case_id'] ?? $_GET['case_id'] ?? null;
    $reason = $data['reason'] ?? 'Mistakenly accused / Incorrect filing';

    if (!$caseId) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Case ID is required."]);
        exit();
    }

    try {
        // Fetch case and student information before deletion
        $stmtSelect = $conn->prepare("
            SELECT c.*, CONCAT(IFNULL(s.first_name,''), ' ', IFNULL(s.last_name,'')) as student_name 
            FROM cases c 
            LEFT JOIN students s ON c.student_id = s.id 
            WHERE c.id = :id OR c.case_no = :id
        ");
        $stmtSelect->execute([':id' => $caseId]);
        $caseInfo = $stmtSelect->fetch(PDO::FETCH_ASSOC);

        if ($caseInfo) {
            $dbId = $caseInfo['id'];

            // 1. Log expungement in History Logs (with null case_id)
            $stmtLog = $conn->prepare("
                INSERT INTO history_logs (case_id, action, performed_by, details, created_at) 
                VALUES (NULL, 'Case Removed (Expunged)', 'Administrator', :details, NOW())
            ");
            $stmtLog->execute([
                ':details' => "Removed Case {$caseInfo['case_no']} for {$caseInfo['student_name']}. Reason: {$reason}"
            ]);

            // 2. Delete linked sanctions and the case record
            $conn->prepare("DELETE FROM sanctions WHERE case_id = :id")->execute([':id' => $dbId]);
            $conn->prepare("DELETE FROM cases WHERE id = :id")->execute([':id' => $dbId]);

            echo json_encode(["status" => "success", "message" => "Case removed and expunged from student record."]);
        } else {
            http_response_code(404);
            echo json_encode(["status" => "error", "message" => "Case record not found."]);
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