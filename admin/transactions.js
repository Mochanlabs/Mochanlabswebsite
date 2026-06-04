console.log('=== TRANSACTIONS.JS STARTING ===');

const API_URL = window.location.origin;
let allTransactions = [];
let editingId = null;

// Get current month start and current date (timezone-safe)
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');

const monthStart = `${year}-${month}-01`; // First day of current month
const currentDay = `${year}-${month}-${day}`; // Current day (today)

let currentFilters = {
  startDate: monthStart,
  endDate: currentDay,
  type: '',
  status: ''
};

// ===== AUTHENTICATION FUNCTIONS =====
function getAuthToken() {
  return sessionStorage.getItem('ml_admin_token');
}

function setAuthToken(token) {
  sessionStorage.setItem('ml_admin', 'true');
  sessionStorage.setItem('ml_admin_token', token);
}

function getAuthHeaders() {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

function handleLogin(e) {
  e.preventDefault();
  console.log('✅ Form submission prevented');

  const userInput = document.getElementById('loginUsername');
  const passInput = document.getElementById('loginPassword');
  const errorDiv = document.getElementById('loginError');

  const username = userInput.value;
  const password = passInput.value;

  if (!username || !password) {
    if (errorDiv) errorDiv.textContent = 'Please enter username and password';
    return;
  }

  console.log('📤 Sending login request');

  fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  .then(r => r.json())
  .then(data => {
    console.log('📦 Response data:', data);
    if (data.success) {
      console.log('✅ Login successful!');
      setAuthToken(data.token);
      checkAuth();
    } else {
      if (errorDiv) errorDiv.textContent = data.message || 'Login failed';
    }
  })
  .catch(err => {
    console.error('Login error:', err);
    if (errorDiv) errorDiv.textContent = 'Connection error';
  });
}

function handleLogout() {
  if (confirm('Logout?')) {
    sessionStorage.clear();
    checkAuth();
  }
}

// ===== PAGE AUTHENTICATION CHECK =====
function checkAuth() {
  const token = getAuthToken();
  const isAdmin = sessionStorage.getItem('ml_admin') === 'true';

  console.log('🔐 Auth check - token:', !!token, 'isAdmin:', isAdmin);

  const loginScreen = document.getElementById('loginScreen');
  const mainContainer = document.getElementById('mainContainer');

  if (!token || !isAdmin) {
    console.log('❌ Not authenticated, showing login');
    if (loginScreen) loginScreen.classList.add('active');
    if (mainContainer) mainContainer.style.display = 'none';
  } else {
    console.log('✅ Authenticated, showing dashboard');
    if (loginScreen) loginScreen.classList.remove('active');
    if (mainContainer) mainContainer.style.display = 'block';
    loadTransactions();
  }
}

// ===== TRANSACTION FUNCTIONS =====
function openAddForm() {
  console.log('📋 Opening add form');
  editingId = null;
  document.getElementById('formTitle').textContent = 'Add Transaction';
  document.getElementById('transactionId').value = '';

  const form = document.getElementById('transactionForm');
  if (form) form.reset();

  document.getElementById('type').value = 'credit';
  document.getElementById('date').value = new Date().toISOString().split('T')[0];
  document.getElementById('status').value = 'pending';

  document.getElementById('formModal').classList.add('open');
}

function closeForm() {
  console.log('📋 Closing form');
  document.getElementById('formModal').classList.remove('open');
  editingId = null;
}

function submitForm(e) {
  e.preventDefault();
  console.log('📝 Form submitted');

  const transactionId = document.getElementById('transactionId').value;
  const type = document.getElementById('type').value;
  const amount = parseFloat(document.getElementById('amount').value);
  const description = document.getElementById('description').value;
  const category = document.getElementById('category').value;
  const date = document.getElementById('date').value;
  const status = document.getElementById('status').value;
  const referenceId = document.getElementById('referenceId').value || '';

  if (!amount || !description) {
    alert('Please fill in Amount and Description');
    return;
  }

  const payload = {
    type, amount, description, category, date, status, referenceId
  };

  const url = transactionId
    ? `${API_URL}/api/transactions/${transactionId}`
    : `${API_URL}/api/transactions`;
  const method = transactionId ? 'PUT' : 'POST';

  fetch(url, {
    method,
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  })
  .then(r => r.json())
  .then(data => {
    if (data.success) {
      alert('✅ Saved successfully!');
      closeForm();
      loadTransactions();
    } else {
      alert('❌ ' + (data.message || 'Error'));
    }
  })
  .catch(err => {
    console.error('Error:', err);
    alert('❌ Error: ' + err.message);
  });
}

function loadTransactions() {
  console.log('📥 Loading all transactions');

  fetch(`${API_URL}/api/transactions`, {
    headers: getAuthHeaders()
  })
  .then(r => r.json())
  .then(data => {
    console.log('✅ Transactions loaded:', data.data.length);
    if (data.success) {
      allTransactions = data.data || [];
      applyFilters();
    }
  })
  .catch(err => console.error('Load error:', err));
}

function applyFilters() {
  console.log('🔍 Applying filters:', currentFilters);

  let filtered = allTransactions;

  // Filter by date range
  if (currentFilters.startDate || currentFilters.endDate) {
    filtered = filtered.filter(t => {
      const transDate = new Date(t.date).toISOString().split('T')[0];

      if (currentFilters.startDate && transDate < currentFilters.startDate) {
        return false;
      }
      if (currentFilters.endDate && transDate > currentFilters.endDate) {
        return false;
      }
      return true;
    });
    console.log('After date filter:', filtered.length);
  }

  // Filter by type
  if (currentFilters.type) {
    filtered = filtered.filter(t => t.type === currentFilters.type);
    console.log('After type filter:', filtered.length);
  }

  // Filter by status
  if (currentFilters.status) {
    filtered = filtered.filter(t => t.status === currentFilters.status);
    console.log('After status filter:', filtered.length);
  }

  renderTransactions(filtered);
  updateStats(filtered);
}

function renderTransactions(transactions) {
  const list = document.getElementById('transactionsList');

  if (!transactions || transactions.length === 0) {
    list.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--muted);">No transactions</div>';
    return;
  }

  const getStatusBadge = (status) => {
    let color = '#94a3b8';
    let icon = 'fa-clock';
    let text = 'Pending';

    if (status === 'completed') {
      color = '#22c55e';
      icon = 'fa-check-circle';
      text = 'Completed';
    } else if (status === 'cancelled') {
      color = '#ef4444';
      icon = 'fa-times-circle';
      text = 'Cancelled';
    }

    return `
      <div style="display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: rgba(${color}, 0.1); border-radius: 6px; border: 1px solid ${color}; color: ${color}; font-size: 0.85rem; font-weight: 500; white-space: nowrap;">
        <i class="fas ${icon}" style="font-size: 0.9rem;"></i>
        ${text}
      </div>
    `;
  };

  list.innerHTML = transactions.map(t => `
    <div class="transaction-item">
      <div class="drag-handle"><i class="fas fa-grip-vertical"></i></div>
      <div class="transaction-info">
        <div class="transaction-desc">${t.description}</div>
        <div class="transaction-meta">
          ${t.category || ''} • ${new Date(t.date).toLocaleDateString()}
        </div>
      </div>
      <div style="display: flex; gap: 15px; align-items: center;">
        ${getStatusBadge(t.status)}
        <div class="transaction-amount ${t.type}">
          ${t.type === 'credit' ? '+' : '-'}₹${t.amount.toFixed(2)}
        </div>
      </div>
      <div class="transaction-actions">
        <button class="icon-btn edit-btn" type="button" data-id="${t._id}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="icon-btn delete-btn" type="button" data-id="${t._id}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');

  // Attach event listeners
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      console.log('✏️ Edit clicked for:', id);
      editTransaction(id);
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      console.log('🗑️ Delete clicked for:', id);
      deleteTransaction(id);
    });
  });
}

function editTransaction(id) {
  console.log('Editing:', id);
  const t = allTransactions.find(x => x._id === id);
  if (!t) return;

  editingId = id;
  document.getElementById('formTitle').textContent = 'Edit Transaction';
  document.getElementById('transactionId').value = id;
  document.getElementById('date').value = new Date(t.date).toISOString().split('T')[0];
  document.getElementById('type').value = t.type;
  document.getElementById('amount').value = t.amount;
  document.getElementById('description').value = t.description;
  document.getElementById('status').value = t.status || 'pending';
  document.getElementById('category').value = t.category || '';
  document.getElementById('referenceId').value = t.referenceId || '';
  document.getElementById('formModal').classList.add('open');
}

function deleteTransaction(id) {
  console.log('Deleting:', id);
  if (!confirm('Delete this transaction?')) return;

  fetch(`${API_URL}/api/transactions/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })
  .then(r => r.json())
  .then(data => {
    if (data.success) {
      alert('✅ Deleted successfully!');
      loadTransactions();
    } else {
      alert('❌ ' + (data.message || 'Error'));
    }
  })
  .catch(err => {
    console.error('Delete error:', err);
    alert('❌ Error: ' + err.message);
  });
}

