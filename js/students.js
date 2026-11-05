// js/students.js

async function renderStudents(search = "", gradeFilter = "", sectionFilter = "") {
    const pageContent = document.getElementById("pageContent");
    if (!pageContent) return;

    if (typeof loadDataFromBackend === "function") {
        await loadDataFromBackend();
    }

    const searchTerm = String(search || "").trim().toLowerCase();

    const filteredStudents = (students || [])
        .filter(student => {
            const fullName = String(getStudentFullName(student) || "").toLowerCase();
            const studentId = String(student.student_id || student.id || "").toLowerCase();
            const section = String(student.section || "").toLowerCase();

            const matchesSearch =
                fullName.includes(searchTerm) ||
                studentId.includes(searchTerm) ||
                section.includes(searchTerm);

            const matchesGrade = !gradeFilter || String(student.grade_level) === String(gradeFilter);
            const matchesSection = !sectionFilter || String(student.section) === String(sectionFilter);

            return matchesSearch && matchesGrade && matchesSection;
        })
        .sort((a, b) => (a.last_name || "").localeCompare(b.last_name || ""));

    pageContent.innerHTML = `
        <div class="page-header">
            <div>
                <h2>Student Masterlist</h2>
                <p>Manage active student records, view case histories, and handle directory entries.</p>
            </div>
            <button class="primary-button" onclick="showAddStudentModal()">
                + Add Student
            </button>
        </div>

        <div class="card">
            <div class="filter-bar">
                <div class="search-container">
                    <input
                        type="text"
                        id="studentSearchBox"
                        class="search-box"
                        placeholder="Search by name, ID, or section..."
                        value="${escapeAttribute(search)}"
                        oninput="renderStudents(this.value, getCurrentGradeFilter(), getCurrentSectionFilter())"
                    >
                </div>

                <select
                    id="studentGradeFilter"
                    class="filter-select"
                    onchange="renderStudents(getCurrentStudentSearch(), this.value, getCurrentSectionFilter())"
                >
                    <option value="">All Grade Levels</option>
                    <option value="Grade 7" ${gradeFilter === "Grade 7" ? "selected" : ""}>Grade 7</option>
                    <option value="Grade 8" ${gradeFilter === "Grade 8" ? "selected" : ""}>Grade 8</option>
                    <option value="Grade 9" ${gradeFilter === "Grade 9" ? "selected" : ""}>Grade 9</option>
                    <option value="Grade 10" ${gradeFilter === "Grade 10" ? "selected" : ""}>Grade 10</option>
                </select>

                <select
                    id="studentSectionFilter"
                    class="filter-select"
                    onchange="renderStudents(getCurrentStudentSearch(), getCurrentGradeFilter(), this.value)"
                >
                    <option value="">All Sections</option>
                    ${getUniqueSections()
                        .map(sec => `<option value="${sec}" ${sectionFilter === sec ? "selected" : ""}>${sec}</option>`)
                        .join("")}
                </select>
            </div>

            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Student Name</th>
                            <th>Student ID</th>
                            <th>Grade Level</th>
                            <th>Section</th>
                            <th>Recent Incident(s)</th>
                            <th>Status</th>
                            <th>Risk Level</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredStudents.length ? filteredStudents.map(createStudentRow).join("") : `
                            <tr>
                                <td colspan="8" class="empty-table">
                                    <div class="empty-state">
                                        <p>No active students found.</p>
                                    </div>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    const searchBox = document.getElementById("studentSearchBox");
    if (searchBox) {
        searchBox.focus();
        searchBox.setSelectionRange(searchBox.value.length, searchBox.value.length);
    }
}

