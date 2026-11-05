const mysql = require('mysql2/promise');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT || '25993', 10),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'defaultdb',
            ssl: { rejectUnauthorized: false }
        });

        if (req.method === 'GET') {
            const [rows] = await connection.execute('SELECT * FROM cases ORDER BY id DESC');
            await connection.end();
            return res.status(200).json({ status: 'success', data: rows });
        }

        if (req.method === 'POST') {
            const { 
                student_id, 
                studentId,
                filed_by,
                incident_type, 
                description, 
                severity, 
                status, 
                incident_date, 
                location 
            } = req.body || {};

            const finalStudentId = student_id || studentId;

            if (!finalStudentId) {
                await connection.end();
                return res.status(400).json({ status: 'error', message: 'Student ID is required.' });
            }

            const caseNo = req.body.case_no || `CHS-${Date.now().toString().slice(-8)}`;
            const filedBy = filed_by || 'Administrator';
            const caseStatus = status || 'Under Investigation';

            const params = [
                caseNo,
                finalStudentId,
                filedBy,
                incident_type || 'Other',
                description || '',
                severity || 'Low',
                caseStatus,
                incident_date || new Date().toISOString().split('T')[0],
                location || 'Classroom'
            ];

            const [result] = await connection.execute(
                `INSERT INTO cases (case_no, student_id, filed_by, incident_type, description, severity, status, incident_date, location) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                params
            );

            await connection.end();
            return res.status(201).json({ status: 'success', message: 'Case created successfully.', id: result.insertId, case_no: caseNo });
        }

        if (req.method === 'PUT') {
            const { action, case_id, status } = req.body || {};
            if (action === 'update_status' && case_id && status) {
                await connection.execute('UPDATE cases SET status = ? WHERE case_no = ? OR id = ?', [status, case_id, case_id]);
                await connection.end();
                return res.status(200).json({ status: 'success', message: 'Case status updated successfully.' });
            }
        }

        await connection.end();
        return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
    } catch (err) {
        if (connection) await connection.end();
        console.error('Cases API error:', err);
        return res.status(500).json({ status: 'error', message: err.message });
    }
};