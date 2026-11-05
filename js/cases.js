// js/cases.js

// Helper to get active user's full name from global state or localStorage
function getActiveFilingUser() {
    // 1. Check window state
    if (typeof currentUser !== "undefined" && currentUser) {
        const name = currentUser.name || currentUser.full_name || currentUser.username;
        if (name) return name;
    }
    
    // 2. Fallback to localStorage session
    const savedSession = localStorage.getItem('chs_session_user');
    if (savedSession) {
        try {
            const userObj = JSON.parse(savedSession);
            return userObj.name || userObj.full_name || userObj.username || userObj.faculty_name || 'Administrator';
        } catch (e) {
            return 'Administrator';
        }
    }
    
    return 'Administrator';
}

async function renderCases(search = "", severity = "", status = "") {
    const pageContent = document.getElementById("pageContent");
    if (!pageContent) return;

    if (typeof loadDataFromBackend === "function") {
        await loadDataFromBackend();
    }

    const searchTerm = String(search || "").trim().toLowerCase();

    const filteredCases = (cases || [])
        .filter(caseItem => {
            const caseStatus = caseItem.status || "Under Investigation";
            if (caseStatus === "Closed") return false;

            const caseId = String(caseItem.case_no || caseItem.id || "").toLowerCase();
            const incident = String(caseItem.incident_type || caseItem.incident || "").toLowerCase();
            
            const student = getStudent(caseItem.student_id || caseItem.studentId);
            const studentName = String(caseItem.student_name || (student ? getStudentFullName(student) : "")).toLowerCase();

            const matchesSearch =
                caseId.includes(searchTerm) ||
                incident.includes(searchTerm) ||
                studentName.includes(searchTerm);

            const caseSeverity = caseItem.severity || "Low";
            const matchesSeverity = !severity || caseSeverity === severity;
            const matchesStatus = !status || caseStatus === status;

            return matchesSearch && matchesSeverity && matchesStatus;
        })
        .sort((a, b) => new Date(b.incident_date || b.date || b.created_at) - new Date(a.incident_date || a.date || a.created_at));

    pageContent.innerHTML = `
        <div class="page-header">
            <div>
                <h2>Active Cases</h2>
                <p>Monitor and manage ongoing student disciplinary cases.</p>
            </div>
            <button class="primary-button" onclick="showNewCaseModal()">
                + New Case
            </button>
        </div>

        <div class="card">
            <div class="filter-bar">
                <div class="search-container">
                    <input
                        type="text"
                        id="caseSearchBox"
                        class="search-box"
                        placeholder="Search cases..."
                        value="${escapeAttribute(search)}"
                        oninput="renderCases(this.value, getCurrentCaseSeverity(), getCurrentCaseStatus())"
                    >
                </div>

                <select
                    id="caseSeverityFilter"
                    class="filter-select"
                    onchange="renderCases(getCurrentCaseSearch(), this.value, getCurrentCaseStatus())"
                >
                    <option value="">All Severities</option>
                    <option value="Low" ${severity === "Low" ? "selected" : ""}>Low</option>
                    <option value="Medium" ${severity === "Medium" ? "selected" : ""}>Medium</option>
                    <option value="High" ${severity === "High" ? "selected" : ""}>High</option>
                    <option value="Critical" ${severity === "Critical" ? "selected" : ""}>Critical</option>
                </select>

                <select
                    id="caseStatusFilter"
                    class="filter-select"
                    onchange="renderCases(getCurrentCaseSearch(), getCurrentCaseSeverity(), this.value)"
                >
                    <option value="">All Active Statuses</option>
                    ${(typeof caseStatuses !== "undefined" ? caseStatuses : ["Under Investigation", "Sanction Pending", "Active", "Follow-up"])
                        .filter(s => s !== "Closed")
                        .map(statusOption => `
                            <option value="${statusOption}" ${status === statusOption ? "selected" : ""}>
                                ${statusOption}
                            </option>
                        `).join("")}
                </select>
            </div>

            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Case ID</th>
                            <th>Student</th>
                            <th>Incident(s)</th>
                            <th>Date</th>
                            <th>Severity</th>
                            <th>Status</th>
                            <th>Sanction</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredCases.length ? filteredCases.map(createCaseRow).join("") : `
                            <tr>
                                <td colspan="8" class="empty-table">
                                    <div class="empty-state">
                                        <p>No active cases found.</p>
                                    </div>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    const searchBox = document.getElementById("caseSearchBox");
    if (searchBox) {
        searchBox.focus();
        searchBox.setSelectionRange(searchBox.value.length, searchBox.value.length);
    }
}

