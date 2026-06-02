const API_URL = window.location.origin;
let allTransactions = [];
let editingId = null;

document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('date').value = today;
  loadTransactions();
});

function openAddForm() {
  editingId = null;
  document.getElementById('formTitle').textContent = 'Add Transaction';
  document.getElementById('transactionForm').reset();
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('date').value = today;
  document.getElementById('formModal').classList.add('open');
}

function closeForm() {
  document.getElementById('formModal').classList.remove('open');
  editingId = null;
}

function submitForm(e) {
  e.preventDefault();
  const transactionId = document.getElementById('transactionId').value;
  const payload = {
    type: document.getElementById('type').value,
    amount: parseFloat(document.getElementById('amount').value),
    description: document.getElementById('description').value,
    category: document.getElementById('category').value,
    date: document.getElementById('date').value,
    referenceId: document.getElementById('referenceId').value,
    notes: document.getElementById('notes').value
  };

  const url = transactionId
    ? `${API_URL}/api/transactions/${transactionId}`
    : `${API_URL}/api/transactions`;

  const method = transactionId ? 'PUT' : 'POST';

  fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(r => r.json())
  .then(data => {
    if (data.success) {
      loadTransactions();
      closeForm();
    } else {
      alert(data.message || 'Error saving transaction');
    }
  })
  .catch(err => {
    console.error(err);
    alert('Error saving transaction');
  });
}

function loadTransactions() {
  fetch(`${API_URL}/api/transactions`)
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        allTransactions = data.data || [];
        renderTransactions(allTransactions);
        updateStats();
      }
    })
    .catch(err => console.error(err));
}

function renderTransactions(transactions) {
  const list = document.getElementById('transactionsList');

  if (transactions.length === 0) {
    list.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--muted);"><i class="fas fa-inbox"></i> No transactions</div>';
    return;
  }

  list.innerHTML = transactions.map(t => `
    <div class="transaction-item" draggable="true" ondragstart="dragTransaction(event, '${t._id}')">
      <div class="drag-handle"><i class="fas fa-grip-vertical"></i></div>
      <div class="transaction-info">
        <div class="transaction-desc">${t.description}</div>
        <div class="transaction-meta">
          ${t.category ? t.category + ' • ' : ''}${new Date(t.date).toLocaleDateString()}
          ${t.status === 'completed' ? '• Linked to Invoice' : '• ' + t.status}
        </div>
      </div>
      <div class="transaction-amount ${t.type}">${t.type === 'credit' ? '+' : '-'}$${t.amount.toFixed(2)}</div>
      <div class="transaction-actions">
        <button class="icon-btn" onclick="editTransaction('${t._id}')" title="Edit">
          <i class="fas fa-edit"></i>
        </button>
        <button class="icon-btn" onclick="deleteTransaction('${t._id}')" title="Delete">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
}

function dragTransaction(e, id) {
  e.dataTransfer.setData('transactionId', id);
  e.dataTransfer.effectAllowed = 'copy';
  e.target.closest('.transaction-item').classList.add('dragging');
}

function editTransaction(id) {
  const transaction = allTransactions.find(t => t._id === id);
  if (!transaction) return;

  editingId = id;
  document.getElementById('formTitle').textContent = 'Edit Transaction';
  document.getElementById('transactionId').value = id;
  document.getElementById('type').value = transaction.type;
  document.getElementById('amount').value = transaction.amount;
  document.getElementById('description').value = transaction.description;
  document.getElementById('category').value = transaction.category || '';
  document.getElementById('date').value = new Date(transaction.date).toISOString().split('T')[0];
  document.getElementById('referenceId').value = transaction.referenceId || '';
  document.getElementById('notes').value = transaction.notes || '';
  document.getElementById('formModal').classList.add('open');
}

function deleteTransaction(id) {
  if (!confirm('Delete this transaction?')) return;

  fetch(`${API_URL}/api/transactions/${id}`, { method: 'DELETE' })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        loadTransactions();
      } else {
        alert(data.message || 'Error deleting transaction');
      }
    })
    .catch(err => console.error(err));
}

function filterTransactions() {
  const type = document.getElementById('filterType').value;
  const status = document.getElementById('filterStatus').value;

  let filtered = allTransactions;

  if (type) {
    filtered = filtered.filter(t => t.type === type);
  }
  if (status) {
    filtered = filtered.filter(t => t.status === status);
  }

  renderTransactions(filtered);
}

function updateStats() {
  const credits = allTransactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const debits = allTransactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = credits - debits;

  document.getElementById('totalCredits').textContent = credits.toFixed(2);
  document.getElementById('totalDebits').textContent = debits.toFixed(2);

  const balanceEl = document.getElementById('netBalance');
  balanceEl.textContent = `$${balance.toFixed(2)}`;
  balanceEl.style.color = balance >= 0 ? '#22c55e' : '#ef4444';
}
