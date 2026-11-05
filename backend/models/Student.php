<?php
// backend/models/Student.php

class Student {
    private $conn;
    private $table = "students";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function getAll() {
        // Fetch only active (non-archived) students
        $query = "SELECT s.*, 
                         COUNT(c.id) AS total_cases 
                  FROM " . $this->table . " s 
                  LEFT JOIN cases c ON s.id = c.student_id 
                  WHERE s.is_archived = 0 OR s.is_archived IS NULL
                  GROUP BY s.id 
                  ORDER BY s.last_name ASC, s.first_name ASC";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function exists($firstName, $lastName, $gradeLevel) {
        $query = "SELECT id FROM " . $this->table . " 
                  WHERE LOWER(first_name) = LOWER(:first_name) 
                  AND LOWER(last_name) = LOWER(:last_name) 
                  AND grade_level = :grade_level 
                  AND (is_archived = 0 OR is_archived IS NULL)
                  LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->execute([
            ':first_name'  => trim($firstName),
            ':last_name'   => trim($lastName),
            ':grade_level' => trim($gradeLevel)
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ? true : false;
    }

    public function create($data) {
        if ($this->exists($data['first_name'], $data['last_name'], $data['grade_level'])) {
            return ["status" => "duplicate", "message" => "Student already exists in the active masterlist."];
        }

        $student_id = "STU-" . date('Y') . "-" . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);

        $query = "INSERT INTO " . $this->table . " 
                 (student_id, first_name, middle_name, last_name, gender, grade_level, section, contact_number, parent_contact, is_archived) 
                 VALUES (:student_id, :first_name, :middle_name, :last_name, :gender, :grade_level, :section, :contact_number, :parent_contact, 0)";

        $stmt = $this->conn->prepare($query);
        
        $success = $stmt->execute([
            ':student_id'      => $student_id,
            ':first_name'      => trim($data['first_name']),
            ':middle_name'     => !empty($data['middle_name']) ? trim($data['middle_name']) : null,
            ':last_name'       => trim($data['last_name']),
            ':gender'          => $data['gender'] ?? 'Male',
            ':grade_level'     => $data['grade_level'],
            ':section'         => trim($data['section']),
            ':contact_number' => !empty($data['guardian_contact']) ? trim($data['guardian_contact']) : 'N/A',
            ':parent_contact'  => !empty($data['guardian_contact']) ? trim($data['guardian_contact']) : 'N/A'
        ]);

        return $success ? ["status" => "success", "student_id" => $student_id] : ["status" => "error", "message" => "Failed to save student."];
    }

    public function archive($id) {
        $query = "UPDATE " . $this->table . " SET is_archived = 1 WHERE id = :id OR student_id = :id";
        $stmt = $this->conn->prepare($query);
        return $stmt->execute([':id' => $id]);
    }
}
?>