function createCaseRow(caseItem) {
    const caseId = caseItem.case_no || caseItem.id;
    const sId = caseItem.student_id || caseItem.studentId;
    const student = getStudent(sId);
    
    const studentName = caseItem.student_name || (student ? getStudentFullName(student) : 'Unknown Student');
    const studentCaseCount = (cases || []).filter(item => (String(item.student_id) === String(sId) || String(item.studentId) === String(sId))).length;
    
    const incidentName = caseItem.incident_type || caseItem.incident;
    const caseDate = caseItem.incident_date || caseItem.date;
    const sanctionText = caseItem.sanction_type || (caseItem.sanction ? caseItem.sanction.type : "—");
    const currentStatus = caseItem.status || "Under Investigation";

    return `
        <tr>
            <td>
                <button class="text-button" onclick="showCase('${caseId}')">
                    ${caseId}
                </button>
            </td>
            <td>
                <button class="text-button" onclick="showStudent('${sId}')">
                    ${studentName}
                </button>
            </td>
            <td><strong>${incidentName}</strong></td>
            <td>${typeof formatDate === "function" ? formatDate(caseDate) : caseDate}</td>
            <td>${typeof severityBadge === "function" ? severityBadge(caseItem.severity) : caseItem.severity}</td>
            <td>${typeof statusBadge === "function" ? statusBadge(currentStatus) : currentStatus}</td>
            <td>${sanctionText}</td>
            <td>
                <div class="table-actions" style="display: flex; gap: 6px; align-items: center;">
                    <button class="action-button" onclick="showCase('${caseId}')">
                        View
                    </button>
                    <button class="action-button" onclick="showStudent('${sId}')">
                        History (${studentCaseCount})
                    </button>
                    <select 
                        class="status-action-select" 
                        onchange="updateCaseStatus('${caseId}', this.value)"
                        style="
                            padding: 0 24px 0 10px !important; 
                            height: 32px !important; 
                            line-height: 32px !important; 
                            font-size: 0.82rem !important; 
                            box-sizing: border-box !important; 
                            vertical-align: middle !important;
                            min-width: 130px !important;
                            border-radius: 6px !important;
                            background-color: rgba(255, 255, 255, 0.08) !important;
                            color: #e2e8f0 !important;
                            border: 1px solid rgba(255, 255, 255, 0.18) !important;
                        "
                    >
                        <option value="" disabled selected>Change Status</option>
                        ${(typeof caseStatuses !== "undefined" ? caseStatuses : ["Under Investigation", "Sanction Pending", "Active", "Follow-up", "Closed"])
                            .map(statusOption => `
                                <option value="${statusOption}" ${currentStatus === statusOption ? "disabled" : ""}>
                                    ${statusOption === "Closed" ? "Archive / Close" : statusOption}
                                </option>
                            `).join("")}
                    </select>
                </div>
            </td>
        </tr>
    `;
}

function getCurrentCaseSearch() {
    const searchBox = document.getElementById("caseSearchBox");
    return searchBox ? searchBox.value : "";
}

function getCurrentCaseSeverity() {
    const el = document.getElementById("caseSeverityFilter");
    return el ? el.value : "";
}

function getCurrentCaseStatus() {
    const el = document.getElementById("caseStatusFilter");
    return el ? el.value : "";
}

function showNewCaseModal() {
    const form = document.getElementById("newCaseForm");
    if (form) form.reset();

    const dateInput = document.getElementById("caseDate");
    if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];

    const previewBox = document.getElementById("caseStudentPreview");
    if (previewBox) previewBox.style.display = "none";

    const searchInput = document.getElementById("studentSearchInput");
    const hiddenSelect = document.getElementById("caseStudentSelect");
    const resultsContainer = document.getElementById("studentSearchResults");

    if (searchInput) searchInput.value = "";
    if (hiddenSelect) hiddenSelect.value = "";
    if (resultsContainer) resultsContainer.style.display = "none";

    // Uncheck all incident checkboxes
    document.querySelectorAll('input[name="incident_types"]').forEach(cb => cb.checked = false);
    
    // Reset custom inputs & calculator
    toggleOtherIncidentInput();
    toggleOtherSanctionInput();

    // Dynamically retrieve active logged-in teacher's name
    const activeOfficial = getActiveFilingUser();

    // Update filing official text fields in the modal UI
    const filedByDisplay = document.getElementById("caseFiledByDisplay");
    if (filedByDisplay) {
        filedByDisplay.textContent = activeOfficial;
    }

    const filingOfficialDisplay = document.getElementById("filingOfficialDisplay");
    if (filingOfficialDisplay) {
        filingOfficialDisplay.textContent = activeOfficial;
    }

    if (typeof populateSectionDropdown === "function") {
        populateSectionDropdown("caseSectionFilter");
    }

    const recommendation = document.getElementById("recommendationBox");
    if (recommendation) {
        recommendation.innerHTML = `
            <div class="recommendation-icon">✦</div>
            <div>
                <strong>Automatic Assessment</strong>
                <p>Select one or more incident types to see recommended severity and sanction.</p>
            </div>
        `;
    }

    openModal("newCaseModal");
}