function createStudentRow(student) {
    const sId = student.id || student.student_id;
    const fullName = getStudentFullName(student);
    const studentCases = (cases || []).filter(c => String(c.student_id) === String(sId) || String(c.studentId) === String(student.student_id));
    const totalCaseCount = studentCases.length;

    // Determine status badge based on cases
    const activeCase = studentCases.find(c => c.status !== "Closed");
    const statusText = activeCase ? (activeCase.status || "Active") : (totalCaseCount > 0 ? "Closed" : "—");
    const statusBadgeClass = activeCase ? "badge-medium" : (totalCaseCount > 0 ? "badge-low" : "badge-none");

    // Risk indicator
    let riskBadge = `<span class="badge badge-low" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);">Clean Record</span>`;
    if (totalCaseCount >= 3) {
        riskBadge = `<span class="badge badge-high" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3);">High Risk (${totalCaseCount})</span>`;
    } else if (totalCaseCount > 0) {
        riskBadge = `<span class="badge badge-medium" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3);">Low Risk (${totalCaseCount})</span>`;
    }

    // Incident list summary
    const incidents = Array.from(new Set(studentCases.map(c => c.incident_type || c.incident))).filter(Boolean).join(", ");

    return `
        <tr>
            <td>
                <button class="text-button" onclick="showStudent('${sId}')">
                    <strong>${fullName}</strong>
                </button>
            </td>
            <td>${student.student_id || student.id || 'N/A'}</td>
            <td>${student.grade_level || 'N/A'}</td>
            <td>${student.section || 'N/A'}</td>
            <td>${incidents || 'No cases'}</td>
            <td><span class="badge ${statusBadgeClass}">${statusText}</span></td>
            <td>${riskBadge}</td>
            <td>
                <div class="table-actions" style="display: flex; gap: 6px;">
                    <button class="action-button" onclick="showStudent('${sId}')">
                        View
                    </button>
                    <button class="action-button" onclick="archiveStudent('${sId}')" style="color: #f59e0b; border-color: rgba(245, 158, 11, 0.3); background: rgba(245, 158, 11, 0.1);">
                        Archive
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function getUniqueSections() {
    if (!students || !Array.isArray(students)) return [];
    const sections = students.map(s => s.section).filter(Boolean);
    return Array.from(new Set(sections)).sort();
}

function getCurrentStudentSearch() {
    const el = document.getElementById("studentSearchBox");
    return el ? el.value : "";
}

function getCurrentGradeFilter() {
    const el = document.getElementById("studentGradeFilter");
    return el ? el.value : "";
}

function getCurrentSectionFilter() {
    const el = document.getElementById("studentSectionFilter");
    return el ? el.value : "";
}

function showAddStudentModal() {
    const form = document.getElementById("addStudentForm");
    if (form) form.reset();
    openModal("addStudentModal");
}

async function saveNewStudent(e) {
    e.preventDefault();

    const firstName = document.getElementById("newStudFirstName")?.value.trim() || "";
    const middleName = document.getElementById("newStudMiddleName")?.value.trim() || "";
    const lastName = document.getElementById("newStudLastName")?.value.trim() || "";
    const gender = document.getElementById("newStudGender")?.value || "Male";
    const gradeLevel = document.getElementById("newStudGradeLevel")?.value || "Grade 7";
    const section = document.getElementById("newStudSection")?.value.trim() || "";
    const guardianName = document.getElementById("newStudGuardianName")?.value.trim() || "";
    const guardianContact = document.getElementById("newStudGuardianContact")?.value.trim() || "";

    if (!firstName || !lastName || !gradeLevel || !section) {
        if (typeof showToast === "function") showToast("Please fill in all required student details.", "error");
        return;
    }

    // Client-side Duplicate Check
    const isDuplicate = (students || []).some(s => 
        String(s.first_name || "").toLowerCase() === firstName.toLowerCase() &&
        String(s.last_name || "").toLowerCase() === lastName.toLowerCase() &&
        String(s.grade_level || "").toLowerCase() === gradeLevel.toLowerCase()
    );

    if (isDuplicate) {
        if (typeof showToast === "function") showToast(`Student "${firstName} ${lastName}" already exists in ${gradeLevel}!`, "error");
        return;
    }

    const payload = {
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        gender: gender,
        grade_level: gradeLevel,
        section: section,
        guardian_name: guardianName,
        guardian_contact: guardianContact
    };

    try {
        const response = await createStudentRecord(payload);

        if (response && response.status === "success") {
            if (typeof showToast === "function") {
                showToast(`Student ${firstName} ${lastName} added successfully!`);
            }

            closeModal("addStudentModal");

            if (typeof loadDataFromBackend === "function") await loadDataFromBackend();

            if (typeof currentPage !== "undefined" && currentPage === "students" && typeof renderStudents === "function") {
                await renderStudents();
            }
        } else {
            if (typeof showToast === "function") {
                showToast(response ? response.message : "Failed to create student record.", "error");
            }
        }
    } catch (err) {
        console.error("Error creating student record:", err);
        if (typeof showToast === "function") showToast("Server error. Could not save student.", "error");
    }
}

async function archiveStudent(studentId) {
    const student = (students || []).find(s => String(s.id) === String(studentId) || String(s.student_id) === String(studentId));
    const name = student ? getStudentFullName(student) : "this student";

    if (!confirm(`Are you sure you want to archive ${name}? The student will be moved to inactive records.`)) {
        return;
    }

    try {
        const response = await fetch("/api/students", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json; charset=UTF-8"
            },
            body: JSON.stringify({ id: studentId })
        }).then(res => res.json());

        if (response && response.status === "success") {
            if (typeof showToast === "function") showToast(`${name} has been archived.`);
            if (typeof loadDataFromBackend === "function") await loadDataFromBackend();
            if (typeof renderStudents === "function") await renderStudents();
        } else {
            if (typeof showToast === "function") showToast(response ? response.message : "Failed to archive student.", "error");
        }
    } catch (err) {
        console.error("Error archiving student:", err);
        if (typeof showToast === "function") showToast("Server error. Failed to archive student.", "error");
    }
}

function showStudent(studentKey) {
    const student = (students || []).find(s => String(s.id) === String(studentKey) || String(s.student_id) === String(studentKey));
    if (!student) return;

    const modalTitle = document.getElementById("studentModalTitle");
    const details = document.getElementById("studentDetails");

    if (!modalTitle || !details) return;

    const fullName = getStudentFullName(student);
    const sId = student.id || student.student_id;
    const studentCases = (cases || []).filter(c => String(c.student_id) === String(sId) || String(c.studentId) === String(student.student_id));

    modalTitle.textContent = fullName;

    details.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <span class="detail-label">Student ID / LRN</span>
                <span class="detail-value">${student.student_id || student.id || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Gender</span>
                <span class="detail-value">${student.gender || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Grade & Section</span>
                <span class="detail-value">${student.grade_level || ''} - ${student.section || ''}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Total Cases On Record</span>
                <span class="detail-value"><strong>${studentCases.length}</strong></span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Guardian Name</span>
                <span class="detail-value">${student.guardian_name || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Guardian Contact</span>
                <span class="detail-value">${student.guardian_contact || 'N/A'}</span>
            </div>
        </div>

        <h3 style="margin: 20px 0 10px 0; font-size: 1.05rem; color: #e2e8f0;">Disciplinary Case History</h3>
        
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Case ID</th>
                        <th>Incident(s)</th>
                        <th>Date</th>
                        <th>Severity</th>
                        <th>Status</th>
                        <th>Sanction</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${studentCases.length ? studentCases.map(c => `
                        <tr>
                            <td><strong>${c.case_no || c.id}</strong></td>
                            <td>${c.incident_type || c.incident}</td>
                            <td>${typeof formatDate === "function" ? formatDate(c.incident_date || c.date) : (c.incident_date || c.date)}</td>
                            <td>${typeof severityBadge === "function" ? severityBadge(c.severity) : c.severity}</td>
                            <td>${typeof statusBadge === "function" ? statusBadge(c.status) : c.status}</td>
                            <td>${c.sanction_type || '—'}</td>
                            <td>
                                <button class="action-button" onclick="closeModal('studentModal'); showCase('${c.case_no || c.id}')">
                                    View
                                </button>
                            </td>
                        </tr>
                    `).join("") : `
                        <tr>
                            <td colspan="7" class="empty-table">
                                <p>Clean record. No cases on file.</p>
                            </td>
                        </tr>
                    `}
                </tbody>
            </table>
        </div>

        <div class="modal-actions">
            <button class="secondary-button" onclick="closeModal('studentModal')">Close</button>
            <button class="action-button" onclick="closeModal('studentModal'); archiveStudent('${sId}')" style="color: #f59e0b; border-color: rgba(245, 158, 11, 0.3); background: rgba(245, 158, 11, 0.1);">
                Archive Student
            </button>
        </div>
    `;

    openModal("studentModal");
}