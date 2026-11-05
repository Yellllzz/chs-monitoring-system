// js/history.js

window.historyLogsData = window.historyLogsData || [];

async function renderHistory(search = "", incidentFilter = "") {
    const pageContent = document.getElementById("pageContent");
    if (!pageContent) return;

    // Fetch history logs directly from backend
    try {
        const response = await fetchAPI("history.php", "GET");
        if (response && response.status === "success" && Array.isArray(response.data)) {
            window.historyLogsData = response.data;
        }
    } catch (err) {
        console.warn("Could not load history logs API.", err);
    }

    const searchTerm = search.trim().toLowerCase();

    const filteredLogs = (window.historyLogsData || []).filter(log => {
        const caseNo = (log.case_no || log.case_id || "").toLowerCase();
        const studentName = (log.student_name || "").toLowerCase();
        const studentId = (log.student_number || log.student_id || "").toLowerCase();
        const incident = (log.incident_type || log.incident || "").toLowerCase();

        const matchesSearch = !searchTerm || 
            caseNo.includes(searchTerm) || 
            studentName.includes(searchTerm) || 
            studentId.includes(searchTerm) || 
            incident.includes(searchTerm);

        const matchesIncident = !incidentFilter || log.incident_type === incidentFilter;

        return matchesSearch && matchesIncident;
    });

    pageContent.innerHTML = `
        <div class="page-header">
            <div>
                <h2>System History & Activity Logs</h2>
                <p>Review completed disciplinary actions, archived cases, and student statements.</p>
            </div>
            <button class="primary-button" onclick="exportHistoryToExcel()">
                📊 Export to Excel
            </button>
        </div>

        <div class="card">
            <div class="filter-bar">
                <div class="search-container">
                    <input
                        type="text"
                        id="historySearchBox"
                        class="search-box"
                        placeholder="Search student, ID, or case number..."
                        value="${escapeAttribute(search)}"
                        oninput="renderHistory(this.value, getCurrentHistoryIncident())"
                    >
                </div>

                <select
                    id="historyIncidentFilter"
                    class="filter-select"
                    onchange="renderHistory(getCurrentHistorySearch(), this.value)"
                >
                    <option value="">All Incidents</option>
                    <option value="Bullying">Bullying</option>
                    <option value="Smoking">Smoking</option>
                    <option value="Drugs">Drugs</option>
                    <option value="Weapon">Weapon</option>
                    <option value="Physical Altercation">Physical Altercation</option>
                    <option value="Verbal Conflict">Verbal Conflict</option>
                    <option value="Academic Dishonesty">Academic Dishonesty</option>
                    <option value="Vandalism">Vandalism</option>
                </select>
            </div>

            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Case ID</th>
                            <th>Student Name</th>
                            <th>Student ID</th>
                            <th>Grade & Section</th>
                            <th>Incident & Sanction</th>
                            <th>Date & Time</th>
                            <th>Action / Status</th>
                            <th>Narrative Report</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredLogs.length ? filteredLogs.map(createHistoryRow).join("") : `
                            <tr>
                                <td colspan="8" class="empty-table">
                                    <div class="empty-state">
                                        <p>No history logs recorded.</p>
                                    </div>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function createHistoryRow(log) {
    const caseId = log.case_no || log.case_id || "—";
    const studentName = log.student_name || "—";
    const studentId = log.student_number || log.student_id || "—";
    const gradeSection = (log.grade_level || "") + " " + (log.section || "");
    const incidentAndSanction = `${log.incident_type || 'N/A'}${log.sanction_type ? ' (' + log.sanction_type + ')' : ''}`;
    
    let formattedDate = log.created_at || "—";
    if (log.created_at) {
        const isoDate = String(log.created_at).trim().replace(" ", "T");
        const parsed = new Date(isoDate);
        if (!isNaN(parsed.getTime())) {
            formattedDate = parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
    }

    let narrativeFile = log.narrative_report;
    if (!narrativeFile && typeof cases !== "undefined" && Array.isArray(cases)) {
        const matchedCase = cases.find(c => c.id == log.case_id || c.case_no === log.case_no || c.case_no === log.case_id);
        if (matchedCase) narrativeFile = matchedCase.narrative_report;
    }

    return `
        <tr>
            <td>
                <button class="text-button" onclick="showCase('${caseId}')">
                    ${caseId}
                </button>
            </td>
            <td><strong>${studentName}</strong></td>
            <td>${studentId}</td>
            <td>${gradeSection.trim() || '—'}</td>
            <td>${incidentAndSanction}</td>
            <td>${formattedDate}</td>
            <td>
                <span class="badge ${log.action && log.action.includes('Closed') ? 'badge-low' : 'badge-medium'}">
                    ${log.action || 'Status Updated'}
                </span>
            </td>
            <td>
                ${narrativeFile ? `
                    <a href="backend/${narrativeFile}" target="_blank" class="action-button" style="text-decoration: none; display: inline-flex; align-items: center; gap: 4px; font-size: 0.8rem; padding: 4px 10px; background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 6px;">
                        📄 View File
                    </a>
                ` : `
                    <span style="color: #64748b; font-size: 0.82rem;">None</span>
                `}
            </td>
        </tr>
    `;
}

function getCurrentHistorySearch() {
    const el = document.getElementById("historySearchBox");
    return el ? el.value : "";
}

function getCurrentHistoryIncident() {
    const el = document.getElementById("historyIncidentFilter");
    return el ? el.value : "";
}