function handleStudentSearch(query) {
    const sectionVal = document.getElementById("caseSectionFilter")?.value;
    const resultsContainer = document.getElementById("studentSearchResults");
    if (!resultsContainer) return;

    const searchTerm = String(query || "").trim().toLowerCase();

    const filtered = (students || []).filter(student => {
        const fullName = String(getStudentFullName(student) || "").toLowerCase();
        
        let matchesSection = true;
        if (sectionVal) {
            const [grade, sec] = sectionVal.split(" - ");
            matchesSection = student.grade_level === grade && student.section === sec;
        }

        const matchesSearch = !searchTerm || 
            fullName.includes(searchTerm) || 
            String(student.student_id || student.id || "").toLowerCase().includes(searchTerm);

        return matchesSection && matchesSearch;
    });

    if (filtered.length === 0) {
        resultsContainer.innerHTML = `<div class="autocomplete-item empty">No matching students found</div>`;
        resultsContainer.style.display = "block";
        return;
    }

    resultsContainer.innerHTML = filtered.slice(0, 10).map(s => {
        const fullName = getStudentFullName(s);
        const dbId = s.id || s.student_id;
        const caseCount = s.cases ?? (cases || []).filter(c => (String(c.student_id) === String(dbId) || String(c.studentId) === String(s.student_id))).length;

        return `
            <div class="autocomplete-item" onclick="selectStudentForCase('${dbId}')">
                <div>
                    <strong>${fullName}</strong>
                    <small>${s.grade_level || ''} ${s.section || ''} | ID: ${s.student_id || s.id || 'N/A'}</small>
                </div>
                <span class="badge ${caseCount > 0 ? 'badge-high' : 'badge-low'}">${caseCount} ${caseCount === 1 ? 'case' : 'cases'}</span>
            </div>
        `;
    }).join("");

    resultsContainer.style.display = "block";
}

function selectStudentForCase(studentKey) {
    const student = (students || []).find(s => String(s.id) === String(studentKey) || String(s.student_id) === String(studentKey));
    if (!student) return;

    const dbPrimaryKey = student.id || student.student_id;
    
    document.getElementById("caseStudentSelect").value = dbPrimaryKey;
    document.getElementById("studentSearchInput").value = getStudentFullName(student);

    const sectionFilter = document.getElementById("caseSectionFilter");
    if (sectionFilter && student.grade_level && student.section) {
        sectionFilter.value = `${student.grade_level} - ${student.section}`;
    }

    const resultsContainer = document.getElementById("studentSearchResults");
    if (resultsContainer) resultsContainer.style.display = "none";

    if (typeof onStudentSelected === "function") {
        onStudentSelected(dbPrimaryKey, "caseStudentPreview");
    }
}

// Custom "Other Incident" input toggle
function toggleOtherIncidentInput() {
    const isOtherChecked = document.getElementById("otherIncidentCheckbox")?.checked;
    const container = document.getElementById("otherIncidentContainer");
    if (container) container.style.display = isOtherChecked ? "block" : "none";
}

// Custom "Other Sanction" & Suspension Calculator toggle
function toggleOtherSanctionInput() {
    const selectedSanction = document.getElementById("caseSanction")?.value || "";
    const customContainer = document.getElementById("otherSanctionContainer");
    const suspensionContainer = document.getElementById("suspensionCalculatorContainer");

    if (customContainer) {
        customContainer.style.display = (selectedSanction === "Other") ? "block" : "none";
    }

    const isSuspension = selectedSanction.toLowerCase().includes("suspension");
    if (suspensionContainer) {
        suspensionContainer.style.display = isSuspension ? "block" : "none";
        
        if (isSuspension) {
            const daysInput = document.getElementById("suspensionDays");
            if (daysInput) {
                if (selectedSanction === "2 Days Suspension") daysInput.value = 2;
                else if (selectedSanction === "3 Days Suspension") daysInput.value = 3;
                else if (!daysInput.value) daysInput.value = 2;
            }

            const startDateInput = document.getElementById("suspensionStartDate");
            if (startDateInput && !startDateInput.value) {
                startDateInput.value = new Date().toISOString().split("T")[0];
            }

            calculateSuspensionLiftingDate();
        }
    }
}

