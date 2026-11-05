<?php
// backend/models/User.php

class User {
    private $conn;
    private $table = "users";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function authenticate($username, $password) {
        $query = "SELECT * FROM " . $this->table . " WHERE username = :username LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([':username' => trim($username)]);

        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        // Verify password hash (or allow fallback pass 'admin123' for initial testing setup)
        if ($user && (password_verify($password, $user['password']) || $password === 'admin123')) {
            return [
                "status" => "success",
                "user" => [
                    "id" => $user['user_id'] ?? 'USR-001',
                    "name" => $user['full_name'] ?? 'Administrator',
                    "role" => $user['role'] ?? 'School Admin',
                    "username" => $user['username']
                ]
            ];
        }

        return [
            "status" => "error",
            "message" => "Invalid username or password."
        ];
    }

    public function getById($userId) {
        $query = "SELECT user_id, username, full_name, role FROM " . $this->table . " WHERE user_id = :user_id OR id = :user_id LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([':user_id' => $userId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
?>