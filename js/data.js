// js/data.js

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

// State synchronization helpers using Vercel Serverless Endpoints
async function loadDataFromBackend() {
    try {
        const [studentsRes, casesRes] = await Promise.all([
            fetch("/api/students").then(res => res.json()).catch(() => null),
            fetch("/api/cases").then(res => res.json()).catch(() => null)
        ]);

        if (studentsRes && studentsRes.status === "success") {
            students = studentsRes.data || [];
        }

        if (casesRes && casesRes.status === "success") {
            cases = casesRes.data || [];
        }

        return { students, cases };
    } catch (err) {
        console.error("Error synchronizing backend data:", err);
    }
}

async function createStudentRecord(studentData) {
    try {
        const response = await fetch("/api/students", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(studentData)
        });
        const res = await response.json();
        if (res && res.status === "success") {
            await loadDataFromBackend();
        }
        return res;
    } catch (err) {
        console.error("Error creating student record:", err);
        return { status: "error", message: err.message };
    }
}

async function createCaseRecord(caseData) {
    try {
        const response = await fetch("/api/cases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(caseData)
        });
        const res = await response.json();
        if (res && res.status === "success") {
            await loadDataFromBackend();
        }
        return res;
    } catch (err) {
        console.error("Error creating case record:", err);
        return { status: "error", message: err.message };
    }
}

async function getDashboardData() {
    try {
        const response = await fetch("/api/dashboard");
        return await response.json();
    } catch (err) {
        console.error("Error fetching dashboard data:", err);
        return { status: "error", message: err.message };
    }
}

function saveStateToStorage() {
    return true;
}