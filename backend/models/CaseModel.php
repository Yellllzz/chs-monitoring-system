<?php
// backend/models/CaseModel.php

require_once __DIR__ . '/../config/sms.php';

class CaseModel {
    private $conn;
    private $table = "cases";

    public function __construct($db) {
        $this->conn = $db;
    }

    private function calculateSchoolDaysDueDate($startDateStr, $days) {
        $currentDate = new DateTime($startDateStr);
        $addedDays = 0;

        while ($addedDays < $days) {
            $currentDate->modify('+1 day');
            $dayOfWeek = (int)$currentDate->format('N'); // 1 (Mon) to 7 (Sun)
            if ($dayOfWeek < 6) { // Skip Saturday (6) and Sunday (7)
                $addedDays++;
            }
        }

        return $currentDate->format('Y-m-d');
    }

    public function create($data) {
        $case_no = "CASE-" . date('Y') . "-" . str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT);

        $query = "INSERT INTO " . $this->table . " 
                 (case_no, student_id, filed_by, incident_type, severity, status, incident_date, location, description, narrative_report) 
                 VALUES (:case_no, :student_id, :filed_by, :incident_type, :severity, 'Under Investigation', :incident_date, :location, :description, :narrative_report)";

        $stmt = $this->conn->prepare($query);
        
        $params = [
            ':case_no'          => $case_no,
            ':student_id'       => intval($data['student_id']),
            ':filed_by'         => !empty($data['filed_by']) ? $data['filed_by'] : 'Administrator',
            ':incident_type'    => $data['incident_type'],
            ':severity'         => !empty($data['severity']) ? $data['severity'] : 'Low',
            ':incident_date'    => !empty($data['incident_date']) ? $data['incident_date'] : date('Y-m-d'),
            ':location'         => !empty($data['location']) ? $data['location'] : 'Classroom',
            ':description'      => $data['description'],
            ':narrative_report' => !empty($data['narrative_report']) ? $data['narrative_report'] : null
        ];

        $success = $stmt->execute($params);

        if ($success) {
            $lastId = $this->conn->lastInsertId();

            // 1. History Log Insertion
            try {
                $stmtLog = $this->conn->prepare("
                    INSERT INTO history_logs (case_id, action, performed_by, details, created_at) 
                    VALUES (:case_id, 'Case Filed & Logged', :filed_by, :details, NOW())
                ");
                $stmtLog->execute([
                    ':case_id'  => $lastId,
                    ':filed_by' => !empty($data['filed_by']) ? $data['filed_by'] : 'Administrator',
                    ':details'  => "New case logged for incident: " . $data['incident_type']
                ]);
            } catch (Exception $e) {
                error_log("History log creation notice: " . $e->getMessage());
            }

            // 2. Initial Sanction Record Insertion (Dynamic School Day Calculation)
            if (!empty($data['sanction_type'])) {
                try {
                    $sanctionType = $data['sanction_type'];
                    $incidentDate = !empty($data['incident_date']) ? $data['incident_date'] : date('Y-m-d');
                    
                    $dueDate = null;
                    if (preg_match('/(\d+)\s*Days?\s*Suspension/i', $sanctionType, $matches)) {
                        $days = intval($matches[1]);
                        $dueDate = $this->calculateSchoolDaysDueDate($incidentDate, $days);
                    } else {
                        $dueDate = date('Y-m-d', strtotime($incidentDate . ' +7 days'));
                    }

                    $stmtSanction = $this->conn->prepare("
                        INSERT INTO sanctions (case_id, sanction_type, due_date, status, notes, created_at) 
                        VALUES (:case_id, :sanction_type, :due_date, 'Pending', 'Assigned upon case filing', NOW())
                    ");
                    $stmtSanction->execute([
                        ':case_id'       => $lastId,
                        ':sanction_type' => $sanctionType,
                        ':due_date'      => $dueDate
                    ]);
                } catch (Exception $e) {
                    error_log("Sanction insertion notice: " . $e->getMessage());
                }
            }

            // 3. Automated SMS Notification to Guardian
            try {
                $stmtGuardian = $this->conn->prepare("
                    SELECT guardian_name, guardian_contact, first_name, last_name 
                    FROM students 
                    WHERE id = :student_id LIMIT 1
                ");
                $stmtGuardian->execute([':student_id' => $data['student_id']]);
                $studentInfo = $stmtGuardian->fetch(PDO::FETCH_ASSOC);

                if ($studentInfo && !empty($studentInfo['guardian_contact'])) {
                    $studentName = $studentInfo['first_name'] . ' ' . $studentInfo['last_name'];
                    $guardianContact = $studentInfo['guardian_contact'];
                    $sanctionAssigned = !empty($data['sanction_type']) ? $data['sanction_type'] : 'Under Assessment';
                    
                    $smsBody = "Caloocan High School Notice: A guidance report ({$case_no}) regarding student {$studentName} has been recorded for {$data['incident_type']}. Assigned Sanction: {$sanctionAssigned}. Please contact the Guidance Office.";
                    
                    sendSMS($guardianContact, $smsBody);
                }
            } catch (Exception $e) {
                error_log("SMS dispatch error: " . $e->getMessage());
            }
        }

        return $success ? $case_no : false;
    }

    public function getAll() {
        $query = "SELECT c.*, 
                         CONCAT(IFNULL(s.first_name,''), ' ', IFNULL(s.last_name,'')) AS student_name,
                         s.student_id AS student_number,
                         s.grade_level,
                         s.section,
                         san.sanction_type,
                         san.status AS sanction_status
                  FROM " . $this->table . " c
                  LEFT JOIN students s ON c.student_id = s.id
                  LEFT JOIN sanctions san ON san.case_id = c.id
                  ORDER BY c.created_at DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function updateStatus($case_id, $status) {
        $query = "UPDATE " . $this->table . " SET status = :status WHERE id = :case_id OR case_no = :case_id";
        $stmt = $this->conn->prepare($query);
        return $stmt->execute([
            ':status'  => $status,
            ':case_id' => $case_id
        ]);
    }
}
?>