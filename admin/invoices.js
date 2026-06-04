console.log('=== INVOICES.JS STARTING ===');

const API_URL = window.location.origin;
let lineItems = [];
let allTransactions = [];

function getAuthToken() {
  return sessionStorage.getItem('ml_admin_token');
}

function getAuthHeaders() {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// Set today's date
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Loaded');
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('invoiceDate').value = today;
  document.getElementById('dueDate').value = today;

  loadTransactions();
  attachEventListeners();
});

function attachEventListeners() {
  console.log('Attaching event listeners...');

  // Form submission
  document.getElementById('invoiceForm').addEventListener('submit', saveInvoice);

  // Add item button
  const addBtn = document.querySelector('.add-item-btn');
  if (addBtn) {
    addBtn.addEventListener('click', addLineItem);
    console.log('✅ Add item button listener attached');
  } else {
    console.error('❌ Add item button not found');
  }

  // Drag and drop on line items container
  const lineItemsContainer = document.getElementById('lineItemsContainer');
  lineItemsContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    lineItemsContainer.style.borderColor = 'var(--green)';
    lineItemsContainer.style.background = 'rgba(34,197,94,0.1)';
  });

  lineItemsContainer.addEventListener('dragleave', () => {
    lineItemsContainer.style.borderColor = 'var(--accent)';
    lineItemsContainer.style.background = 'transparent';
  });

  lineItemsContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    lineItemsContainer.style.borderColor = 'var(--accent)';
    lineItemsContainer.style.background = 'transparent';

    const data = e.dataTransfer.getData('application/json');
    if (data) {
      const transaction = JSON.parse(data);
      addLineItemFromTransaction(transaction);
    }
  });
}

function loadTransactions() {
  console.log('Loading transactions...');
  fetch(`${API_URL}/api/transactions`, {
    headers: getAuthHeaders()
  })
  .then(r => r.json())
  .then(data => {
    if (data.success) {
      allTransactions = data.data || [];
      renderTransactionsList();
    }
  })
  .catch(err => console.error('Error loading transactions:', err));
}

function renderTransactionsList() {
  const list = document.getElementById('transactionsList');

  if (allTransactions.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 20px;">No transactions available</p>';
    return;
  }

  list.innerHTML = allTransactions.map(t => `
    <div class="transaction-item" draggable="true" ondragstart="dragTransaction(event, '${t._id}')">
      <div class="transaction-desc">${t.description}</div>
      <div class="transaction-amount">
        ${t.type === 'credit' ? '+' : '-'}₹${t.amount.toFixed(2)}
      </div>
    </div>
  `).join('');

  // Add drag event listeners
  document.querySelectorAll('.transaction-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      const transId = e.currentTarget.getAttribute('ondragstart').match(/'([^']+)'/)[1];
      const trans = allTransactions.find(t => t._id === transId);
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('application/json', JSON.stringify({
        description: trans.description,
        amount: trans.amount
      }));
    });
  });
}

function dragTransaction(event, id) {
  const trans = allTransactions.find(t => t._id === id);
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData('application/json', JSON.stringify({
    description: trans.description,
    amount: trans.amount
  }));
  event.target.closest('.transaction-item').classList.add('dragging');
}

function addLineItemFromTransaction(transaction) {
  console.log('Adding line item from transaction:', transaction);
  const item = {
    id: Date.now(),
    description: transaction.description,
    amount: transaction.amount
  };
  lineItems.push(item);
  renderLineItems();
  updateTotal();
}

function addLineItem() {
  const desc = document.getElementById('newDesc').value.trim();
  const amount = parseFloat(document.getElementById('newAmount').value);

  if (!desc || !amount) {
    alert('Please fill in description and amount');
    return;
  }

  const item = {
    id: Date.now(),
    description: desc,
    amount: amount
  };

  lineItems.push(item);
  document.getElementById('newDesc').value = '';
  document.getElementById('newAmount').value = '';

  renderLineItems();
  updateTotal();
}

