const API_URL = window.location.origin;

if (sessionStorage.getItem('ml_admin') === 'true') {
  window.location.href = 'dashboard.html';
}

const requestOtpForm = document.getElementById('requestOtpForm');
const verifyOtpForm = document.getElementById('verifyOtpForm');
const requestOtpBtn = document.getElementById('requestOtpBtn');
const requestOtpError = document.getElementById('requestOtpError');
const verifyOtpBtn = document.getElementById('verifyOtpBtn');
const resendOtpBtn = document.getElementById('resendOtpBtn');
const otpInput = document.getElementById('otpInput');
const verifyOtpError = document.getElementById('verifyOtpError');

requestOtpForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  requestOtpBtn.disabled = true;
  requestOtpError.style.display = 'none';
  const originalText = requestOtpBtn.querySelector('span').textContent;
  requestOtpBtn.querySelector('span').textContent = 'Sending…';

  try {
    const response = await fetch(`${API_URL}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (data.success) {
      requestOtpForm.style.display = 'none';
      verifyOtpForm.style.display = 'block';
      otpInput.focus();
    } else {
      requestOtpError.textContent = data.message || 'Failed to send OTP';
      requestOtpError.style.display = 'block';
    }
  } catch (error) {
    requestOtpError.textContent = 'Network error. Please try again.';
    requestOtpError.style.display = 'block';
  } finally {
    requestOtpBtn.disabled = false;
    requestOtpBtn.querySelector('span').textContent = originalText;
  }
});

verifyOtpForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const otp = otpInput.value.trim();

  if (otp.length !== 6 || isNaN(otp)) {
    verifyOtpError.textContent = 'Please enter a valid 6-digit OTP';
    verifyOtpError.style.display = 'block';
    return;
  }

  verifyOtpBtn.disabled = true;
  verifyOtpError.style.display = 'none';
  const originalText = verifyOtpBtn.querySelector('span').textContent;
  verifyOtpBtn.querySelector('span').textContent = 'Verifying…';

  try {
    const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp })
    });

    const data = await response.json();

    if (data.success) {
      sessionStorage.setItem('ml_admin', 'true');
      sessionStorage.setItem('ml_admin_token', data.token);
      window.location.href = 'dashboard.html';
    } else {
      verifyOtpError.textContent = data.message || 'Invalid OTP';
      verifyOtpError.style.display = 'block';
      otpInput.value = '';
      otpInput.focus();
    }
  } catch (error) {
    verifyOtpError.textContent = 'Network error. Please try again.';
    verifyOtpError.style.display = 'block';
  } finally {
    verifyOtpBtn.disabled = false;
    verifyOtpBtn.querySelector('span').textContent = originalText;
  }
});

resendOtpBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  resendOtpBtn.disabled = true;
  const originalText = resendOtpBtn.querySelector('span').textContent;
  resendOtpBtn.querySelector('span').textContent = 'Sending…';
  verifyOtpError.style.display = 'none';

  try {
    const response = await fetch(`${API_URL}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (data.success) {
      otpInput.value = '';
      otpInput.focus();
    } else {
      verifyOtpError.textContent = data.message || 'Failed to resend OTP';
      verifyOtpError.style.display = 'block';
    }
  } catch (error) {
    verifyOtpError.textContent = 'Network error. Please try again.';
    verifyOtpError.style.display = 'block';
  } finally {
    resendOtpBtn.disabled = false;
    resendOtpBtn.querySelector('span').textContent = originalText;
  }
});