function updateStats(transactions) {
  const credits = transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const debits = transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = credits - debits;

  const fmt = (num) => new Intl.NumberFormat('en-IN').format(num.toFixed(2));

  document.getElementById('totalCredits').textContent = fmt(credits);
  document.getElementById('totalDebits').textContent = fmt(debits);

  const balEl = document.getElementById('netBalance');
  balEl.textContent = `₹${fmt(balance)}`;
  balEl.style.color = balance >= 0 ? '#22c55e' : '#ef4444';

  console.log('📊 Stats updated:', { credits, debits, balance });
}

function exportPDF() {
  console.log('📄 Exporting PDF...');

  // Get current filtered transactions
  let filtered = allTransactions;

  if (currentFilters.startDate || currentFilters.endDate) {
    filtered = filtered.filter(t => {
      const transDate = new Date(t.date).toISOString().split('T')[0];
      if (currentFilters.startDate && transDate < currentFilters.startDate) return false;
      if (currentFilters.endDate && transDate > currentFilters.endDate) return false;
      return true;
    });
  }

  if (currentFilters.type) {
    filtered = filtered.filter(t => t.type === currentFilters.type);
  }

  if (currentFilters.status) {
    filtered = filtered.filter(t => t.status === currentFilters.status);
  }

  // Calculate stats
  const credits = filtered.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
  const debits = filtered.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
  const balance = credits - debits;

  const fmt = (num) => new Intl.NumberFormat('en-IN').format(num.toFixed(2));

  // Create HTML content for PDF
  let html = `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h1 style="text-align: center; color: #00b4d8; margin-bottom: 10px;">MOCHAN LABS</h1>
      <h2 style="text-align: center; color: #555; margin-top: 0;">Financial Transactions Report</h2>

      <div style="border-bottom: 2px solid #00b4d8; padding-bottom: 15px; margin-bottom: 20px;">
        <p style="margin: 5px 0;"><strong>Date Range:</strong> ${currentFilters.startDate || 'Start'} to ${currentFilters.endDate || 'End'}</p>
        <p style="margin: 5px 0;"><strong>Type Filter:</strong> ${currentFilters.type || 'All'}</p>
        <p style="margin: 5px 0;"><strong>Status Filter:</strong> ${currentFilters.status || 'All'}</p>
        <p style="margin: 5px 0;"><strong>Generated:</strong> ${new Date().toLocaleString('en-IN')}</p>
      </div>

      <div style="display: flex; gap: 20px; margin-bottom: 25px;">
        <div style="flex: 1; padding: 15px; background: #f0f8ff; border-left: 4px solid #22c55e; border-radius: 5px;">
          <p style="margin: 0; color: #666; font-size: 12px;">Total Credits</p>
          <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #22c55e;">₹${fmt(credits)}</p>
        </div>
        <div style="flex: 1; padding: 15px; background: #fff8f0; border-left: 4px solid #ef4444; border-radius: 5px;">
          <p style="margin: 0; color: #666; font-size: 12px;">Total Debits</p>
          <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #ef4444;">₹${fmt(debits)}</p>
        </div>
        <div style="flex: 1; padding: 15px; background: #f8f8f8; border-left: 4px solid #00b4d8; border-radius: 5px;">
          <p style="margin: 0; color: #666; font-size: 12px;">Net Balance</p>
          <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: ${balance >= 0 ? '#22c55e' : '#ef4444'};">₹${fmt(balance)}</p>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background: #00b4d8; color: white;">
            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Date</th>
            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Description</th>
            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Category</th>
            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Type</th>
            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Status</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((t, idx) => `
            <tr style="background: ${idx % 2 === 0 ? '#fff' : '#f9f9f9'};">
              <td style="padding: 8px; border: 1px solid #ddd;">${new Date(t.date).toLocaleDateString('en-IN')}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${t.description}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${t.category || '-'}</td>
              <td style="padding: 8px; border: 1px solid #ddd; color: ${t.type === 'credit' ? '#22c55e' : '#ef4444'}; font-weight: bold;">
                ${t.type === 'credit' ? 'Credit' : 'Debit'}
              </td>
              <td style="padding: 8px; border: 1px solid #ddd;">${t.status}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: ${t.type === 'credit' ? '#22c55e' : '#ef4444'}; font-weight: bold;">
                ${t.type === 'credit' ? '+' : '-'}₹${t.amount.toFixed(2)}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; text-align: center; color: #999; font-size: 12px;">
        <p>This is an automatically generated report. For official records, please verify with your accountant.</p>
      </div>
    </div>
  `;

  const opt = {
    margin: 10,
    filename: `transactions-${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
  };

  html2pdf().set(opt).from(html).save();
  console.log('✅ PDF exported successfully');
}

