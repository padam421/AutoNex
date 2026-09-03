/**
 * Indian Railways - Kavach AI System
 * Split Screen Login Page Interactive Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  const usernameInput = document.getElementById('usernameInput');
  const passwordInput = document.getElementById('passwordInput');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const eyeIcon = document.getElementById('eyeIcon');
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const loginBtnText = document.getElementById('loginBtnText');
  const loginBtnSpinner = document.getElementById('loginBtnSpinner');
  const alertContainer = document.getElementById('alertContainer');
  const alertMessage = document.getElementById('alertMessage');

  // Toggle Password Visibility
  if (togglePasswordBtn && passwordInput && eyeIcon) {
    togglePasswordBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isPassword = passwordInput.getAttribute('type') === 'password';
      if (isPassword) {
        passwordInput.setAttribute('type', 'text');
        eyeIcon.className = 'fa-solid fa-eye text-xs text-blue-400';
        togglePasswordBtn.title = 'Hide password';
      } else {
        passwordInput.setAttribute('type', 'password');
        eyeIcon.className = 'fa-solid fa-eye-slash text-xs text-slate-400';
        togglePasswordBtn.title = 'Show password';
      }
    });
  }

  // Handle Form Submit
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleLogin();
    });
  }

  // Login Handler Function (Allows ANY Login ID & Password)
  function handleLogin() {
    const rawInput = usernameInput ? usernameInput.value.trim() : '';
    const email = rawInput || 'officer.ndls@ir.gov.in';

    // Show Loading Spinner State
    if (loginBtn) loginBtn.disabled = true;
    if (loginBtnText) loginBtnText.textContent = 'Authenticating...';
    if (loginBtnSpinner) loginBtnSpinner.classList.remove('hidden');

    // Simulate Instant Secure Authentication & Save Session
    setTimeout(() => {
      const userSession = {
        name: email.split('@')[0].toUpperCase(),
        email: email,
        role: 'kavach_officer',
        roleTitle: 'KAVACH SAFETY & OPERATIONS OFFICER',
        isLoggedIn: true,
        loginTime: new Date().toISOString()
      };

      localStorage.setItem('kavach_user_session', JSON.stringify(userSession));

      showAlert(`Authentication Successful! Officer Access Granted. Redirecting to Dashboard...`, 'success');

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 600);
    }, 600);
  }

  // Helper Alert Function
  function showAlert(msg, type = 'info') {
    if (!alertContainer || !alertMessage) return;

    alertMessage.textContent = msg;
    alertContainer.classList.remove('hidden');

    if (type === 'error') {
      alertContainer.className = 'p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs backdrop-blur-md transition-all mb-4';
    } else if (type === 'success') {
      alertContainer.className = 'p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs backdrop-blur-md transition-all mb-4';
    } else {
      alertContainer.className = 'p-3 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-200 text-xs backdrop-blur-md transition-all mb-4';
    }
  }
});
