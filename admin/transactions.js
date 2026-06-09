console.log('=== TRANSACTIONS.JS STARTING ===');

const API_URL = window.location.origin;
let allTransactions = [];
let editingId = null;
let inactivatingId = null;
let showInactiveTransactions = false;

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

  console.log('Form data:', { transactionId, type, amount, description, category, date, status, referenceId });

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

  console.log(`📤 Sending ${method} to ${url}`, payload);

  fetch(url, {
    method,
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  })
  .then(r => {
    console.log('📥 Response status:', r.status);
    return r.json();
  })
  .then(data => {
    console.log('📋 Response data:', data);
    if (data.success) {
      alert('✅ Saved successfully!');
      closeForm();
      loadTransactions();
    } else {
      alert('❌ ' + (data.message || 'Error'));
      console.error('Save failed:', data);
    }
  })
  .catch(err => {
    console.error('❌ Fetch error:', err);
    alert('❌ Error: ' + err.message);
  });
}

function loadTransactions() {
  console.log('📥 Loading all transactions');

  const queryParam = showInactiveTransactions ? '?showInactive=true' : '';
  fetch(`${API_URL}/api/transactions${queryParam}`, {
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
      // Parse date safely - extract just the date part from ISO string
      let transDate;
      if (typeof t.date === 'string' && t.date.includes('T')) {
        // ISO format: 2026-06-09T00:00:00.000Z
        transDate = t.date.split('T')[0];
      } else if (typeof t.date === 'string') {
        // Already in YYYY-MM-DD format
        transDate = t.date;
      } else {
        // Date object
        transDate = new Date(t.date).toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD
      }

      console.log('Comparing transaction date:', transDate, 'against filter:', { start: currentFilters.startDate, end: currentFilters.endDate });

      if (currentFilters.startDate && transDate < currentFilters.startDate) {
        console.log('  ❌ Date', transDate, 'is before', currentFilters.startDate);
        return false;
      }
      if (currentFilters.endDate && transDate > currentFilters.endDate) {
        console.log('  ❌ Date', transDate, 'is after', currentFilters.endDate);
        return false;
      }
      console.log('  ✅ Date', transDate, 'passes filter');
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
    <div class="transaction-item" style="${!t.isActive ? 'opacity: 0.6; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);' : ''}">
      <div class="drag-handle" style="${!t.isActive ? 'opacity: 0.3; cursor: not-allowed;' : ''}"><i class="fas fa-grip-vertical"></i></div>
      <div class="transaction-info">
        <div class="transaction-desc">
          ${t.description}
          ${!t.isActive ? '<span style="color: var(--red); font-size: 0.8rem; margin-left: 10px;"><i class="fas fa-ban"></i> Inactive</span>' : ''}
        </div>
        <div class="transaction-meta">
          ${t.category || ''} • ${new Date(t.date).toLocaleDateString()}
          ${!t.isActive ? '<br><i class="fas fa-times-circle"></i> Inactive: ' + new Date(t.inactiveDate).toLocaleDateString() : ''}
        </div>
      </div>
      <div style="display: flex; gap: 15px; align-items: center;">
        ${getStatusBadge(t.status)}
        <div class="transaction-amount ${t.type}">
          ${t.type === 'credit' ? '+' : '-'}₹${t.amount.toFixed(2)}
        </div>
      </div>
      <div class="transaction-actions">
        <button class="icon-btn edit-btn" type="button" data-id="${t._id}" style="${!t.isActive ? 'opacity: 0.3; cursor: not-allowed;' : ''}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="icon-btn delete-btn" type="button" data-id="${t._id}" title="${t.isActive ? 'Mark as Inactive' : 'View'}">
          <i class="fas fa-${t.isActive ? 'trash' : 'eye'}"></i>
        </button>
        <button class="icon-btn permanent-delete-btn" type="button" data-id="${t._id}" title="Permanently Delete" style="color: var(--red);">
          <i class="fas fa-times-circle"></i>
        </button>
      </div>
    </div>
  `).join('');

  // Attach event listeners
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const trans = allTransactions.find(x => x._id === id);
      if (trans && trans.isActive) {
        console.log('✏️ Edit clicked for:', id);
        editTransaction(id);
      }
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const trans = allTransactions.find(x => x._id === id);
      if (trans && trans.isActive) {
        console.log('🗑️ Inactivate clicked for:', id);
        openInactiveModal(id);
      }
    });
  });

  // Permanent delete button listeners
  document.querySelectorAll('.permanent-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      console.log('💀 Permanent delete clicked for:', id);
      openPermanentDeleteModal(id);
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

function openInactiveModal(id) {
  console.log('Opening inactive modal for:', id);
  inactivatingId = id;
  document.getElementById('inactiveComments').value = '';
  document.getElementById('inactiveModal').classList.add('open');
}

function closeInactiveModal() {
  document.getElementById('inactiveModal').classList.remove('open');
  inactivatingId = null;
}

function submitInactiveForm(e) {
  e.preventDefault();
  const comments = document.getElementById('inactiveComments').value;

  console.log('Marking as inactive:', inactivatingId, 'Comments:', comments);

  fetch(`${API_URL}/api/transactions/${inactivatingId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({ inactiveComments: comments })
  })
  .then(r => r.json())
  .then(data => {
    if (data.success) {
      alert('✅ Transaction marked as inactive!');
      closeInactiveModal();
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

function openPermanentDeleteModal(id) {
  console.log('💀 Opening permanent delete modal for:', id);
  inactivatingId = id;

  // Clear and focus the input field
  const confirmInput = document.getElementById('permanentDeleteConfirm');
  if (confirmInput) {
    confirmInput.value = '';
    console.log('✅ Cleared confirm input');
  }

  const modal = document.getElementById('permanentDeleteModal');
  console.log('Modal element:', modal);
  if (modal) {
    modal.classList.add('open');
    console.log('✅ Modal opened');

    // Focus the input field after modal opens
    setTimeout(() => {
      if (confirmInput) {
        confirmInput.focus();
        console.log('✅ Input field focused');
      }
    }, 100);
  } else {
    console.error('❌ permanentDeleteModal not found in DOM');
  }
}

function closePermanentDeleteModal() {
  const modal = document.getElementById('permanentDeleteModal');
  if (modal) {
    modal.classList.remove('open');
  }
  inactivatingId = null;
}

function submitPermanentDeleteForm(e) {
  e.preventDefault();
  console.log('Form submitted - inactivatingId:', inactivatingId);

  const confirmInput = document.getElementById('permanentDeleteConfirm');
  console.log('Confirm input element:', confirmInput);

  if (!confirmInput) {
    alert('❌ Error: Input field not found');
    console.error('permanentDeleteConfirm input not found!');
    return;
  }

  const confirmText = confirmInput.value.trim();
  console.log('Confirm text input value:', confirmText, 'length:', confirmText.length);

  if (confirmText !== 'YES') {
    alert('❌ Please type "YES" to confirm');
    return;
  }

  console.log('Permanently deleting transaction:', inactivatingId);
  const url = `${API_URL}/api/transactions/${inactivatingId}?permanent=true`;
  console.log('Delete URL:', url);

  fetch(url, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })
  .then(r => {
    console.log('Response status:', r.status);
    return r.json();
  })
  .then(data => {
    console.log('Response data:', data);
    if (data.success) {
      alert('✅ Transaction permanently deleted!');
      closePermanentDeleteModal();
      loadTransactions();
    } else {
      alert('❌ ' + (data.message || 'Error'));
    }
  })
  .catch(err => {
    console.error('Error deleting:', err);
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

  // Back button is a link, no need for logout listener (moved to dashboard)

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

  // Attach inactive modal listeners
  const inactiveModal = document.getElementById('inactiveModal');
  if (inactiveModal) {
    const closeBtn = inactiveModal.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeInactiveModal);
    }
    inactiveModal.addEventListener('click', (e) => {
      if (e.target.id === 'inactiveModal') closeInactiveModal();
    });

    const inactiveForm = document.getElementById('inactiveForm');
    if (inactiveForm) {
      inactiveForm.addEventListener('submit', submitInactiveForm);
      console.log('✅ Inactive form listener attached');
    }
  }

  // Permanent delete modal
  const permanentDeleteModal = document.getElementById('permanentDeleteModal');
  if (permanentDeleteModal) {
    const closeBtn = permanentDeleteModal.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closePermanentDeleteModal);
    }
    permanentDeleteModal.addEventListener('click', (e) => {
      if (e.target.id === 'permanentDeleteModal') closePermanentDeleteModal();
    });

    const permanentDeleteForm = document.getElementById('permanentDeleteForm');
    if (permanentDeleteForm) {
      permanentDeleteForm.addEventListener('submit', submitPermanentDeleteForm);
      console.log('✅ Permanent delete form listener attached');
    }
  }

  // Toggle inactive transactions button
  const toggleInactiveBtn = document.getElementById('toggleInactiveBtn');
  if (toggleInactiveBtn) {
    toggleInactiveBtn.addEventListener('click', () => {
      showInactiveTransactions = !showInactiveTransactions;
      toggleInactiveBtn.innerHTML = showInactiveTransactions
        ? '<i class="fas fa-eye"></i> Show Active'
        : '<i class="fas fa-eye-slash"></i> Show Inactive';
      loadTransactions();
    });
  }

  checkAuth();
});

console.log('=== TRANSACTIONS.JS LOADED ===');
