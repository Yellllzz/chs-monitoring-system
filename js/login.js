// js/login.js (Frontend Browser Script)
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm'); // Ensure your HTML login form has id="loginForm"

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Grab input values (adjust element IDs if your HTML uses different ones)
            const usernameInput = document.getElementById('username').value.trim();
            const passwordInput = document.getElementById('password').value.trim();

            if (!usernameInput || !passwordInput) {
                alert('Please enter your name/username and password.');
                return;
            }

            try {
                // Send request to your Vercel Serverless Backend Function at /api/login
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: usernameInput,
                        password: passwordInput
                    })
                });

                const data = await response.json();

                if (response.ok && data.status === 'success') {
                    // Login successful: Redirect to dashboard or home page
                    window.location.href = 'dashboard.php';
                } else {
                    // Show error message returned from the server API
                    alert(data.message || 'Access Denied: Invalid credentials or unregistered account.');
                }
            } catch (err) {
                console.error('Network or connection error:', err);
                alert('Server connection error. Please try again.');
            }
        });
    }
});