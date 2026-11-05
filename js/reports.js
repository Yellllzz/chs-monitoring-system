// js/reports.js

async function renderReports() {
    const pageContent = document.getElementById("pageContent");
    if (!pageContent) return;

    if (typeof loadDataFromBackend === "function") {
        await loadDataFromBackend();
    }

    const allCases = cases || [];
    const allStudents = students || [];

    // Summary Metrics
    const totalCasesCount = allCases.length;
    const activeCasesCount = allCases.filter(c => (c.status || "Under Investigation") !== "Closed").length;
    const closedCasesCount = allCases.filter(c => c.status === "Closed").length;
    const criticalCasesCount = allCases.filter(c => c.severity === "Critical" || c.severity === "High").length;

    // 1. Incidents by Grade Level (Resolved via Student lookup)
    const gradeCounts = { "Grade 10": 0, "Grade 9": 0, "Grade 8": 0, "Grade 7": 0 };
    
    allCases.forEach(c => {
        let grade = c.grade_level;
        if (!grade) {
            const student = allStudents.find(s => s.id == c.student_id || s.student_id === c.student_id || s.id == c.studentId);
            if (student) grade = student.grade_level;
        }

        if (grade && gradeCounts.hasOwnProperty(grade)) {
            gradeCounts[grade]++;
        } else if (grade) {
            // Flexible match for Grade numbers
            const match = String(grade).match(/\d+/);
            if (match) {
                const key = `Grade ${match[0]}`;
                if (gradeCounts.hasOwnProperty(key)) gradeCounts[key]++;
            }
        }
    });

    const maxGradeCount = Math.max(...Object.values(gradeCounts), 1);

    // 2. Sanction Compliance Breakdown
    let pendingSanctionCount = 0;
    let inProgressSanctionCount = 0;
    let completedSanctionCount = 0;

    allCases.forEach(c => {
        const status = c.sanction_status || c.status;
        const hasSanction = c.sanction_type || (c.sanction && c.sanction.type);

        if (!hasSanction || status === "Sanction Pending") {
            pendingSanctionCount++;
        } else if (status === "Closed" || status === "Completed") {
            completedSanctionCount++;
        } else {
            inProgressSanctionCount++;
        }
    });

    // 3. Risk Profile
    const studentCaseCounts = {};
    allCases.forEach(c => {
        const sId = c.student_id || c.studentId;
        if (sId) {
            studentCaseCounts[sId] = (studentCaseCounts[sId] || 0) + 1;
        }
    });

    let cleanCount = 0;
    let lowRiskCount = 0;
    let repeatCount = 0;

    allStudents.forEach(s => {
        const cCount = studentCaseCounts[s.id] || studentCaseCounts[s.student_id] || 0;
        if (cCount === 0) cleanCount++;
        else if (cCount <= 2) lowRiskCount++;
        else repeatCount++;
    });

    // 4. Incident Hotspots
    const locationCounts = {};
    allCases.forEach(c => {
        const loc = c.location || "Classroom";
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });

    const sortedLocations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]);
    const maxLocCount = Math.max(...Object.values(locationCounts), 1);

    pageContent.innerHTML = `
        <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div>
                <h2>Analytics & System Reports</h2>
                <p style="color: #888; font-size: 0.9rem;">Real-time statistical breakdown of incidents, student risks, and administrative compliance.</p>
            </div>
            <button class="primary-button" onclick="exportFullSystemCSV()" style="padding: 10px 18px; cursor: pointer;">
                📊 Export CSV Report
            </button>
        </div>

        <!-- Top Metrics Cards -->
        <div class="metrics-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">
            <div class="metric-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 18px; border-radius: 12px;">
                <span class="metric-label" style="color: #888; font-size: 0.82rem; text-transform: uppercase;">Total Logged Cases</span>
                <div class="metric-value" style="font-size: 1.8rem; font-weight: 700; color: #fff; margin-top: 6px;">${totalCasesCount}</div>
                <span style="font-size: 0.8rem; color: #666;">All historical & active records</span>
            </div>
            <div class="metric-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 18px; border-radius: 12px;">
                <span class="metric-label" style="color: #888; font-size: 0.82rem; text-transform: uppercase;">Active Workflow</span>
                <div class="metric-value" style="font-size: 1.8rem; font-weight: 700; color: #3b82f6; margin-top: 6px;">${activeCasesCount}</div>
                <span style="font-size: 0.8rem; color: #666;">Ongoing investigation & sanctions</span>
            </div>
            <div class="metric-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 18px; border-radius: 12px;">
                <span class="metric-label" style="color: #888; font-size: 0.82rem; text-transform: uppercase;">Resolved / Closed</span>
                <div class="metric-value" style="font-size: 1.8rem; font-weight: 700; color: #10b981; margin-top: 6px;">${closedCasesCount}</div>
                <span style="font-size: 0.8rem; color: #666;">Archived student cases</span>
            </div>
            <div class="metric-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 18px; border-radius: 12px;">
                <span class="metric-label" style="color: #888; font-size: 0.82rem; text-transform: uppercase;">Critical Incidents</span>
                <div class="metric-value" style="font-size: 1.8rem; font-weight: 700; color: #ef4444; margin-top: 6px;">${criticalCasesCount}</div>
                <span style="font-size: 0.8rem; color: #666;">High-priority cases</span>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <!-- 1. Incidents by Grade Level -->
            <div class="card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px;">
                <div style="margin-bottom: 16px;">
                    <h3 style="margin: 0; font-size: 1.05rem; color: #fff;">Incidents by Grade Level</h3>
                    <p style="margin: 4px 0 0; color: #888; font-size: 0.82rem;">Distribution across academic year</p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${Object.entries(gradeCounts).map(([grade, count]) => {
                        const widthPct = Math.max((count / maxGradeCount) * 100, 4);
                        return `
                            <div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #ddd; margin-bottom: 4px;">
                                    <span>${grade}</span>
                                    <strong style="color: #60a5fa;">${count}${count === 1 ? 'case' : 'cases'}</strong>
                                </div>
                                <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden;">
                                    <div style="width: ${widthPct}%; height: 100%; background: linear-gradient(90deg, #3b82f6, #60a5fa); border-radius: 4px; transition: width 0.3s ease;"></div>
                                </div>
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>

            <!-- 2. Student Risk Profile -->
            <div class="card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px;">
                <div style="margin-bottom: 16px;">
                    <h3 style="margin: 0; font-size: 1.05rem; color: #fff;">Student Risk Profile</h3>
                    <p style="margin: 4px 0 0; color: #888; font-size: 0.82rem;">Population distribution by offence frequency</p>
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px;">
                    <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 12px; text-align: center;">
                        <span style="font-size: 0.75rem; color: #10b981; font-weight: 600; text-transform: uppercase;">Clean</span>
                        <div style="font-size: 1.4rem; font-weight: 700; color: #fff; margin-top: 4px;">${cleanCount}</div>
                        <small style="color: #888; font-size: 0.7rem;">0 cases</small>
                    </div>
                    <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 8px; padding: 12px; text-align: center;">
                        <span style="font-size: 0.75rem; color: #f59e0b; font-weight: 600; text-transform: uppercase;">Low Risk</span>
                        <div style="font-size: 1.4rem; font-weight: 700; color: #fff; margin-top: 4px;">${lowRiskCount}</div>
                        <small style="color: #888; font-size: 0.7rem;">1-2 cases</small>
                    </div>
                    <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; text-align: center;">
                        <span style="font-size: 0.75rem; color: #ef4444; font-weight: 600; text-transform: uppercase;">Repeat</span>
                        <div style="font-size: 1.4rem; font-weight: 700; color: #fff; margin-top: 4px;">${repeatCount}</div>
                        <small style="color: #888; font-size: 0.7rem;">3+ cases</small>
                    </div>
                </div>
                <div style="font-size: 0.8rem; color: #888; display: flex; justify-content: space-between;">
                    <span>Total Masterlist: <strong>${allStudents.length}</strong></span>
                    <span style="color: #10b981;">${allStudents.length > 0 ? Math.round((cleanCount / allStudents.length) * 100) : 0}% Clean Record</span>
                </div>
            </div>

            <!-- 3. Sanction Compliance -->
            <div class="card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px;">
                <div style="margin-bottom: 16px;">
                    <h3 style="margin: 0; font-size: 1.05rem; color: #fff;">Sanction Compliance</h3>
                    <p style="margin: 4px 0 0; color: #888; font-size: 0.82rem;">Status of assigned disciplinary actions</p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 8px;">
                        <span style="font-size: 0.88rem; color: #fbbf24;">Pending Review</span>
                        <strong style="font-size: 1rem; color: #fff;">${pendingSanctionCount}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 8px;">
                        <span style="font-size: 0.88rem; color: #60a5fa;">In Progress</span>
                        <strong style="font-size: 1rem; color: #fff;">${inProgressSanctionCount}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px;">
                        <span style="font-size: 0.88rem; color: #34d399;">Completed</span>
                        <strong style="font-size: 1rem; color: #fff;">${completedSanctionCount}</strong>
                    </div>
                </div>
            </div>
        </div>

        <!-- 4. Incident Hotspots -->
        <div class="card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <div style="margin-bottom: 16px;">
                <h3 style="margin: 0; font-size: 1.05rem; color: #fff;">Incident Hotspots (By Location)</h3>
                <p style="margin: 4px 0 0; color: #888; font-size: 0.82rem;">Frequency of reported incidents across campus locations</p>
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px;">
                ${sortedLocations.length > 0 ? sortedLocations.map(([loc, count]) => {
                    const widthPct = Math.max((count / maxLocCount) * 100, 3);
                    return `
                        <div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #ddd; margin-bottom: 4px;">
                                <span>${loc}</span>
                                <strong style="color: #60a5fa;">${count}</strong>
                            </div>
                            <div style="width: 100%; height: 10px; background: rgba(255,255,255,0.05); border-radius: 5px; overflow: hidden;">
                                <div style="width: ${widthPct}%; height: 100%; background: linear-gradient(90deg, #3b82f6, #1d4ed8); border-radius: 5px; transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                    `;
                }).join("") : `
                    <div style="color: #888; font-size: 0.88rem;">No location hotspot data available.</div>
                `}
            </div>
        </div>

        <!-- Navigation Shortcuts -->
        <div class="card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px;">
            <h3 style="margin: 0 0 16px 0; font-size: 1.05rem; color: #fff;">Quick Navigation Shortcuts</h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 14px;">
                    <strong style="color: #fff; font-size: 0.9rem;">Incident Logs</strong>
                    <p style="color: #888; font-size: 0.8rem; margin: 4px 0 12px 0;">Review active incident severity levels and investigation progress.</p>
                    <button class="primary-button" onclick="navigate('cases')" style="padding: 6px 14px; font-size: 0.82rem; cursor: pointer;">View Cases</button>
                </div>
                <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 14px;">
                    <strong style="color: #fff; font-size: 0.9rem;">Student Masterlist</strong>
                    <p style="color: #888; font-size: 0.8rem; margin: 4px 0 12px 0;">Review individual student profiles and complete case histories.</p>
                    <button class="primary-button" onclick="navigate('students')" style="padding: 6px 14px; font-size: 0.82rem; cursor: pointer;">View Masterlist</button>
                </div>
                <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 14px;">
                    <strong style="color: #fff; font-size: 0.9rem;">Sanction Tracking</strong>
                    <p style="color: #888; font-size: 0.8rem; margin: 4px 0 12px 0;">Manage pending sanctions, due dates, and completed actions.</p>
                    <button class="primary-button" onclick="navigate('sanctions')" style="padding: 6px 14px; font-size: 0.82rem; cursor: pointer;">View Sanctions</button>
                </div>
            </div>
        </div>
    `;
}

function exportFullSystemCSV() {
    if (!cases || cases.length === 0) {
        if (typeof showToast === "function") showToast("No case data available to export.", "error");
        return;
    }

    try {
        const headers = [
            "Case No",
            "Student Name",
            "Student ID",
            "Grade",
            "Section",
            "Incident Type",
            "Severity",
            "Location",
            "Incident Date",
            "Status",
            "Sanction",
            "Narrative Report Attached"
        ];

        const rows = cases.map(c => {
            const student = (students || []).find(s => s.id == c.student_id || s.student_id === c.student_id);
            return [
                c.case_no || c.id,
                c.student_name || (student ? `${student.first_name} ${student.last_name}` : 'N/A'),
                student ? student.student_id : 'N/A',
                c.grade_level || (student ? student.grade_level : 'N/A'),
                c.section || (student ? student.section : 'N/A'),
                c.incident_type || c.incident,
                c.severity,
                c.location || 'N/A',
                c.incident_date || c.date,
                c.status,
                c.sanction_type || 'None',
                c.narrative_report ? 'Yes' : 'No'
            ];
        });

        const formatRow = row => row.map(cell => `"${String(cell || "").replace(/"/g, '""')}"`).join(",");
        const csvContent = "\uFEFF" + [headers, ...rows].map(formatRow).join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        const timestamp = new Date().toISOString().split("T")[0];
        link.setAttribute("href", url);
        link.setAttribute("download", `CHS_Analytics_Summary_Report_${timestamp}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        if (typeof showToast === "function") showToast("Analytics report exported successfully!");
    } catch (err) {
        console.error("CSV Export error:", err);
        if (typeof showToast === "function") showToast("Failed to export analytics report.", "error");
    }
}