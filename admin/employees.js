console.log('=== EMPLOYEES.JS STARTING ===');

const API_URL = window.location.origin;
let employees = [];
let selectedEmployeeId = null;
let selectedLetterType = null;

function getAuthHeaders() {
  const token = sessionStorage.getItem('ml_admin_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Loaded');
  loadEmployees();
  attachEventListeners();
});

function attachEventListeners() {
  console.log('Attaching event listeners...');

  // Form submission
  document.getElementById('employeeForm').addEventListener('submit', saveEmployee);

  // Modal close button
  document.querySelector('.close-btn').addEventListener('click', closeLetterModal);

  // Letter options
  document.querySelectorAll('.letter-option').forEach(option => {
    option.addEventListener('click', () => {
      selectedLetterType = option.dataset.letterType;
      generateLetter();
    });
  });

  // Click outside modal to close
  document.getElementById('letterModal').addEventListener('click', (e) => {
    if (e.target.id === 'letterModal') closeLetterModal();
  });
}

// Load employees
function loadEmployees() {
  console.log('Loading employees...');
  fetch(`${API_URL}/api/employees`, {
    headers: getAuthHeaders()
  })
  .then(r => r.json())
  .then(data => {
    if (data.success) {
      employees = data.data || [];
      renderEmployeesList();
      updateStats();
    }
  })
  .catch(err => console.error('Error loading employees:', err));
}

