<?php
// backend/models/HistoryModel.php

class HistoryModel {
    private $conn;
    private $table = "history_logs";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function getAll() {
        $query = "SELECT h.*, 
                         c.case_no,
                         c.incident_type,
                         c.severity,
                         c.narrative_report,
                         CONCAT(IFNULL(s.first_name,''), ' ', IFNULL(s.last_name,'')) AS student_name,
                         s.student_id AS student_number,
                         s.grade_level,
                         s.section,
                         san.sanction_type
                  FROM " . $this->table . " h
                  LEFT JOIN cases c ON (c.id = h.case_id OR c.case_no = h.case_id)
                  LEFT JOIN students s ON c.student_id = s.id
                  LEFT JOIN sanctions san ON san.case_id = c.id
                  GROUP BY h.id
                  ORDER BY h.created_at DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
?>