const mysql = require('mysql2/promise');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

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

        // GET: Fetch all student records
        if (req.method === 'GET') {
            const [rows] = await connection.execute('SELECT * FROM students ORDER BY last_name ASC');
            await connection.end();
            return res.status(200).json({ status: 'success', data: rows });
        }

        // POST: Add new student record
        if (req.method === 'POST') {
            const { first_name, middle_name, last_name, gender, grade_level, section, guardian_name, guardian_contact } = req.body || {};
            
            const [result] = await connection.execute(
                `INSERT INTO students (first_name, middle_name, last_name, gender, grade_level, section, guardian_name, guardian_contact) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [first_name, middle_name, last_name, gender, grade_level, section, guardian_name, guardian_contact]
            );

            await connection.end();
            return res.status(201).json({ status: 'success', message: 'Student created successfully.', id: result.insertId });
        }

        // DELETE: Archive / remove student record
        if (req.method === 'DELETE') {
            const { id } = req.body || {};
            await connection.execute('DELETE FROM students WHERE id = ? OR student_id = ?', [id, id]);
            await connection.end();
            return res.status(200).json({ status: 'success', message: 'Student archived successfully.' });
        }

        await connection.end();
        return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
    } catch (err) {
        if (connection) await connection.end();
        console.error('Students API error:', err);
        return res.status(500).json({ status: 'error', message: err.message });
    }
};