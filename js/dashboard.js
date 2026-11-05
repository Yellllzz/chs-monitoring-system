// js/dashboard.js

async function renderDashboard() {
    const content = document.getElementById("pageContent");
    if (!content) return;

    // Ensure students and cases arrays exist safely in global scope
    const studentList = (typeof students !== 'undefined' && Array.isArray(students)) ? students : [];
    const caseList = (typeof cases !== 'undefined' && Array.isArray(cases)) ? cases : [];

    // Aggregate statistics
    let stats = {
        total_students: studentList.length,
        open_cases: caseList.filter(c => c.status !== "Closed").length,
        pending_sanctions: caseList.filter(c => c.sanction && (c.sanction.status === "Pending" || c.sanction.status === "Sanction Ongoing")).length,
        follow_ups: caseList.filter(c => c.status === "Follow-up").length
    };

    // Attempt to pull live analytics from API if available
    try {
        if (typeof getDashboardData === 'function') {
            const dashRes = await getDashboardData();
            if (dashRes && dashRes.status === "success" && dashRes.data) {
                stats.total_students = dashRes.data.total_students ?? stats.total_students;
                stats.open_cases = dashRes.data.open_cases ?? stats.open_cases;
                stats.pending_sanctions = dashRes.data.pending_sanctions ?? stats.pending_sanctions;
            }
        }
    } catch (e) {
        console.warn("Using local stats for dashboard rendering:", e);
    }

    // Incident types aggregation for chart
    const incidentCounts = {};
    caseList.forEach(c => {
        const type = c.incident || c.incident_type || "Other";
        incidentCounts[type] = (incidentCounts[type] || 0) + 1;
    });

    const incidentEntries = Object.entries(incidentCounts).sort((a, b) => b[1] - a[1]);
    const maxIncidentCount = incidentEntries.length > 0 ? Math.max(...incidentEntries.map(e => e[1])) : 1;

    // Case status distribution aggregation
    const statusCounts = {
        "Under Investigation": 0,
        "Sanction Pending": 0,
        "Active": 0,
        "Follow-up": 0,
        "Closed": 0
    };

    caseList.forEach(c => {
        const st = c.status || "Under Investigation";
        if (statusCounts.hasOwnProperty(st)) {
            statusCounts[st]++;
        }
    });

    content.innerHTML = `
        <!-- Stats Cards Grid -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-top">
                    <span class="stat-label">Total Students</span>
                    <div class="stat-icon">👥</div>
                </div>
                <div class="stat-value">${stats.total_students}</div>
                <div class="stat-description">Registered students</div>
            </div>

            <div class="stat-card">
                <div class="stat-top">
                    <span class="stat-label">Open Cases</span>
                    <div class="stat-icon">▣</div>
                </div>
                <div class="stat-value">${stats.open_cases}</div>
                <div class="stat-description">Cases requiring attention</div>
            </div>

            <div class="stat-card">
                <div class="stat-top">
                    <span class="stat-label">Pending Sanctions</span>
                    <div class="stat-icon">✓</div>
                </div>
                <div class="stat-value">${stats.pending_sanctions}</div>
                <div class="stat-description">Disciplinary actions queued</div>
            </div>

            <div class="stat-card">
                <div class="stat-top">
                    <span class="stat-label">Follow-ups</span>
                    <div class="stat-icon">📜</div>
                </div>
                <div class="stat-value">${stats.follow_ups}</div>
                <div class="stat-description">Cases needing follow-up</div>
            </div>
        </div>

        <!-- Charts Grid -->
        <div class="dashboard-grid">
            <div class="card">
                <div class="card-header">
                    <div>
                        <h3>Cases by Incident Type</h3>
                        <p>Distribution of reported incidents</p>
                    </div>
                </div>
                <div class="chart">
                    ${incidentEntries.length === 0 ? '<div class="empty-state">No incidents recorded yet.</div>' : ''}
                    ${incidentEntries.map(([type, count]) => {
                        const pct = Math.round((count / maxIncidentCount) * 100);
                        return `
                            <div class="chart-row">
                                <span class="chart-label" title="${type}">${type}</span>
                                <div class="chart-bar">
                                    <div class="chart-fill" style="width: ${pct}%;"></div>
                                </div>
                                <span class="chart-value">${count}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div>
                        <h3>Case Status</h3>
                        <p>Current case distribution</p>
                    </div>
                </div>
                <div class="status-chart">
                    ${Object.entries(statusCounts).map(([status, count]) => `
                        <div class="status-row">
                            <span class="status-dot"></span>
                            <span>${status}</span>
                            <span class="status-count">${count}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}