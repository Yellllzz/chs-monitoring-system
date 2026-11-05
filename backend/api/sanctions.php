<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $sql = "SELECT s.*, c.id AS real_case_id, c.case_no, c.incident_type, 
                       CONCAT(st.first_name, ' ', st.last_name) AS student_name,
                       st.id AS student_db_id, st.grade_level, st.section
                FROM sanctions s
                JOIN cases c ON s.case_id = c.id
                JOIN students st ON c.student_id = st.id
                WHERE LOWER(s.status) = 'pending' AND LOWER(c.status) != 'closed'
                ORDER BY s.due_date ASC";
                
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $sanctions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(["status" => "success", "data" => $sanctions]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Database Error: " . $e->getMessage()]);
    }
    exit();
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);

    if (!$data) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Invalid payload."]);
        exit();
    }

    // Action: Complete Sanction & Log to history_logs table
    if (isset($data['action']) && $data['action'] === 'complete_sanction') {
        $caseVal = $data['case_id'] ?? null;
        if (!$caseVal) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Case ID required."]);
            exit();
        }

        try {
            // Find target case and student details
            $findCase = $conn->prepare("
                SELECT c.id, c.case_no, c.incident_type, CONCAT(st.first_name, ' ', st.last_name) AS student_name, st.section 
                FROM cases c 
                JOIN students st ON c.student_id = st.id 
                WHERE c.id = :val OR c.case_no = :val LIMIT 1
            ");
            $findCase->execute([':val' => $caseVal]);
            $foundCase = $findCase->fetch(PDO::FETCH_ASSOC);

            if (!$foundCase) {
                http_response_code(404);
                echo json_encode(["status" => "error", "message" => "Case record not found in database."]);
                exit();
            }

            $realCaseId = $foundCase['id'];
            $caseNo = $foundCase['case_no'];
            $studentInfo = $foundCase['student_name'] . " (" . $foundCase['section'] . ")";

            // 1. Mark sanction as Completed
            $stmtSanction = $conn->prepare("UPDATE sanctions SET status = 'Completed' WHERE case_id = :case_id");
            $stmtSanction->execute([':case_id' => $realCaseId]);

            // 2. Mark case as Closed
            $stmtCase = $conn->prepare("UPDATE cases SET status = 'Closed' WHERE id = :case_id");
            $stmtCase->execute([':case_id' => $realCaseId]);

            // 3. Insert record into history_logs table
            $logDetails = "Sanction completed for " . $studentInfo . ". Case archived.";
            $stmtLog = $conn->prepare("
                INSERT INTO history_logs (case_id, action, performed_by, details) 
                VALUES (:case_id, 'Sanction Completed', 'Administrator', :details)
            ");
            $stmtLog->execute([
                ':case_id' => $realCaseId,
                ':details' => $logDetails
            ]);

            echo json_encode(["status" => "success", "message" => "Sanction completed and saved to history logs!"]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Database Error: " . $e->getMessage()]);
        }
        exit();
    }

    // Action: Standard Create / Update Sanction
    if (empty($data['case_id']) || empty($data['sanction_type']) || empty($data['due_date'])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Missing required fields."]);
        exit();
    }

    try {
        $findCase = $conn->prepare("SELECT id FROM cases WHERE id = :val OR case_no = :val LIMIT 1");
        $findCase->execute([':val' => $data['case_id']]);
        $foundCase = $findCase->fetch(PDO::FETCH_ASSOC);

        $realCaseId = $foundCase ? $foundCase['id'] : $data['case_id'];

        $checkStmt = $conn->prepare("SELECT id FROM sanctions WHERE case_id = :case_id LIMIT 1");
        $checkStmt->execute([':case_id' => $realCaseId]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            $sql = "UPDATE sanctions 
                    SET sanction_type = :sanction_type, due_date = :due_date, status = 'Pending', notes = :notes 
                    WHERE case_id = :case_id";
        } else {
            $sql = "INSERT INTO sanctions (case_id, sanction_type, due_date, status, notes) 
                    VALUES (:case_id, :sanction_type, :due_date, 'Pending', :notes)";
        }

        $stmt = $conn->prepare($sql);
        $stmt->execute([
            ':case_id'       => $realCaseId,
            ':sanction_type' => $data['sanction_type'],
            ':due_date'      => $data['due_date'],
            ':notes'        => !empty($data['notes']) ? $data['notes'] : null
        ]);

        $updateCase = $conn->prepare("UPDATE cases SET status = 'Sanction Pending' WHERE id = :case_id");
        $updateCase->execute([':case_id' => $realCaseId]);

        echo json_encode(["status" => "success", "message" => "Sanction assigned successfully!"]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Database Error: " . $e->getMessage()]);
    }
    exit();
}

http_response_code(405);
echo json_encode(["status" => "error", "message" => "Method Not Allowed"]);
exit();
?>