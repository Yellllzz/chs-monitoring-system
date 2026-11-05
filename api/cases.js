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
                incident_type, 
                description, 
                severity, 
                status, 
                reported_by, 
                incident_date, 
                location, 
                sanction_type 
            } = req.body || {};

            // Safeguard against undefined parameters by converting them to null or safe defaults
            const params = [
                student_id !== undefined ? student_id : null,
                incident_type !== undefined ? incident_type : 'Other',
                description !== undefined ? description : '',
                severity !== undefined ? severity : 'Low',
                status !== undefined ? status : 'Pending',
                reported_by !== undefined ? reported_by : 'Admin',
                incident_date !== undefined ? incident_date : null,
                location !== undefined ? location : null,
                sanction_type !== undefined ? sanction_type : null
            ];

            const [result] = await connection.execute(
                `INSERT INTO cases (student_id, incident_type, description, severity, status, reported_by, incident_date, location, sanction_type) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                params
            );

            await connection.end();
            return res.status(201).json({ status: 'success', message: 'Case created successfully.', id: result.insertId });
        }

        await connection.end();
        return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
    } catch (err) {
        if (connection) await connection.end();
        console.error('Cases API error:', err);
        return res.status(500).json({ status: 'error', message: err.message });
    }
};