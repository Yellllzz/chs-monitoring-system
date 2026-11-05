document.addEventListener("DOMContentLoaded", async function () {
    // 1. Set default case date input to today's date (YYYY-MM-DD)
    const caseDate = document.getElementById("caseDate");
    if (caseDate) {
        caseDate.value = new Date().toISOString().split("T")[0];
    }

    // 2. Load active user session info if elements exist
    if (typeof loadSessionUser === "function") {
        loadSessionUser();
    }

    // 3. Fetch live records from MySQL database via PHP REST API
    await loadDataFromBackend();

    // 4. Navigate to initial page once database records are loaded into state
    navigate(currentPage || "dashboard");
});