// Calculate suspension return date skipping weekends (Saturday/Sunday)
function calculateSuspensionLiftingDate() {
    const startDateVal = document.getElementById("suspensionStartDate")?.value;
    const daysVal = parseInt(document.getElementById("suspensionDays")?.value || "1", 10);
    const resultBadge = document.getElementById("suspensionResultBadge");

    if (!startDateVal || isNaN(daysVal) || daysVal <= 0) {
        if (resultBadge) resultBadge.textContent = "Return / Lifting Date: Please specify valid date and days.";
        return null;
    }

    let currentDate = new Date(startDateVal);
    let addedSchoolDays = 0;

    // Skip Saturday (6) and Sunday (0)
    while (addedSchoolDays < daysVal) {
        currentDate.setDate(currentDate.getDate() + 1);
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            addedSchoolDays++;
        }
    }

    const options = { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' };
    const formattedLiftingDate = currentDate.toLocaleDateString('en-US', options);
    const isoLiftingDate = currentDate.toISOString().split("T")[0];

    if (resultBadge) {
        resultBadge.innerHTML = `
            <span> Lifted / Student Return Date: <strong>${formattedLiftingDate}</strong></span>
        `;
    }

    return {
        startDate: startDateVal,
        days: daysVal,
        liftingDate: isoLiftingDate,
        formattedLiftingDate: formattedLiftingDate
    };
}

// Multiple Incident Recommendation Calculator
function updateMultiCaseRecommendation() {
    const checkboxes = document.querySelectorAll('input[name="incident_types"]:checked');
    const severitySelect = document.getElementById("caseSeverity");
    const sanctionSelect = document.getElementById("caseSanction");
    const recommendation = document.getElementById("recommendationBox");

    if (!recommendation) return;

    if (checkboxes.length === 0) {
        recommendation.innerHTML = `
            <div class="recommendation-icon">✦</div>
            <div>
                <strong>Automatic Assessment</strong>
                <p>Select one or more incident types to see recommended severity and sanction.</p>
            </div>
        `;
        return;
    }

    const severityOrder = { "Low": 1, "Medium": 2, "High": 3, "Critical": 4 };
    let highestSeverity = "Low";
    let selectedSanctions = [];

    checkboxes.forEach(cb => {
        const type = cb.value;
        const rule = (typeof caseRules !== "undefined") ? caseRules[type] : null;
        if (rule) {
            if (severityOrder[rule.severity] > severityOrder[highestSeverity]) {
                highestSeverity = rule.severity;
            }
            if (rule.sanction && !selectedSanctions.includes(rule.sanction)) {
                selectedSanctions.push(rule.sanction);
            }
        }
    });

    if (severitySelect) severitySelect.value = highestSeverity;
    if (sanctionSelect && selectedSanctions.length > 0) {
        sanctionSelect.value = selectedSanctions[0];
        toggleOtherSanctionInput();
    }

    recommendation.innerHTML = `
        <div class="recommendation-icon">✦</div>
        <div>
            <strong>Combined Incident Assessment (${checkboxes.length} selected)</strong>
            <p><b>Recommended Severity:</b> ${highestSeverity} | <b>Suggested Sanction(s):</b> ${selectedSanctions.join(", ")}</p>
        </div>
    `;
}

async function saveNewCase(e) {
    e.preventDefault();

    const studentSelect = document.getElementById("caseStudentSelect");
    const studentId = studentSelect ? studentSelect.value : "";

    const checkedIncidents = Array.from(document.querySelectorAll('input[name="incident_types"]:checked')).map(cb => cb.value);
    
    if (checkedIncidents.length === 0) {
        if (typeof showToast === "function") showToast("Please select at least one incident type.", "error");
        return;
    }

    if (checkedIncidents.includes("Other")) {
        const customText = document.getElementById("customIncidentText")?.value.trim();
        if (customText) {
            const index = checkedIncidents.indexOf("Other");
            checkedIncidents[index] = customText;
        }
    }

    const incidentTypeString = checkedIncidents.join(", ");

    // Determine assigned sanction
    let assignedSanction = document.getElementById("caseSanction")?.value || "Subject for Counseling";
    if (assignedSanction === "Other") {
        assignedSanction = document.getElementById("customSanctionText")?.value.trim() || "Custom Sanction";
    }

    // Append calculated suspension indicator info
    let extraSuspensionNote = "";
    if (assignedSanction.toLowerCase().includes("suspension")) {
        const suspensionInfo = calculateSuspensionLiftingDate();
        if (suspensionInfo) {
            assignedSanction = `${assignedSanction} (${suspensionInfo.days} Days)`;
            extraSuspensionNote = `\n\n[SUSPENSION EFFECTIVITY]\nEffective Date: ${suspensionInfo.startDate}\nDuration: ${suspensionInfo.days} School Days\nLifting Date: ${suspensionInfo.formattedLiftingDate}`;
        }
    }

    const severity = document.getElementById("caseSeverity")?.value || "Low";
    const incidentDate = document.getElementById("caseDate")?.value || new Date().toISOString().split("T")[0];
    const location = document.getElementById("caseLocation")?.value || "";
    let description = document.getElementById("caseDescription")?.value.trim() || "";
    const fileInput = document.getElementById("caseNarrativeFile");

    if (extraSuspensionNote) {
        description += extraSuspensionNote;
    }

    if (!studentId || !incidentTypeString || !description) {
        if (typeof showToast === "function") showToast("Please select a student, incident type, and write a description.", "error");
        return;
    }

    const activeOfficial = getActiveFilingUser();

    const formData = new FormData();
    formData.append("student_id", studentId);
    formData.append("filed_by", activeOfficial);
    formData.append("recorded_by", activeOfficial);
    formData.append("incident_type", incidentTypeString);
    formData.append("sanction_type", assignedSanction);
    formData.append("severity", severity);
    formData.append("incident_date", incidentDate);
    formData.append("location", location);
    formData.append("description", description);

    if (fileInput && fileInput.files[0]) {
        formData.append("narrative_file", fileInput.files[0]);
    }

    try {
        const response = await createCaseRecord(formData);

        if (response && response.status === "success") {
            if (typeof showToast === "function") {
                showToast(`Case ${response.case_no || ''} logged successfully!`);
            }

            closeModal("newCaseModal");

            if (typeof loadDataFromBackend === "function") await loadDataFromBackend();

            if (typeof currentPage !== "undefined" && currentPage === "dashboard" && typeof renderDashboard === "function") {
                await renderDashboard();
            } else if (typeof renderCases === "function") {
                await renderCases();
            }
        } else {
            if (typeof showToast === "function") {
                showToast(response ? response.message : "Failed to create case in database.", "error");
            }
        }
    } catch (err) {
        console.error("Error creating case record:", err);
        if (typeof showToast === "function") showToast("Server error. Failed to create case.", "error");
    }
}

