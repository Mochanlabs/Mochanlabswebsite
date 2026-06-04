console.log('=== TRANSACTIONS.JS STARTING ===');

const API_URL = window.location.origin;
let allTransactions = [];
let editingId = null;
let currentFilters = {
  month: new Date().toISOString().slice(0, 7), // YYYY-MM format
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
  const notes = document.getElementById('notes').value || '';

  if (!amount || !description) {
    alert('Please fill in Amount and Description');
    return;
  }

  const payload = {
    type, amount, description, category, date, status, referenceId, notes
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

  // Filter by month
  if (currentFilters.month) {
    filtered = filtered.filter(t => {
      const transDate = new Date(t.date).toISOString().slice(0, 7);
      return transDate === currentFilters.month;
    });
    console.log('After month filter:', filtered.length);
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

  list.innerHTML = transactions.map(t => `
    <div class="transaction-item">
      <div class="drag-handle"><i class="fas fa-grip-vertical"></i></div>
      <div class="transaction-info">
        <div class="transaction-desc">${t.description}</div>
        <div class="transaction-meta">
          ${t.category || ''} • ${new Date(t.date).toLocaleDateString()}
        </div>
      </div>
      <div class="transaction-amount ${t.type}">
        ${t.type === 'credit' ? '+' : '-'}₹${t.amount.toFixed(2)}
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
  document.getElementById('type').value = t.type;
  document.getElementById('amount').value = t.amount;
  document.getElementById('description').value = t.description;
  document.getElementById('category').value = t.category || '';
  document.getElementById('date').value = new Date(t.date).toISOString().split('T')[0];
  document.getElementById('status').value = t.status || 'pending';
  document.getElementById('referenceId').value = t.referenceId || '';
  document.getElementById('notes').value = t.notes || '';
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
  const filterMonth = document.getElementById('filterMonth');
  const filterType = document.getElementById('filterType');
  const filterStatus = document.getElementById('filterStatus');

  if (filterMonth) {
    filterMonth.value = currentFilters.month;
    filterMonth.addEventListener('change', (e) => {
      currentFilters.month = e.target.value;
      console.log('📅 Month changed to:', e.target.value);
      applyFilters();
    });
    console.log('✅ Month filter listener attached');
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
