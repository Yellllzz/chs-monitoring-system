const mysql = require('mysql2/promise');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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

        const [students] = await connection.execute('SELECT COUNT(*) AS count FROM students');
        const [cases] = await connection.execute("SELECT COUNT(*) AS count FROM cases WHERE status != 'Closed'");
        const [sanctions] = await connection.execute("SELECT COUNT(*) AS count FROM sanctions WHERE status = 'Pending' OR status = 'Sanction Ongoing'");
        const [followups] = await connection.execute("SELECT COUNT(*) AS count FROM cases WHERE status = 'Follow-up'");

        await connection.end();

        return res.status(200).json({
            status: 'success',
            data: {
                total_students: students[0].count || 0,
                open_cases: cases[0].count || 0,
                pending_sanctions: sanctions[0].count || 0,
                follow_ups: followups[0].count || 0
            }
        });
    } catch (err) {
        if (connection) await connection.end();
        return res.status(500).json({ status: 'error', message: err.message });
    }
};