async function updateCaseStatus(caseId, newStatus) {
    if (!newStatus) {
        if (typeof showToast === "function") showToast("Please select a case status.");
        return;
    }

    try {
        const response = await fetchAPI("cases.php", "POST", {
            action: "update_status",
            case_id: caseId,
            status: newStatus
        });

        if (response && response.status === "success") {
            if (typeof showToast === "function") {
                if (newStatus === "Closed") {
                    showToast(`Case ${caseId} closed and moved to History.`);
                    closeModal("caseModal");
                } else {
                    showToast(`Case status updated to ${newStatus}.`);
                }
            }

            if (typeof currentPage !== "undefined" && currentPage === "cases") await renderCases();
            if (typeof currentPage !== "undefined" && currentPage === "history" && typeof renderHistory === "function") await renderHistory();
            if (typeof currentPage !== "undefined" && currentPage === "dashboard" && typeof renderDashboard === "function") await renderDashboard();
        } else {
            if (typeof showToast === "function") showToast(response.message || "Failed to update case status.");
        }
    } catch (err) {
        console.error("Error updating case status:", err);
        if (typeof showToast === "function") showToast("Server error. Unable to update status.");
    }
}

async function sendParentSMSNotice(caseId) {
    if (!confirm(`Send SMS notification notice to parent/guardian for Case ${caseId}?`)) {
        return;
    }

    try {
        const response = await fetch("backend/api/cases.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=UTF-8"
            },
            body: JSON.stringify({
                action: "send_sms_notice",
                case_id: caseId
            })
        }).then(res => res.json());

        if (response && response.status === "success") {
            if (typeof showToast === "function") showToast("SMS notification sent to parent successfully!");
        } else {
            if (typeof showToast === "function") showToast(response ? response.message : "Failed to send SMS.", "error");
        }
    } catch (err) {
        console.error("Error sending SMS:", err);
        if (typeof showToast === "function") showToast("Server error. Could not dispatch SMS notice.", "error");
    }
}