// Render employees list
function renderEmployeesList() {
  const list = document.getElementById('employeesList');

  if (employees.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 40px 20px;"><i class="fas fa-inbox" style="font-size: 2rem; display: block; margin-bottom: 10px;"></i> No employees yet</p>';
    return;
  }

  list.innerHTML = employees.map(emp => `
    <div class="employee-item">
      <div class="employee-info">
        <div class="employee-name">${emp.firstName} ${emp.lastName}</div>
        <div class="employee-meta">
          <i class="fas fa-briefcase"></i> ${emp.position || 'N/A'} |
          <i class="fas fa-envelope"></i> ${emp.email} |
          <i class="fas fa-phone"></i> ${emp.mobile}
        </div>
      </div>
      <div class="employee-actions">
        <button class="icon-btn" title="Generate Letter" data-employee-id="${emp._id}">
          <i class="fas fa-file-word"></i>
        </button>
        <button class="icon-btn" title="Edit" data-employee-id="${emp._id}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="icon-btn" title="Delete" data-employee-id="${emp._id}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');

  // Attach action listeners
  document.querySelectorAll('.employee-item .icon-btn').forEach((btn, idx) => {
    const empId = btn.dataset.employeeId;
    if (idx % 3 === 0) btn.addEventListener('click', () => openLetterModal(empId));
    else if (idx % 3 === 1) btn.addEventListener('click', () => editEmployee(empId));
    else btn.addEventListener('click', () => deleteEmployee(empId));
  });
}

// Save employee
async function saveEmployee(e) {
  e.preventDefault();
  const empId = document.getElementById('employeeId').value;

  const data = {
    firstName: document.getElementById('firstName').value,
    lastName: document.getElementById('lastName').value,
    email: document.getElementById('email').value,
    mobile: document.getElementById('mobile').value,
    gender: document.getElementById('gender').value,
    dob: document.getElementById('dob').value,
    address: document.getElementById('address').value,
    position: document.getElementById('position').value,
    department: document.getElementById('department').value,
    dateOfJoining: document.getElementById('dateOfJoining').value,
    employeeCode: document.getElementById('employeeCode').value,
    skills: document.getElementById('skills').value,
  };

  try {
    const method = empId ? 'PUT' : 'POST';
    const url = empId ? `${API_URL}/api/employees/${empId}` : `${API_URL}/api/employees`;

    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });

    if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
    showToast('Employee saved successfully!', 'success');
    document.getElementById('employeeForm').reset();
    document.getElementById('employeeId').value = '';
    loadEmployees();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// Edit employee
function editEmployee(empId) {
  const emp = employees.find(e => e._id === empId);
  if (!emp) return;

  document.getElementById('employeeId').value = emp._id;
  document.getElementById('firstName').value = emp.firstName;
  document.getElementById('lastName').value = emp.lastName;
  document.getElementById('email').value = emp.email;
  document.getElementById('mobile').value = emp.mobile;
  document.getElementById('gender').value = emp.gender;
  document.getElementById('dob').value = emp.dob || '';
  document.getElementById('address').value = emp.address;
  document.getElementById('position').value = emp.position || '';
  document.getElementById('department').value = emp.department || '';
  document.getElementById('dateOfJoining').value = emp.dateOfJoining || '';
  document.getElementById('employeeCode').value = emp.employeeCode || '';
  document.getElementById('skills').value = emp.skills || '';

  document.querySelector('.section-title').scrollIntoView({ behavior: 'smooth' });
  document.getElementById('firstName').focus();
}

// Delete employee
async function deleteEmployee(empId) {
  if (!confirm('Are you sure you want to delete this employee?')) return;

  try {
    const res = await fetch(`${API_URL}/api/employees/${empId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!res.ok) throw new Error('Delete failed');
    showToast('Employee deleted', 'success');
    loadEmployees();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// Open letter modal
function openLetterModal(empId) {
  selectedEmployeeId = empId;
  const emp = employees.find(e => e._id === empId);
  if (emp) {
    document.getElementById('modalEmployeeName').textContent = `${emp.firstName} ${emp.lastName}`;
    document.getElementById('letterModal').classList.add('open');
  }
}

// Close letter modal
function closeLetterModal() {
  document.getElementById('letterModal').classList.remove('open');
  selectedLetterType = null;
  selectedEmployeeId = null;
}

// Load logo as base64
async function loadLogoAsBase64() {
  try {
    const response = await fetch('../images/mochan_labs.png');
    if (!response.ok) throw new Error('Logo not found');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result;
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.log('Could not load logo:', err);
    return null;
  }
}

// Generate letter
async function generateLetter() {
  const emp = employees.find(e => e._id === selectedEmployeeId);
  if (!emp || !selectedLetterType) return;

  console.log('Generating', selectedLetterType, 'for', emp.firstName);

  try {
    // Load and convert logo to base64
    const logoBase64 = await loadLogoAsBase64();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    // Light blue header background (RGB: 0, 180, 216 - the accent color)
    doc.setFillColor(0, 180, 216);
    doc.rect(0, 0, 210, 35, 'F');

    // Add logo to header if available
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 15, 5, 18, 18);
    }

    // Company header
    const textStartX = 38;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('MOCHAN LABS', textStartX, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('IT Solutions & Services', textStartX, 21);

  // Letter title and date
  const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Date: ${today}`, 160, 50, { align: 'right' });

  // Letter content based on type
  let letterContent = '';
  let letterTitle = '';

  switch(selectedLetterType) {
    case 'offer':
      letterTitle = 'OFFER LETTER';
      letterContent = generateOfferLetter(emp, today);
      break;
    case 'experience':
      letterTitle = 'EXPERIENCE CERTIFICATE';
      letterContent = generateExperienceLetter(emp, today);
      break;
    case 'relieving':
      letterTitle = 'RELIEVING LETTER';
      letterContent = generateRelievingLetter(emp, today);
      break;
    case 'salary':
      letterTitle = 'SALARY CERTIFICATE';
      letterContent = generateSalaryCertificate(emp, today);
      break;
  }

  // Letter title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 180, 216);
  doc.text(letterTitle, 105, 65, { align: 'center' });

  // Letter body
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);

  const lines = doc.splitTextToSize(letterContent, 170);
  let yPos = 80;
  lines.forEach(line => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(line, 20, yPos);
    yPos += 6;
  });

  // Footer signature
  yPos += 20;
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Authorized Signatory', 20, yPos);
  doc.text('MOCHAN LABS', 20, yPos + 15);

  // Add footer to all pages
  const pageCount = doc.getNumberOfPages();
  const footerText = 'www.mochanlabs.com | mochanlabs@gmail.com | India';
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(0, 180, 216);
    doc.rect(0, 285, 210, 12, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(footerText, 105, 291, { align: 'center' });
  }

  // Save and download
  const fileName = `${emp.firstName}_${emp.lastName}_${selectedLetterType}.pdf`;
  doc.save(fileName);
  showToast(`${letterTitle} downloaded!`, 'success');

  // Save letter info to backend
  saveLettterInfo(emp._id, selectedLetterType, fileName);
  closeLetterModal();
  } catch (err) {
    console.error('Error generating letter:', err);
    showToast('Error generating letter: ' + err.message, 'error');
  }
}

// Letter templates
function generateOfferLetter(emp, date) {
  return `Dear ${emp.firstName} ${emp.lastName},

We are pleased to extend an offer of employment to you for the position of ${emp.position || 'Software Engineer'} at Mochan Labs.

Your employment details are as follows:

Position: ${emp.position || 'Software Engineer'}
Department: ${emp.department || 'Engineering'}
Date of Joining: [To be confirmed]
CTC: [Amount as discussed]

Terms & Conditions:
• Your employment is subject to the successful completion of background verification.
• You will be required to sign our standard employment contract.
• You will adhere to the company's policies and procedures.
• Your employment is at-will and can be terminated by either party with due notice.

Please confirm your acceptance of this offer by signing and returning this letter. If you have any questions, please do not hesitate to contact us.

We look forward to welcoming you to the Mochan Labs family.

Best regards,
Management
Mochan Labs`;
}

function generateExperienceLetter(emp, date) {
  const joinDate = emp.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString('en-IN') : 'N/A';
  return `To Whom It May Concern,

This is to certify that ${emp.firstName} ${emp.lastName} (Employee ID: ${emp.employeeCode || 'N/A'}) was employed with Mochan Labs in the capacity of ${emp.position || 'Software Engineer'} in the ${emp.department || 'Engineering'} Department.

Period of Employment:
From: ${joinDate}
To: ${date}

During the tenure of employment, ${emp.firstName} has demonstrated exceptional skills and professional conduct. Key competencies include:
${emp.skills || 'Technical skills in various technologies and strong problem-solving abilities'}

${emp.firstName} has been a valuable member of our team and has contributed significantly to our projects.

This certificate is issued for the purpose of employment, further education, or any other lawful requirement.

Date: ${date}

Management
Mochan Labs`;
}

function generateRelievingLetter(emp, date) {
  return `Dear ${emp.firstName} ${emp.lastName},

This is to inform you that your employment with Mochan Labs is relieved effective immediately / ${date}.

Your employment record during your tenure with us has been satisfactory. We appreciate your contributions and wish you all the best in your future endeavors.

Please ensure that you return all company property, including access cards, laptops, and any other materials issued to you.

We hereby certify that you have served the notice period / have been relieved from immediate effect.

Best wishes for your future,

Management
Mochan Labs`;
}

function generateSalaryCertificate(emp, date) {
  return `To Whom It May Concern,

This is to certify that ${emp.firstName} ${emp.lastName} (Employee ID: ${emp.employeeCode || 'N/A'}) is / was employed with Mochan Labs as ${emp.position || 'Software Engineer'} in the ${emp.department || 'Engineering'} Department.

This is to certify that the salary structure for the above-mentioned employee is as follows:

Annual Cost to Company (CTC): [To be filled]
Monthly Salary: [To be filled]
Benefits: [To be filled]

This certificate is issued for the purpose of loan applications, visa processing, or any other official requirement.

Date: ${date}

Management
Mochan Labs`;
}

// Save letter info to backend
async function saveLettterInfo(empId, letterType, fileName) {
  try {
    await fetch(`${API_URL}/api/employees/${empId}/letters`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        letterType,
        fileName,
        generatedDate: new Date().toISOString()
      })
    });
    loadEmployees();
  } catch (err) {
    console.error('Error saving letter info:', err);
  }
}

// Update stats
function updateStats() {
  document.getElementById('totalEmployees').textContent = employees.length;
  const offersCount = employees.reduce((sum, emp) => sum + (emp.generatedLetters?.filter(l => l.letterType === 'offer').length || 0), 0);
  const experienceCount = employees.reduce((sum, emp) => sum + (emp.generatedLetters?.filter(l => l.letterType === 'experience').length || 0), 0);
  document.getElementById('offersGenerated').textContent = offersCount;
  document.getElementById('experienceGenerated').textContent = experienceCount;
}

// Toast notification
function showToast(msg, type = 'info') {
  const icons = { success: 'check-circle', info: 'info-circle', error: 'exclamation-circle' };
  const t = document.createElement('div');
  t.style.cssText = `
    position: fixed; top: 20px; right: 20px; padding: 15px 20px;
    background: ${type === 'success' ? 'rgba(34,197,94,0.15)' : type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(0,180,216,0.15)'};
    border: 1px solid ${type === 'success' ? 'rgba(34,197,94,0.35)' : type === 'error' ? 'rgba(239,68,68,0.35)' : 'rgba(0,180,216,0.35)'};
    color: ${type === 'success' ? '#4ade80' : type === 'error' ? '#f87171' : '#00b4d8'};
    border-radius: 8px; z-index: 9999; display: flex; align-items: center; gap: 10px;
    font-weight: 500; animation: slideInRight 0.3s ease both;
  `;
  t.innerHTML = `<i class="fas fa-${icons[type]}"></i> ${msg}`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

console.log('=== EMPLOYEES.JS LOADED ===');
