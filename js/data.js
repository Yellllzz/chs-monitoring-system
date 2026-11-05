// js/data.js

const API_BASE_URL = "backend/api";

const currentUser = {
    id: "USR-001",
    name: "Administrator",
    role: "School Admin"
};

let currentPage = "dashboard";

const caseRules = {
    "Bullying": { severity: "Medium", sanction: "Subject for Counseling", description: "Recommended guidance counseling intervention and community service." },
    "Smoking": { severity: "High", sanction: "2 Days Suspension", description: "Recommended two-day suspension subject to school policy and administrative review." },
    "Drugs": { severity: "Critical", sanction: "Referral to Proper Authorities", description: "Requires immediate administrative review and appropriate referral under applicable school and legal procedures." },
    "Weapon": { severity: "Critical", sanction: "Referral to Proper Authorities", description: "Requires immediate safety response, administrative review, and appropriate referral under applicable procedures." },
    "Physical Altercation": { severity: "High", sanction: "Parent Conference", description: "Recommended parent conference and administrative intervention." },
    "Fighting": { severity: "High", sanction: "Parent Conference", description: "Recommended parent conference and administrative intervention." },
    "Verbal Conflict": { severity: "Low", sanction: "Written Warning", description: "Recommended written warning and monitoring." },
    "Threatening Behavior": { severity: "High", sanction: "Subject for Counseling", description: "Recommended counseling referral and administrative review." },
    "Property Damage": { severity: "Medium", sanction: "Restitution", description: "Recommended restitution and appropriate disciplinary intervention." },
    "Disrespect / Defiance": { severity: "Low", sanction: "Verbal Warning", description: "Recommended verbal warning and monitoring." },
    "Cheating": { severity: "Medium", sanction: "Written Warning", description: "Recommended written warning and academic intervention." },
    "Vandalism": { severity: "Medium", sanction: "Community Service", description: "Recommended community service and restitution where applicable." },
    "Other": { severity: "Low", sanction: "Subject for Counseling", description: "Manual assessment required." }
};

const caseStatuses = [
    "Under Investigation",
    "Sanction Pending",
    "Active",
    "Follow-up",
    "Closed"
];

// Active in-memory cache
let students = [];
let cases = [];

// API Request Engine (Fixed for FormData and File Uploads)
async function fetchAPI(endpoint, method = "GET", body = null) {
    try {
        let target = endpoint;
        if (!target.includes(".php")) {
            if (target.includes("?")) {
                target = target.replace("?", ".php?");
            } else {
                target += ".php";
            }
        }

        const fullUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/') + `${API_BASE_URL}/${target}`;

        const options = {
            method: method,
            headers: {
                "Accept": "application/json"
            }
        };

        if (body && (method === "POST" || method === "PUT")) {
            // IF BODY IS FORMDATA, DO NOT SET CONTENT-TYPE! Let browser manage boundaries automatically
            if (body instanceof FormData) {
                options.body = body;
            } else {
                options.headers["Content-Type"] = "application/json";
                options.body = JSON.stringify(body);
            }
        }

        const response = await fetch(fullUrl, options);

        if (!response.ok) {
            const errData = await response.json().catch(() => ({ message: `HTTP error ${response.status}` }));
            throw new Error(errData.message || `HTTP error ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`[API Error] Failed fetching ${endpoint}:`, error);
        return { status: "error", message: error.message };
    }
}

// State synchronization helpers
async function loadDataFromBackend() {
    try {
        const [studentsRes, casesRes] = await Promise.all([
            fetchAPI("students.php"),
            fetchAPI("cases.php")
        ]);

        if (studentsRes && studentsRes.status === "success") {
            students = studentsRes.data;
        }

        if (casesRes && casesRes.status === "success") {
            cases = casesRes.data;
        }

        return { students, cases };
    } catch (err) {
        console.error("Error synchronizing backend data:", err);
    }
}

async function createStudentRecord(studentData) {
    const res = await fetchAPI("students.php", "POST", studentData);
    if (res && res.status === "success") {
        await loadDataFromBackend();
    }
    return res;
}

async function createCaseRecord(caseData) {
    const res = await fetchAPI("cases.php", "POST", caseData);
    if (res && res.status === "success") {
        await loadDataFromBackend();
    }
    return res;
}

async function getDashboardData() {
    return await fetchAPI("dashboard.php");
}

function saveStateToStorage() {
    return true;
}