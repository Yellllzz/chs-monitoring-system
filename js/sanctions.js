

let sanctionsData = [];

async function fetchSanctionsFromAPI() {
    try {
        const response = await fetchAPI("sanctions.php", "GET");
        if (response && response.status === "success" && Array.isArray(response.data)) {
            return response.data;
        }
    } catch (err) {
        console.warn("Could not load sanctions directly from API, falling back to local cases array.", err);
    }

    // Fallback: Build sanction list from global cases array if API fetch fails
    const fallbackList = [];
    (cases || []).forEach(c => {
        if (c.sanction) {
            fallbackList.push({
                id: c.sanction.id || c.id,
                case_id: c.id,
                case_no: c.case_no || c.id,
                student_name: typeof getStudentFullName === 'function' ? getStudentFullName(getStudent(c.studentId || c.student_id)) : "Unknown Student",
                student_id: c.studentId || c.student_id,
                incident_type: c.incident || c.incident_type,
                sanction_type: c.sanction.type || c.sanction.sanction_type,
                due_date: c.sanction.date || c.sanction.due_date,
                status: c.sanction.status || "Pending"
            });
        }
    });
    return fallbackList;
}

async function renderSanctions() {
    const pageContent = document.getElementById("pageContent");
    if (!pageContent) return;

    // Fetch sanctions directly from sanctions.php endpoint
    sanctionsData = await fetchSanctionsFromAPI();

    // Filter to only show pending sanctions
    const activeSanctions = sanctionsData.filter(item => 
        (item.status || "Pending").toLowerCase() === "pending"
    );

    pageContent.innerHTML = `
        <div class="page-header">
            <div>
                <h2>Sanctions</h2>
                <p>Manage pending disciplinary actions assigned to student cases.</p>
            </div>
        </div>

        <div class="card">
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Case ID</th>
                            <th>Incident</th>
                            <th>Sanction</th>
                            <th>Due Date</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${activeSanctions.length > 0 ? activeSanctions.map(createSanctionRowFromData).join("") : `
                            <tr>
                                <td colspan="7" class="empty-table">
                                    <div class="empty-state">No pending sanctions found.</div>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function createSanctionRowFromData(sanctionItem) {
    const studentName = sanctionItem.student_name || "Unknown Student";
    const caseDisplayId = sanctionItem.case_no || sanctionItem.case_id;

    return `
        <tr>
            <td>
                <button class="text-button" onclick="showStudent('${sanctionItem.student_id}')">
                    ${studentName}
                </button>
            </td>
            <td>
                <button class="text-button" onclick="showCase('${sanctionItem.case_id}')">
                    ${caseDisplayId}
                </button>
            </td>
            <td>${sanctionItem.incident_type || sanctionItem.incident || 'N/A'}</td>
            <td>${sanctionItem.sanction_type || sanctionItem.type || 'N/A'}</td>
            <td>${typeof formatDate === 'function' ? formatDate(sanctionItem.due_date) : sanctionItem.due_date}</td>
            <td>${typeof sanctionStatusBadge === 'function' ? sanctionStatusBadge(sanctionItem.status || 'Pending') : sanctionItem.status}</td>
            <td>
                <div class="sanction-actions">
                    <button class="action-button primary" onclick="completeSanction('${sanctionItem.case_id}')">
                        Mark Completed
                    </button>
                    <button class="action-button" onclick="showSanctionModal('${sanctionItem.case_id}')">
                        Edit
                    </button>
                </div>
            </td>
        </tr>
    `;
}

async function saveSanction(event) {
    event.preventDefault();

    const caseIdVal = document.getElementById("sanctionCaseId").value;
    const typeVal = document.getElementById("sanctionType").value;
    const dateVal = document.getElementById("sanctionDate").value;
    const notesVal = document.getElementById("sanctionNotes").value.trim();

    if (!caseIdVal || !typeVal || !dateVal) {
        if (typeof showToast === "function") showToast("Please fill in all required fields.", "error");
        return;
    }

    const targetCase = (cases || []).find(c => String(c.id) === String(caseIdVal) || c.case_no === String(caseIdVal));
    const resolvedCaseId = targetCase ? targetCase.id : caseIdVal;

    const payload = {
        case_id: resolvedCaseId,
        sanction_type: typeVal,
        due_date: dateVal,
        notes: notesVal
    };

    try {
        const response = await fetchAPI("sanctions.php", "POST", payload);

        if (response && response.status === "success") {
            if (typeof showToast === "function") {
                showToast("Sanction saved successfully!");
            }

            closeModal("sanctionModal");

            if (typeof loadDataFromBackend === "function") {
                await loadDataFromBackend();
            }

            if (typeof currentPage !== "undefined" && currentPage === "sanctions") {
                await renderSanctions();
            } else if (typeof renderSanctions === "function") {
                await renderSanctions();
            }
        } else {
            if (typeof showToast === "function") showToast(response ? response.message : "Failed to save sanction.");
        }
    } catch (err) {
        console.error("Error saving sanction:", err);
        if (typeof showToast === "function") showToast("Server error. Failed to save sanction.");
    }
}

async function completeSanction(caseId) {
    if (!caseId) return;

    try {
        const payload = {
            action: "complete_sanction",
            case_id: caseId
        };

        const response = await fetchAPI("sanctions.php", "POST", payload);

        if (response && response.status === "success") {
            if (typeof showToast === "function") {
                showToast("Sanction marked completed and archived to History.");
            }

            if (typeof loadDataFromBackend === "function") {
                await loadDataFromBackend();
            }

            if (typeof currentPage !== "undefined" && currentPage === "history" && typeof renderHistory === "function") {
                await renderHistory();
            } else {
                await renderSanctions();
            }
        } else {
            if (typeof showToast === "function") {
                showToast(response ? response.message : "Failed to complete sanction.", "error");
            }
        }
    } catch (err) {
        console.error("Error marking sanction completed:", err);
        if (typeof showToast === "function") showToast("Server error updating sanction.", "error");
    }
}