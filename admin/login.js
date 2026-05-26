const API_URL = window.location.origin;

if (sessionStorage.getItem('ml_admin') === 'true') {
  window.location.href = 'dashboard.html';
}

const form = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');
const loginBtn = document.getElementById('loginBtn');
const loginBtnText = document.getElementById('loginBtnText');
const togglePwBtn = document.getElementById('togglePw');
const passwordInput = document.getElementById('password');
const eyeIcon = document.getElementById('eyeIcon');

togglePwBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const show = passwordInput.type === 'password';
  passwordInput.type = show ? 'text' : 'password';
  eyeIcon.className = show ? 'fas fa-eye-slash' : 'fas fa-eye';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  loginBtn.disabled = true;
  errorMsg.style.display = 'none';
  loginBtnText.textContent = 'Verifying…';

  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (data.success) {
      sessionStorage.setItem('ml_admin', 'true');
      sessionStorage.setItem('ml_admin_token', data.token);
      window.location.href = 'dashboard.html';
    } else {
      errorMsg.textContent = data.message || 'Invalid username or password';
      errorMsg.style.display = 'block';
      passwordInput.value = '';
      passwordInput.focus();
    }
  } catch (error) {
    errorMsg.textContent = 'Connection error. Please try again.';
    errorMsg.style.display = 'block';
  } finally {
    loginBtn.disabled = false;
    loginBtnText.textContent = 'Login to Dashboard';
  }
});
