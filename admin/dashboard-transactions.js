console.log('Dashboard transactions module loaded');

let dashboardTransactions = [];
let selectedTransactions = new Set();

function getAuthHeaders() {
  const token = sessionStorage.getItem('ml_admin_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

function openTransactionSelector() {
  console.log('Opening transaction selector...');

  // Create modal if it doesn't exist
  let modal = document.getElementById('transactionSelectorModal');
  if (!modal) {
    createTransactionModal();
    modal = document.getElementById('transactionSelectorModal');
    attachModalEventListeners();
  }

  // Load transactions
  loadDashboardTransactions();

  // Show modal
  modal.style.display = 'flex';
}

function attachModalEventListeners() {
  const addBtn = document.getElementById('addSelectedBtn');
  const cancelBtn = document.getElementById('cancelModalBtn');
  const closeBtn = document.getElementById('closeModalBtn');

  if (addBtn) {
    addBtn.addEventListener('click', addSelectedTransactions);
  }
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeTransactionSelector);
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', closeTransactionSelector);
  }
}

function createTransactionModal() {
  const modalHTML = `
    <div id="transactionSelectorModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 1000; align-items: center; justify-content: center;">
      <div style="background: #0d1b3e; padding: 30px; border-radius: 12px; width: 90%; max-width: 600px; border: 1px solid rgba(255,255,255,0.07); max-height: 80vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="color: #f1f5f9; margin: 0;">Select Transactions</h2>
          <button id="closeModalBtn" style="background: none; border: none; color: #f1f5f9; font-size: 1.5rem; cursor: pointer;">×</button>
        </div>

        <div style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 15px;">
          Check transactions to add them as line items, or drag and drop them below.
        </div>

        <div id="dashboardTransactionsList" style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; margin-bottom: 20px; max-height: 400px; overflow-y: auto;">
          <p style="text-align: center; color: #94a3b8; padding: 20px;">Loading transactions...</p>
        </div>

        <div style="display: flex; gap: 10px;">
          <button id="addSelectedBtn" style="flex: 1; padding: 12px; background: #00b4d8; border: none; border-radius: 8px; color: #fff; cursor: pointer; font-weight: 500;">
            Add Selected
          </button>
          <button id="cancelModalBtn" style="flex: 1; padding: 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff; cursor: pointer;">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeTransactionSelector() {
  const modal = document.getElementById('transactionSelectorModal');
  if (modal) {
    modal.style.display = 'none';
    selectedTransactions.clear();
  }
}

function loadDashboardTransactions() {
  console.log('Loading dashboard transactions...');
  const API_URL = window.location.origin;

  fetch(`${API_URL}/api/transactions`, {
    headers: getAuthHeaders()
  })
  .then(r => r.json())
  .then(data => {
    if (data.success) {
      dashboardTransactions = data.data || [];
      renderDashboardTransactions();
    }
  })
  .catch(err => console.error('Error loading transactions:', err));
}

function renderDashboardTransactions() {
  const list = document.getElementById('dashboardTransactionsList');

  if (dashboardTransactions.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 20px;">No transactions available</p>';
    return;
  }

  list.innerHTML = dashboardTransactions.map(t => `
    <div class="transaction-row" data-transaction-id="${t._id}" style="display: flex; align-items: center; padding: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 6px; margin-bottom: 10px; cursor: move;" draggable="true">
      <input type="checkbox" class="transaction-checkbox" data-id="${t._id}" style="margin-right: 15px; cursor: pointer; width: 18px; height: 18px;">
      <div style="flex: 1;">
        <div style="color: #f1f5f9; font-weight: 500;">${t.description}</div>
        <div style="color: #94a3b8; font-size: 0.85rem;">${t.category || ''}</div>
      </div>
      <div style="color: #00b4d8; font-weight: 600;">₹${t.amount.toFixed(2)}</div>
    </div>
  `).join('');

  // Attach event listeners to checkboxes and drag items
  document.querySelectorAll('.transaction-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      toggleTransaction(checkbox.dataset.id);
    });
  });

  document.querySelectorAll('.transaction-row').forEach(row => {
    row.addEventListener('dragstart', (e) => {
      dragDashboardTransaction(e, row.dataset.transactionId);
    });
  });
}

function toggleTransaction(id) {
  if (selectedTransactions.has(id)) {
    selectedTransactions.delete(id);
  } else {
    selectedTransactions.add(id);
  }
  console.log('Selected transactions:', Array.from(selectedTransactions));
}

function dragDashboardTransaction(e, id) {
  selectedTransactions.add(id);
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('application/json', JSON.stringify({
    description: dashboardTransactions.find(t => t._id === id).description,
    amount: dashboardTransactions.find(t => t._id === id).amount
  }));
}

function addSelectedTransactions() {
  console.log('Adding selected transactions...');

  if (selectedTransactions.size === 0) {
    alert('Please select at least one transaction');
    return;
  }

  selectedTransactions.forEach(id => {
    const transaction = dashboardTransactions.find(t => t._id === id);
    if (transaction) {
      addLineItem(transaction.description, '1', transaction.amount.toString());
    }
  });

  closeTransactionSelector();
  updatePreview();
}

console.log('Dashboard transactions module ready');
