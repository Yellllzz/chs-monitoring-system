// js/cases.js

function getActiveFilingUser() {
    if (typeof currentUser !== "undefined" && currentUser) {
        const name = currentUser.name || currentUser.full_name || currentUser.username;
        if (name) return name;
    }
    
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

async function showNewCaseModal() {
    const form = document.getElementById("newCaseForm");
    if (form) form.reset();

    if (typeof loadDataFromBackend === "function") {
        await loadDataFromBackend();
    }

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

    document.querySelectorAll('input[name="incident_types"]').forEach(cb => cb.checked = false);
    
    toggleOtherIncidentInput();
    toggleOtherSanctionInput();

    const activeOfficial = getActiveFilingUser();
    const filedByDisplay = document.getElementById("caseFiledByDisplay");
    if (filedByDisplay) filedByDisplay.textContent = activeOfficial;

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
    
    const dbPrimaryKey = student ? (student.id || student.student_id) : studentKey;
    const displayName = student ? getStudentFullName(student) : studentKey;
    
    document.getElementById("caseStudentSelect").value = dbPrimaryKey;
    document.getElementById("studentSearchInput").value = displayName;

    if (student && student.grade_level && student.section) {
        const sectionFilter = document.getElementById("caseSectionFilter");
        if (sectionFilter) sectionFilter.value = `${student.grade_level} - ${student.section}`;
    }

    const resultsContainer = document.getElementById("studentSearchResults");
    if (resultsContainer) resultsContainer.style.display = "none";

    if (student && typeof onStudentSelected === "function") {
        onStudentSelected(dbPrimaryKey, "caseStudentPreview");
    }
}

function toggleOtherIncidentInput() {
    const isOtherChecked = document.getElementById("otherIncidentCheckbox")?.checked;
    const container = document.getElementById("otherIncidentContainer");
    if (container) container.style.display = isOtherChecked ? "block" : "none";
}

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
        resultBadge.innerHTML = `<span> Lifted / Student Return Date: <strong>${formattedLiftingDate}</strong></span>`;
    }

    return {
        startDate: startDateVal,
        days: daysVal,
        liftingDate: isoLiftingDate,
        formattedLiftingDate: formattedLiftingDate
    };
}

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
    let studentId = studentSelect ? studentSelect.value.trim() : "";

    // Fallback: If hidden select is empty, attempt to match from search input text
    if (!studentId) {
        const searchInputVal = document.getElementById("studentSearchInput")?.value.trim().toLowerCase();
        if (searchInputVal) {
            const matched = (students || []).find(s => 
                String(s.id) === searchInputVal || 
                String(s.student_id) === searchInputVal || 
                getStudentFullName(s).toLowerCase() === searchInputVal
            );
            if (matched) {
                studentId = matched.id || matched.student_id;
            }
        }
    }

    if (!studentId) {
        if (typeof showToast === "function") showToast("Please select a valid student from the search list.", "error");
        return;
    }

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

    let assignedSanction = document.getElementById("caseSanction")?.value || "Subject for Counseling";
    if (assignedSanction === "Other") {
        assignedSanction = document.getElementById("customSanctionText")?.value.trim() || "Custom Sanction";
    }

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

    if (extraSuspensionNote) {
        description += extraSuspensionNote;
    }

    if (!incidentTypeString || !description) {
        if (typeof showToast === "function") showToast("Please select an incident type and write a description.", "error");
        return;
    }

    const activeOfficial = getActiveFilingUser();

    const payload = {
        student_id: studentId,
        filed_by: activeOfficial,
        incident_type: incidentTypeString,
        severity: severity,
        incident_date: incidentDate,
        location: location,
        description: description,
        status: "Under Investigation"
    };

    try {
        const response = await createCaseRecord(payload);

        if (response && response.status === "success") {
            if (typeof showToast === "function") {
                showToast(`Case logged successfully!`);
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