// ===== PAGE INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOM Loaded, attaching event listeners');

  // Attach login form listener
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
    console.log('✅ Login form listener attached');
  }

  // Attach Add Transaction button
  const addBtn = document.querySelector('.add-btn');
  if (addBtn) {
    addBtn.addEventListener('click', openAddForm);
    console.log('✅ Add button listener attached');
  }

  // Attach Export PDF button
  const exportBtn = document.querySelector('.export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportPDF);
    console.log('✅ Export PDF button listener attached');
  }

  // Attach Logout button
  const logoutBtn = document.querySelector('.logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
    console.log('✅ Logout button listener attached');
  }

  // Attach Close form button
  const closeBtn = document.querySelector('.close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeForm);
    console.log('✅ Close button listener attached');
  }

  // Attach form submit listener
  const transactionForm = document.getElementById('transactionForm');
  if (transactionForm) {
    transactionForm.addEventListener('submit', submitForm);
    console.log('✅ Form submit listener attached');
  }

  // Attach filter listeners
  const filterStartDate = document.getElementById('filterStartDate');
  const filterEndDate = document.getElementById('filterEndDate');
  const filterType = document.getElementById('filterType');
  const filterStatus = document.getElementById('filterStatus');

  if (filterStartDate) {
    filterStartDate.value = currentFilters.startDate;
    filterStartDate.addEventListener('change', (e) => {
      currentFilters.startDate = e.target.value;
      console.log('📅 Start date changed to:', e.target.value);
      applyFilters();
    });
    console.log('✅ Start date filter listener attached');
  }

  if (filterEndDate) {
    filterEndDate.value = currentFilters.endDate;
    filterEndDate.addEventListener('change', (e) => {
      currentFilters.endDate = e.target.value;
      console.log('📅 End date changed to:', e.target.value);
      applyFilters();
    });
    console.log('✅ End date filter listener attached');
  }

  if (filterType) {
    filterType.addEventListener('change', (e) => {
      currentFilters.type = e.target.value;
      console.log('🏷️ Type filter changed:', e.target.value);
      applyFilters();
    });
    console.log('✅ Type filter listener attached');
  }

  if (filterStatus) {
    filterStatus.addEventListener('change', (e) => {
      currentFilters.status = e.target.value;
      console.log('📌 Status filter changed:', e.target.value);
      applyFilters();
    });
    console.log('✅ Status filter listener attached');
  }

  checkAuth();
});

console.log('=== TRANSACTIONS.JS LOADED ===');
