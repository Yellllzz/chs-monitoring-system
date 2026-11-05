// js/dashboard.js

async function renderDashboard() {
    const pageContent = document.getElementById("pageContent");
    if (!pageContent) return;

    if (typeof loadDataFromBackend === "function") {
        await loadDataFromBackend();
    }

    const activeCasesList = (cases || []).filter(c => (c.status || "Under Investigation") !== "Closed");
    const openCasesCount = activeCasesList.length;
    const totalStudentsCount = (students || []).length;

    const pendingSanctionsCount = activeCasesList.filter(c => {
        const hasSanction = c.sanction_type || (c.sanction && c.sanction.type);
        return !hasSanction || c.status === "Sanction Pending";
    }).length;

    const followUpsCount = activeCasesList.filter(c => c.status === "Follow-up").length;

    // Aggregate incident count per category
    const incidentCounts = {};
    (cases || []).forEach(c => {
        const type = c.incident_type || c.incident || "Other";
        incidentCounts[type] = (incidentCounts[type] || 0) + 1;
    });

    const sortedIncidents = Object.entries(incidentCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

    const maxCount = Math.max(...Object.values(incidentCounts), 1);

    // Color Palette mapping for distinct vertical bars
    const barColors = [
        { gradient: 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)', text: '#f87171' }, // Red (Bullying / Severe)
        { gradient: 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)', text: '#fbbf24' }, // Amber / Orange (Fighting)
        { gradient: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)', text: '#60a5fa' }, // Blue (Physical Altercation)
        { gradient: 'linear-gradient(180deg, #8b5cf6 0%, #7c3aed 100%)', text: '#a78bfa' }, // Purple (Drugs / Critical)
        { gradient: 'linear-gradient(180deg, #10b981 0%, #059669 100%)', text: '#34d399' }, // Emerald / Green
        { gradient: 'linear-gradient(180deg, #ec4899 0%, #db2777 100%)', text: '#f472b6' }  // Pink / Magenta
    ];

    // Color Mapping for Status List
    const statusTheme = {
        "Under Investigation": { color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)" },
        "Sanction Pending": { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)" },
        "Active": { color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)" },
        "Follow-up": { color: "#10b981", bg: "rgba(16, 185, 129, 0.12)" },
        "Closed": { color: "#6b7280", bg: "rgba(107, 114, 128, 0.12)" }
    };

    pageContent.innerHTML = `
        <div class="metrics-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">
            <div class="metric-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 18px; border-radius: 12px;">
                <span class="metric-label" style="color: #888; font-size: 0.82rem; text-transform: uppercase;">Total Students</span>
                <div class="metric-value" style="font-size: 1.8rem; font-weight: 700; color: #fff; margin-top: 6px;">${totalStudentsCount}</div>
                <span style="font-size: 0.8rem; color: #666;">Registered students</span>
            </div>
            <div class="metric-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 18px; border-radius: 12px;">
                <span class="metric-label" style="color: #888; font-size: 0.82rem; text-transform: uppercase;">Open Cases</span>
                <div class="metric-value" style="font-size: 1.8rem; font-weight: 700; color: #3b82f6; margin-top: 6px;">${openCasesCount}</div>
                <span style="font-size: 0.8rem; color: #666;">Cases requiring attention</span>
            </div>
            <div class="metric-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 18px; border-radius: 12px;">
                <span class="metric-label" style="color: #888; font-size: 0.82rem; text-transform: uppercase;">Pending Sanctions</span>
                <div class="metric-value" style="font-size: 1.8rem; font-weight: 700; color: #f59e0b; margin-top: 6px;">${pendingSanctionsCount}</div>
                <span style="font-size: 0.8rem; color: #666;">Disciplinary actions queued</span>
            </div>
            <div class="metric-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 18px; border-radius: 12px;">
                <span class="metric-label" style="color: #888; font-size: 0.82rem; text-transform: uppercase;">Follow-ups</span>
                <div class="metric-value" style="font-size: 1.8rem; font-weight: 700; color: #10b981; margin-top: 6px;">${followUpsCount}</div>
                <span style="font-size: 0.8rem; color: #666;">Cases needing follow-up</span>
            </div>
        </div>

        <div class="dashboard-grid" style="display: grid; grid-template-columns: 1.8fr 1.2fr; gap: 20px;">
            <!-- Distinct Eye-Appealing Vertical Column Chart -->
            <div class="card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px;">
                <div style="margin-bottom: 20px;">
                    <h3 style="margin: 0; font-size: 1.1rem; color: #fff;">Cases by Incident Type</h3>
                    <p style="margin: 4px 0 0; color: #888; font-size: 0.85rem;">Distribution of reported incidents</p>
                </div>

                <div class="vertical-chart-container" style="display: flex; align-items: flex-end; justify-content: space-around; height: 220px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1); gap: 15px;">
                    ${sortedIncidents.length > 0 ? sortedIncidents.map(([type, count], index) => {
                        const heightPct = Math.max((count / maxCount) * 100, 14);
                        const palette = barColors[index % barColors.length];

                        return `
                            <div style="display: flex; flex-direction: column; align-items: center; flex: 1; height: 100%; justify-content: flex-end;">
                                <span style="font-size: 0.85rem; font-weight: 700; color: ${palette.text}; margin-bottom: 6px;">${count}</span>
                                <div style="
                                    width: 100%; 
                                    max-width: 44px; 
                                    height: ${heightPct}%; 
                                    background: ${palette.gradient}; 
                                    border-radius: 8px 8px 0 0; 
                                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
                                    transition: transform 0.2s ease, height 0.3s ease;
                                " title="${type}:${count}"></div>
                                <span style="
                                    font-size: 0.78rem; 
                                    font-weight: 500;
                                    color: #ccc; 
                                    margin-top: 10px; 
                                    text-align: center; 
                                    white-space: nowrap; 
                                    overflow: hidden; 
                                    text-overflow: ellipsis; 
                                    max-width: 80px;
                                " title="${type}">${type}</span>
                            </div>
                        `;
                    }).join("") : `
                        <div style="color: #666; font-size: 0.9rem; margin: auto;">No case incident data recorded yet.</div>
                    `}
                </div>
            </div>

            <!-- Case Status Breakdown -->
            <div class="card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px;">
                <div style="margin-bottom: 20px;">
                    <h3 style="margin: 0; font-size: 1.1rem; color: #fff;">Case Status</h3>
                    <p style="margin: 4px 0 0; color: #888; font-size: 0.85rem;">Overall case breakdown</p>
                </div>

                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${(typeof caseStatuses !== "undefined" ? caseStatuses : ["Under Investigation", "Sanction Pending", "Active", "Follow-up", "Closed"]).map(st => {
                        const count = (cases || []).filter(c => c.status === st || (!c.status && st === "Under Investigation")).length;
                        const theme = statusTheme[st] || { color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)" };

                        return `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span style="width: 8px; height: 8px; border-radius: 50%; background: ${theme.color}; display: inline-block;"></span>
                                    <span style="font-size: 0.88rem; color: #ddd;">${st}</span>
                                </div>
                                <span style="font-size: 0.82rem; font-weight: 700; color: ${theme.color}; background: ${theme.bg}; padding: 2px 10px; border-radius: 12px;">${count}</span>
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>
        </div>
    `;
}