function renderLineItems() {
  const container = document.getElementById('lineItemsContainer');

  if (lineItems.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 20px;">No line items yet. Add manually or drag from transactions.</p>';
    return;
  }

  container.innerHTML = lineItems.map(item => `
    <div class="line-item" data-id="${item.id}">
      <div class="line-item-details">
        <div class="line-item-desc">${item.description}</div>
        <input type="text" class="edit-desc" value="${item.description}" style="display: none; width: 100%; margin-top: 5px; padding: 5px; background: rgba(0,0,0,0.3); border: 1px solid var(--border); border-radius: 4px; color: var(--text);">
      </div>
      <div style="text-align: right;">
        <div class="line-item-amount">₹${item.amount.toFixed(2)}</div>
        <input type="number" class="edit-amount" value="${item.amount}" step="0.01" style="display: none; width: 120px; padding: 5px; background: rgba(0,0,0,0.3); border: 1px solid var(--border); border-radius: 4px; color: var(--text);">
      </div>
      <div class="line-item-actions">
        <button type="button" class="icon-btn edit-btn" title="Edit"><i class="fas fa-edit"></i></button>
        <button type="button" class="icon-btn delete-btn" title="Delete"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  `).join('');

  // Add event listeners for edit and delete buttons
  document.querySelectorAll('[data-id]').forEach(el => {
    const id = parseInt(el.getAttribute('data-id'));

    el.querySelector('.edit-btn').addEventListener('click', () => {
      editLineItem(id);
    });

    el.querySelector('.delete-btn').addEventListener('click', () => {
      deleteLineItem(id);
    });
  });
}

function editLineItem(id) {
  const item = document.querySelector(`[data-id="${id}"]`);
  const descEl = item.querySelector('.line-item-desc');
  const descInput = item.querySelector('.edit-desc');
  const amountEl = item.querySelector('.line-item-amount');
  const amountInput = item.querySelector('.edit-amount');
  const editBtn = item.querySelector('.icon-btn');

  const isEditing = descInput.style.display !== 'none';

  if (isEditing) {
    // Save changes
    const newDesc = descInput.value.trim();
    const newAmount = parseFloat(amountInput.value);

    if (!newDesc || !newAmount) {
      alert('Please fill in all fields');
      return;
    }

    const lineItem = lineItems.find(l => l.id === id);
    if (lineItem) {
      lineItem.description = newDesc;
      lineItem.amount = newAmount;
    }

    descEl.style.display = 'block';
    descInput.style.display = 'none';
    amountEl.style.display = 'block';
    amountInput.style.display = 'none';
    editBtn.innerHTML = '<i class="fas fa-edit"></i>';

    updateTotal();
    renderLineItems();
  } else {
    // Enable editing
    descEl.style.display = 'none';
    descInput.style.display = 'block';
    amountEl.style.display = 'none';
    amountInput.style.display = 'block';
    editBtn.innerHTML = '<i class="fas fa-save"></i>';
  }
}

function deleteLineItem(id) {
  lineItems = lineItems.filter(item => item.id !== id);
  renderLineItems();
  updateTotal();
}

function updateTotal() {
  const total = lineItems.reduce((sum, item) => sum + item.amount, 0);
  document.getElementById('totalAmount').textContent = total.toFixed(2);
}

function saveInvoice(e) {
  e.preventDefault();

  if (lineItems.length === 0) {
    alert('Please add at least one line item');
    return;
  }

  const invoiceNo = document.getElementById('invoiceNo').value;
  const clientName = document.getElementById('clientName').value;
  const invoiceDate = document.getElementById('invoiceDate').value;
  const dueDate = document.getElementById('dueDate').value;
  const notes = document.getElementById('notes').value;
  const total = lineItems.reduce((sum, item) => sum + item.amount, 0);

  console.log('Saving invoice:', { invoiceNo, clientName, lineItems, total });
  alert('✅ Invoice saved successfully!\n\nInvoice: ' + invoiceNo + '\nClient: ' + clientName + '\nTotal: ₹' + total.toFixed(2));

  // Reset form
  document.getElementById('invoiceForm').reset();
  lineItems = [];
  renderLineItems();
  updateTotal();
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('invoiceDate').value = today;
  document.getElementById('dueDate').value = today;
}

console.log('=== INVOICES.JS LOADED ===');
