// js/navigation.js

async function navigate(pageName) {
    if (!pageName) return;

    currentPage = pageName;

    // Highlight active navbar item
    document.querySelectorAll('.nav-item').forEach(item => {
        const isCurrent = item.getAttribute('data-page') === pageName;
        item.classList.toggle('active', isCurrent);
    });

    // Update Topbar Title
    const pageTitleElem = document.getElementById('pageTitle');
    if (pageTitleElem) {
        pageTitleElem.textContent = pageName.charAt(0).toUpperCase() + pageName.slice(1);
    }

    const contentElem = document.getElementById('pageContent');
    if (!contentElem) return;

    // Clear previous page content while loading
    contentElem.innerHTML = '<div class="empty-state">Loading data...</div>';

    // Synchronize latest database state
    if (typeof loadDataFromBackend === 'function') {
        await loadDataFromBackend();
    }

    try {
        switch (pageName) {
            case 'dashboard':
                if (typeof renderDashboard === 'function') await renderDashboard();
                break;
            case 'students':
                if (typeof renderStudents === 'function') await renderStudents();
                break;
            case 'cases':
                if (typeof renderCases === 'function') await renderCases();
                break;
            case 'sanctions':
                if (typeof renderSanctions === 'function') await renderSanctions();
                break;
            case 'history':
                if (typeof renderHistory === 'function') await renderHistory();
                break;
            case 'reports':
                if (typeof renderReports === 'function') await renderReports();
                break;
            default:
                if (typeof renderDashboard === 'function') await renderDashboard();
        }
    } catch (err) {
        console.error(`[Navigation Error] Failed rendering page "${pageName}":`, err);
        contentElem.innerHTML = `
            <div class="card" style="padding: 30px; text-align: center;">
                <h3 style="color: var(--red); margin-bottom: 8px;">Failed to load view</h3>
                <p style="color: var(--text-3); font-size: 13px;">${err.message}</p>
            </div>
        `;
    }
}