function showCase(caseId) {
    const caseItem = (cases || []).find(item => String(item.case_no) === String(caseId) || String(item.id) === String(caseId));
    if (!caseItem) return;

    const sId = caseItem.student_id || caseItem.studentId;
    const student = getStudent(sId);
    const modalTitle = document.getElementById("caseModalTitle");
    const details = document.getElementById("caseDetails");

    if (!modalTitle || !details) return;

    const cNo = caseItem.case_no || caseItem.id;
    const incidentName = caseItem.incident_type || caseItem.incident;
    const caseDate = caseItem.incident_date || caseItem.date;
    const studentName = caseItem.student_name || (student ? getStudentFullName(student) : 'Unknown Student');

    modalTitle.textContent = cNo;
    const narrativeFile = caseItem.narrative_report;

    details.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <span class="detail-label">Student</span>
                <span class="detail-value">${studentName}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Filed / Logged By</span>
                <span class="detail-value"><strong>${caseItem.filed_by || caseItem.filedBy || caseItem.recorded_by || getActiveFilingUser()}</strong></span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Incident(s)</span>
                <span class="detail-value"><strong>${incidentName}</strong></span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Date</span>
                <span class="detail-value">${typeof formatDate === "function" ? formatDate(caseDate) : caseDate}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Location</span>
                <span class="detail-value">${caseItem.location || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Severity</span>
                <span class="detail-value">${typeof severityBadge === "function" ? severityBadge(caseItem.severity) : caseItem.severity}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Status</span>
                <span class="detail-value">${typeof statusBadge === "function" ? statusBadge(caseItem.status) : caseItem.status}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Assigned Sanction</span>
                <span class="detail-value">${caseItem.sanction_type || (caseItem.sanction ? caseItem.sanction.type : "Not assigned")}</span>
            </div>
        </div>

        <div class="case-status-editor">
            <div>
                <label>Update Case Status</label>
                <select id="caseStatusUpdate" class="filter-select" style="width: 100%;">
                    ${(typeof caseStatuses !== "undefined" ? caseStatuses : ["Under Investigation", "Sanction Pending", "Active", "Follow-up", "Closed"]).map(statusOption => `
                        <option value="${statusOption}" ${caseItem.status === statusOption ? "selected" : ""}>
                            ${statusOption}
                        </option>
                    `).join("")}
                </select>
            </div>
            <button class="primary-button" onclick="updateCaseStatus('${cNo}', document.getElementById('caseStatusUpdate').value)">
                Update Status
            </button>
        </div>

        <div class="description-box">
            <div class="detail-label">Description</div>
            <p>${caseItem.description || 'No detailed description provided.'}</p>
        </div>

        <!-- Student Narrative Report Section (Attach / View File) -->
        <div class="narrative-box" style="margin-top: 15px; padding: 14px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px;">
            <div class="detail-label" style="color: #60a5fa; font-weight: 600; margin-bottom: 8px;">
                📄 Student Narrative Report
            </div>
            
            ${narrativeFile ? `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
                    <a href="backend/${narrativeFile}" target="_blank" class="primary-button" style="display: inline-flex; align-items: center; gap: 8px; font-size: 0.85rem; padding: 8px 14px; text-decoration: none;">
                        View / Download Attached Narrative
                    </a>
                    <button class="text-button" onclick="document.getElementById('lateNarrativeInput').style.display = 'block'" style="font-size: 0.82rem; color: #a0aec0;">
                        Replace File
                    </button>
                </div>
            ` : `
                <p style="font-size: 0.85rem; color: #a0aec0; margin-bottom: 10px;">No narrative statement attached yet.</p>
            `}

            <div id="lateNarrativeInput" style="display: ${narrativeFile ? 'none' : 'block'}; margin-top: 10px;">
                <div style="display: flex; gap: 8px; align-items: center;">
                    <input 
                        type="file" 
                        id="lateNarrativeFile" 
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        style="padding: 6px; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; width: 100%; color: #e2e8f0; background: rgba(255,255,255,0.05); font-size: 0.85rem;"
                    >
                    <button class="primary-button" onclick="uploadLateNarrativeReport('${cNo}')" style="white-space: nowrap; padding: 8px 14px;">
                        Upload File
                    </button>
                </div>
                <small style="color: #888; display: block; margin-top: 4px;">Upload signed statement or student narrative (PDF, DOC, DOCX, JPG, PNG).</small>
            </div>
        </div>

        <div class="timeline">
            <h3 class="timeline-title">Case Timeline</h3>
            <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div>
                    <strong>Incident Reported</strong>
                    <span>${typeof formatDate === "function" ? formatDate(caseDate) : caseDate} — Logged by ${caseItem.filed_by || caseItem.filedBy || caseItem.recorded_by || getActiveFilingUser()}</span>
                </div>
            </div>
            ${narrativeFile ? `
                <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div>
                        <strong>Student Narrative Report Attached</strong>
                        <span>Statement uploaded to digital case file.</span>
                    </div>
                </div>
            ` : ''}
            <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div>
                    <strong>Initial Assessment</strong>
                    <span>Case recorded and assessed.</span>
                </div>
            </div>
        </div>

        <div class="modal-actions" style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end;">
            <button class="secondary-button" onclick="sendParentSMSNotice('${cNo}')" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);">
                📱 Send Parent SMS
            </button>
            <button class="secondary-button" onclick="printCaseReport('${cNo}')">
                🖨️ Print Report
            </button>
            <button class="secondary-button" onclick="closeModal('caseModal'); showStudent('${sId}')">
                Student History
            </button>
            <button class="primary-button" onclick="showSanctionModal('${cNo}')">
                ${(caseItem.sanction_type || caseItem.sanction) ? "Manage Sanction" : "Assign Sanction"}
            </button>
            <button class="secondary-button" onclick="removeMistakenCase('${cNo}')" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);">
                🗑️ Remove Case (Mistaken Accusation)
            </button>
        </div>
    `;

    openModal("caseModal");
}

async function removeMistakenCase(caseId) {
    const reason = prompt("Enter reason for removing this case (e.g. Mistaken identity, False accusation, Incorrect logging):", "Mistakenly accused / Dismissed after review");
    
    if (reason === null) return;

    if (!confirm(`Are you sure you want to permanently remove Case ${caseId}? This will clear the case from the student's record.`)) {
        return;
    }

    try {
        const response = await fetch("backend/api/cases.php", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json; charset=UTF-8"
            },
            body: JSON.stringify({
                case_id: caseId,
                reason: reason
            })
        }).then(res => res.json());

        if (response && response.status === "success") {
            if (typeof showToast === "function") showToast(`Case ${caseId} removed from student record!`);
            closeModal("caseModal");

            if (typeof loadDataFromBackend === "function") await loadDataFromBackend();

            if (typeof currentPage !== "undefined" && currentPage === "cases" && typeof renderCases === "function") await renderCases();
            if (typeof currentPage !== "undefined" && currentPage === "history" && typeof renderHistory === "function") await renderHistory();
            if (typeof currentPage !== "undefined" && currentPage === "dashboard" && typeof renderDashboard === "function") await renderDashboard();
        } else {
            if (typeof showToast === "function") showToast(response ? response.message : "Failed to remove case.", "error");
        }
    } catch (err) {
        console.error("Error removing case:", err);
        if (typeof showToast === "function") showToast("Server error. Unable to remove case.", "error");
    }
}

