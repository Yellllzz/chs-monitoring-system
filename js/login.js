// js/login.js

async function handleLoginSubmit(event) {
    event.preventDefault();
    
    const usernameInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('loginPassword');
    const errorBanner = document.getElementById('loginError');
    const submitBtn = event.target.querySelector('button[type="submit"]');

    if (!usernameInput || !passwordInput) return;

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
        if (errorBanner) {
            errorBanner.style.display = 'block';
            errorBanner.textContent = 'Please enter both username/name and password.';
        }
        return;
    }

    if (errorBanner) errorBanner.style.display = 'none';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Signing In...</span>';
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok && data.status === 'success') {
            // Store session information locally
            localStorage.setItem('chs_session_user', JSON.stringify(data.user || {
                name: username,
                role: 'Faculty Member',
                username: username
            }));

            // Redirect to main application dashboard
            window.location.replace('index.html');
        } else {
            if (errorBanner) {
                errorBanner.style.display = 'block';
                errorBanner.textContent = data.message || 'Access Denied: Invalid credentials.';
            }
        }
    } catch (err) {
        console.error('Login error:', err);
        if (errorBanner) {
            errorBanner.style.display = 'block';
            errorBanner.textContent = 'Unable to connect to login server. Please try again.';
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Sign In </span> <span>→</span>';
        }
    }
}