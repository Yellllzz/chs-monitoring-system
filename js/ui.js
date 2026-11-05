// js/ui.js

function getStudent(id) {
    if (!id) return null;
    return students.find(s => String(s.student_id) === String(id) || String(s.id) === String(id));
}

function getStudentFullName(student) {
    if (!student) return "Unknown Student";
    if (student.first_name || student.last_name) {
        return [student.first_name, student.middle_name, student.last_name]
            .filter(Boolean)
            .join(" ");
    }
    return student.name || "Unknown Student";
}

function syncStudentCaseCounts() {
    students.forEach(student => {
        const id = student.student_id || student.id;
        student.cases = cases.filter(c => String(c.studentId || c.student_id) === String(id)).length;
    });
    saveStateToStorage();
}

function populateSectionDropdown(sectionSelectId) {
    const select = document.getElementById(sectionSelectId);
    if (!select) return;

    const sections = [...new Set(students.map(s => `${s.grade_level} - ${s.section}`))].sort();

    select.innerHTML = `<option value="">Select Section</option>` + 
        sections.map(sec => `<option value="${sec}">${sec}</option>`).join("");
}

function populateStudentDropdown(sectionSelectId, studentSelectId) {
    const sectionVal = document.getElementById(sectionSelectId)?.value;
    const studentSelect = document.getElementById(studentSelectId);
    if (!studentSelect) return;

    if (!sectionVal) {
        studentSelect.innerHTML = `<option value="">Select Section First</option>`;
        return;
    }

    const [gradeLevel, section] = sectionVal.split(" - ");

    const matchingStudents = students
        .filter(s => s.grade_level === gradeLevel && s.section === section)
        .sort((a, b) => getStudentFullName(a).localeCompare(getStudentFullName(b)));

    studentSelect.innerHTML = `<option value="">Select Student</option>` +
        matchingStudents.map(s => `
            <option value="${s.student_id || s.id}">${getStudentFullName(s)} (${s.student_id || s.id})</option>
        `).join("");
}

function onStudentSelected(studentId, previewElementId) {
    const student = getStudent(studentId);
    const previewBox = document.getElementById(previewElementId);

    if (!student || !previewBox) {
        if (previewBox) previewBox.style.display = "none";
        return;
    }

    const targetId = student.student_id || student.id;

    const studentCases = cases
        .filter(c => String(c.studentId || c.student_id) === String(targetId))
        .sort((a, b) => new Date(b.date || b.incident_date) - new Date(a.date || a.incident_date));

    let casesSummaryHtml = "";
    if (studentCases.length === 0) {
        casesSummaryHtml = `<div style="margin-top: 8px; color: var(--text-3); font-size: 11px;">No previous cases recorded.</div>`;
    } else {
        casesSummaryHtml = `
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-soft);">
                <span style="font-size: 10px; font-weight: 700; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">
                    Prior Incident History (${studentCases.length})
                </span>
                <div style="display: flex; flex-direction: column; gap: 6px; max-height: 120px; overflow-y: auto;">
                    ${studentCases.map(c => `
                        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-soft);">
                            <div>
                                <strong style="color: var(--text); font-size: 11px;">${c.incident_type || c.incident}</strong>
                                <span style="color: var(--text-3); font-size: 10px; margin-left: 6px;">${formatDate(c.incident_date || c.date)}</span>
                            </div>
                            <div>
                                ${severityBadge(c.severity)}${statusBadge(c.status)}
                            </div>
                        </div>
                    `).join("")}
                </div>
            </div>
        `;
    }

    previewBox.innerHTML = `
        <strong>${getStudentFullName(student)}</strong>
        <span>${student.grade_level} • ${student.section} | ID: ${student.student_id || student.id}</span>
        <small style="display: block; margin-top: 2px;">Guardian: ${student.guardian_name || 'N/A'} (${student.guardian_contact || 'N/A'})</small>
        ${casesSummaryHtml}
    `;

    previewBox.style.display = "block";
}

function getNextCaseNumber() {
    const numbers = cases
        .map(c => {
            const caseStr = String(c.case_no || c.id || "");
            const match = caseStr.match(/CASE-\d{4}-(\d+)/);
            return match ? Number(match[1]) : 0;
        })
        .filter(number => !isNaN(number));

    return numbers.length ? Math.max(...numbers) + 1 : 1;
}

function formatDate(date) {
    if (!date) return "—";
    return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function getInitials(name) {
    return String(name || "")
        .split(" ")
        .filter(Boolean)
        .map(word => word.charAt(0))
        .slice(0, 2)
        .join("");
}

function escapeAttribute(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function severityBadge(severity) {
    return `<span class="badge badge-${String(severity || "").toLowerCase()}">${severity || 'Low'}</span>`;
}

function statusBadge(status) {
    let className = "badge-active";
    if (status === "Under Investigation") className = "badge-investigation";
    if (status === "Sanction Pending") className = "badge-sanction-pending";
    if (status === "Follow-up") className = "badge-follow";
    if (status === "Closed") className = "badge-closed";
    if (status === "Active") className = "badge-active";

    return `<span class="badge ${className}">${status || 'Active'}</span>`;
}

function sanctionStatusBadge(status) {
    if (status === "Completed") return `<span class="badge badge-completed">Completed</span>`;
    return `<span class="badge badge-pending">Pending</span>`;
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add("show");
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove("show");
}

document.addEventListener("click", function (event) {
    if (event.target.classList.contains("modal-overlay")) {
        event.target.classList.remove("show");
    }
});

function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function showNotifications() {
    showToast("You have cases that require attention.");
}

function riskBadge(caseCount) {
    if (caseCount === 0) {
        return `<span class="badge badge-low">Clean Record</span>`;
    } else if (caseCount <= 2) {
        return `<span class="badge badge-medium">Low Risk (${caseCount})</span>`;
    } else {
        return `<span class="badge badge-high badge-pulsing">Repeat Offender (${caseCount})</span>`;
    }
}

function handleSystemLogout() {
    if (confirm("Are you sure you want to log out of the system?")) {
        // Clear active session storage items
        localStorage.removeItem('chs_session_user');
        sessionStorage.clear();
        
        // Prevent back navigation by replacing current URL in history
        window.location.replace('login.html');
    }
}