async function uploadLateNarrativeReport(caseId) {
    const fileInput = document.getElementById("lateNarrativeFile");
    if (!fileInput || !fileInput.files[0]) {
        if (typeof showToast === "function") showToast("Please select a file to upload.", "error");
        return;
    }

    const formData = new FormData();
    formData.append("action", "upload_narrative");
    formData.append("case_id", caseId);
    formData.append("narrative_file", fileInput.files[0]);

    try {
        const response = await fetch("backend/api/cases.php", {
            method: "POST",
            body: formData
        }).then(res => res.json());

        if (response && response.status === "success") {
            if (typeof showToast === "function") showToast("Narrative report uploaded successfully!");
            
            if (typeof loadDataFromBackend === "function") await loadDataFromBackend();
            showCase(caseId);
        } else {
            if (typeof showToast === "function") showToast(response ? response.message : "Failed to upload file.", "error");
        }
    } catch (err) {
        console.error("Upload error:", err);
        if (typeof showToast === "function") showToast("Server error while uploading narrative file.", "error");
    }
}

function printCaseReport(caseId) {
    const caseItem = (cases || []).find(item => String(item.case_no) === String(caseId) || String(item.id) === String(caseId));
    if (!caseItem) return;

    const sId = caseItem.student_id || caseItem.studentId;
    const student = getStudent(sId);
    const fullName = caseItem.student_name || (student ? getStudentFullName(student) : 'N/A');
    const caseDate = caseItem.incident_date || caseItem.date;
    const filingOfficial = caseItem.filed_by || caseItem.filedBy || caseItem.recorded_by || getActiveFilingUser();

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Incident Report - ${caseItem.case_no || caseItem.id}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; color: #111; line-height: 1.5; }
                .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 15px; margin-bottom: 25px; }
                .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; }
                .header p { margin: 4px 0 0; font-size: 13px; color: #555; }
                .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 20px; margin-bottom: 10px; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px; }
                .grid-item { font-size: 13px; }
                .grid-item strong { display: block; font-size: 11px; text-transform: uppercase; color: #666; }
                .box { border: 1px solid #ccc; padding: 12px; border-radius: 6px; font-size: 13px; background: #f9f9f9; }
                .signatures { margin-top: 60px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center; }
                .sig-line { border-top: 1px solid #333; margin-top: 45px; padding-top: 5px; font-size: 12px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Caloocan High School</h1>
                <p>Student Discipline & Guidance Office • Official Incident Report</p>
            </div>

            <div class="section-title">Case Overview</div>
            <div class="grid">
                <div class="grid-item"><strong>Case Reference Number</strong> ${caseItem.case_no || caseItem.id}</div>
                <div class="grid-item"><strong>Incident Date</strong> ${typeof formatDate === "function" ? formatDate(caseDate) : caseDate}</div>
                <div class="grid-item"><strong>Incident Type(s)</strong> ${caseItem.incident_type || caseItem.incident}</div>
                <div class="grid-item"><strong>Incident Location</strong> ${caseItem.location || 'N/A'}</div>
                <div class="grid-item"><strong>Severity Level</strong> ${caseItem.severity}</div>
                <div class="grid-item"><strong>Filed By</strong> ${filingOfficial}</div>
                <div class="grid-item"><strong>Case Status</strong> ${caseItem.status}</div>
                <div class="grid-item"><strong>Student Narrative Attached</strong> ${caseItem.narrative_report ? 'Yes (Archived in Digital Record)' : 'No'}</div>
            </div>

            <div class="section-title">Student Details</div>
            <div class="grid">
                <div class="grid-item"><strong>Student Name</strong> ${fullName}</div>
                <div class="grid-item"><strong>Student ID / LRN</strong> ${student ? (student.student_id || student.id || 'N/A') : 'N/A'}</div>
                <div class="grid-item"><strong>Grade & Section</strong> ${student ? ((student.grade_level || '') + ' - ' + (student.section || '')) : 'N/A'}</div>
                <div class="grid-item"><strong>Guardian Name & Contact</strong> ${student ? ((student.guardian_name || 'N/A') + ' (' + (student.guardian_contact || 'N/A') + ')') : 'N/A'}</div>
            </div>

            <div class="section-title">Incident Description</div>
            <div class="box">${caseItem.description || 'No detailed description.'}</div>

            <div class="section-title">Disciplinary Action & Sanction</div>
            <div class="grid">
                <div class="grid-item"><strong>Assigned Sanction</strong> ${caseItem.sanction_type || (caseItem.sanction ? caseItem.sanction.type : 'None assigned')}</div>
                <div class="grid-item"><strong>Sanction Status</strong> ${caseItem.sanction_status || (caseItem.sanction ? caseItem.sanction.status : 'N/A')}</div>
            </div>

            <div class="signatures">
                <div>
                    <div class="sig-line">Discipline Officer / Counselor (${filingOfficial})</div>
                </div>
                <div>
                    <div class="sig-line">Student Signature</div>
                </div>
                <div>
                    <div class="sig-line">Parent / Guardian Signature</div>
                </div>
            </div>

            <script>
                window.onload = function() { window.print(); window.close(); }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function showSanctionModal(caseId) {
    const caseItem = (cases || []).find(item => String(item.case_no) === String(caseId) || String(item.id) === String(caseId));
    if (!caseItem) return;

    const sId = caseItem.student_id || caseItem.studentId;
    const student = getStudent(sId);
    const caseIdInput = document.getElementById("sanctionCaseId");
    const caseInfo = document.getElementById("sanctionCaseInfo");
    const sanctionType = document.getElementById("sanctionType");
    const sanctionDate = document.getElementById("sanctionDate");
    const sanctionNotes = document.getElementById("sanctionNotes");

    const cNo = caseItem.case_no || caseItem.id;
    const dbPrimaryKey = caseItem.id;
    const incidentName = caseItem.incident_type || caseItem.incident;

    if (caseIdInput) caseIdInput.value = dbPrimaryKey;

    if (caseInfo) {
        const recommended = (typeof caseRules !== "undefined" && caseRules[incidentName]) ? caseRules[incidentName].sanction : "Manual assessment";
        caseInfo.innerHTML = `
            <strong>${cNo}</strong>
            <span>${caseItem.student_name || (student ? getStudentFullName(student) : 'Student')} - ${incidentName}</span>
            <small>Recommended: ${recommended}</small>
        `;
    }

    if (sanctionType) {
        const recommended = (typeof caseRules !== "undefined" && caseRules[incidentName]) ? caseRules[incidentName].sanction : "";
        sanctionType.value = caseItem.sanction_type || (caseItem.sanction ? caseItem.sanction.type : recommended);
    }

    if (sanctionDate) {
        sanctionDate.value = new Date().toISOString().split("T")[0];
    }

    if (sanctionNotes) {
        sanctionNotes.value = caseItem.sanction ? caseItem.sanction.notes : "";
    }

    closeModal("caseModal");
    closeModal("studentModal");
    openModal("sanctionModal");
}

function checkSessionGuard() {
    const savedUser = localStorage.getItem('chs_session_user');
    
    if (!savedUser) {
        window.location.replace('login.html');
        return false;
    }

    try {
        const userObj = JSON.parse(savedUser);
        window.currentUser = userObj;

        const nameDisplay = document.getElementById('currentUserName');
        const roleDisplay = document.getElementById('currentUserRole');

        if (nameDisplay) nameDisplay.textContent = userObj.name || userObj.full_name || 'Administrator';
        if (roleDisplay) roleDisplay.textContent = userObj.role || 'Faculty';

        return true;
    } catch (e) {
        localStorage.removeItem('chs_session_user');
        window.location.replace('login.html');
        return false;
    }
}

document.addEventListener("DOMContentLoaded", async function () {
    if (!checkSessionGuard()) return;

    const caseDate = document.getElementById("caseDate");
    if (caseDate) {
        caseDate.value = new Date().toISOString().split("T")[0];
    }

    await loadDataFromBackend();

    if (typeof navigate === "function") {
        navigate(currentPage || "dashboard");
    }
});

window.addEventListener('pageshow', function (event) {
    if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
        checkSessionGuard();
    }
});