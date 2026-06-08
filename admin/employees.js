console.log('=== EMPLOYEES.JS STARTING ===');

const API_URL = window.location.origin;
let employees = [];
let selectedEmployeeId = null;
let selectedLetterType = null;
let positionHistory = [];
let tempPositionChanges = []; // For new position changes being added
let showInactiveEmployees = false;

function getAuthHeaders() {
  const token = sessionStorage.getItem('ml_admin_token');
  console.log('Using token:', token ? 'Present (' + token.substring(0, 20) + '...)' : 'Missing');

  if (!token) {
    console.error('❌ NO TOKEN FOUND! User may not be logged in.');
  }

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

  // Clear error state when user starts typing
  const requiredFields = ['firstName', 'lastName', 'email', 'mobile', 'gender'];
  requiredFields.forEach(fieldId => {
    const element = document.getElementById(fieldId);
    if (element) {
      element.addEventListener('input', () => {
        element.closest('.form-group').classList.remove('error');
      });
      element.addEventListener('change', () => {
        element.closest('.form-group').classList.remove('error');
      });
    }
  });

  // Add Position Change button
  const addPositionChangeBtn = document.getElementById('addPositionChangeBtn');
  if (addPositionChangeBtn) {
    addPositionChangeBtn.addEventListener('click', addPositionChange);
    console.log('✅ Add Position Change button listener attached');
  }

  // Letter modal close buttons
  const letterCloseBtn = document.querySelector('#letterModal .close-btn');
  if (letterCloseBtn) {
    letterCloseBtn.addEventListener('click', closeLetterModal);
  }

  // Letter options
  document.querySelectorAll('.letter-option').forEach(option => {
    option.addEventListener('click', () => {
      selectedLetterType = option.dataset.letterType;
      generateLetter();
    });
  });

  // Click outside letter modal to close
  document.getElementById('letterModal').addEventListener('click', (e) => {
    if (e.target.id === 'letterModal') closeLetterModal();
  });

  // Relieving modal close button
  const relievingCloseBtn = document.querySelector('#relievingModal .close-btn');
  if (relievingCloseBtn) {
    relievingCloseBtn.addEventListener('click', closeRelievingModal);
  }

  // Relieving form submission
  document.getElementById('relievingForm').addEventListener('submit', submitRelievingForm);

  // Click outside relieving modal to close
  document.getElementById('relievingModal').addEventListener('click', (e) => {
    if (e.target.id === 'relievingModal') closeRelievingModal();
  });

  // Toggle inactive employees button
  const toggleBtn = document.getElementById('toggleInactiveBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      showInactiveEmployees = !showInactiveEmployees;
      toggleBtn.innerHTML = showInactiveEmployees
        ? '<i class="fas fa-eye"></i> Show Active'
        : '<i class="fas fa-eye-slash"></i> Show Inactive';
      renderEmployeesList();
    });
  }
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

  const filteredEmployees = showInactiveEmployees
    ? employees.filter(e => !e.isActive)
    : employees.filter(e => e.isActive);

  if (filteredEmployees.length === 0) {
    const msg = showInactiveEmployees ? 'No inactive employees' : 'No active employees';
    list.innerHTML = `<p style="text-align: center; color: var(--muted); padding: 40px 20px;"><i class="fas fa-inbox" style="font-size: 2rem; display: block; margin-bottom: 10px;"></i> ${msg}</p>`;
    return;
  }

  list.innerHTML = filteredEmployees.map(emp => `
    <div class="employee-item" style="${!emp.isActive ? 'opacity: 0.6; background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3);' : ''}">
      <div class="employee-info">
        <div class="employee-name">
          ${emp.firstName} ${emp.lastName}
          ${!emp.isActive ? '<span style="color: var(--red); font-size: 0.8rem; margin-left: 10px;"><i class="fas fa-ban"></i> Inactive</span>' : ''}
        </div>
        <div class="employee-meta">
          <i class="fas fa-briefcase"></i> ${emp.position || 'N/A'} |
          <i class="fas fa-envelope"></i> ${emp.email} |
          <i class="fas fa-phone"></i> ${emp.mobile}
          ${emp.isActive ? '' : `<br><i class="fas fa-calendar"></i> Relieved: ${new Date(emp.dateOfRelieving).toLocaleDateString('en-IN')}`}
        </div>
      </div>
      <div class="employee-actions">
        <button class="icon-btn" title="Generate Letter" data-employee-id="${emp._id}">
          <i class="fas fa-file-word"></i>
        </button>
        <button class="icon-btn" title="Edit" data-employee-id="${emp._id}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="icon-btn" title="${emp.isActive ? 'Mark as Inactive' : 'View'}" data-employee-id="${emp._id}" style="${!emp.isActive ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
          <i class="fas fa-${emp.isActive ? 'door-open' : 'eye'}"></i>
        </button>
      </div>
    </div>
  `).join('');

  // Attach action listeners
  document.querySelectorAll('.employee-item .icon-btn').forEach((btn, idx) => {
    const empId = btn.dataset.employeeId;
    if (idx % 3 === 0) btn.addEventListener('click', () => openLetterModal(empId));
    else if (idx % 3 === 1) btn.addEventListener('click', () => editEmployee(empId));
    else btn.addEventListener('click', () => {
      const emp = employees.find(e => e._id === empId);
      if (emp.isActive) openRelievingModal(empId);
    });
  });
}

// Validate employee form
function validateEmployeeForm() {
  // Clear all previous errors
  document.querySelectorAll('.form-group.error').forEach(el => el.classList.remove('error'));
  document.getElementById('validationSummary').classList.remove('show');

  // Required fields mapping
  const requiredFields = [
    { id: 'firstName', name: 'First Name' },
    { id: 'lastName', name: 'Last Name' },
    { id: 'email', name: 'Email Address' },
    { id: 'mobile', name: 'Mobile Number' },
    { id: 'gender', name: 'Gender' }
  ];

  const missingFields = [];

  requiredFields.forEach(field => {
    const element = document.getElementById(field.id);
    const value = element.value.trim();

    if (!value) {
      missingFields.push(field.name);
      element.closest('.form-group').classList.add('error');
    }
  });

  // Show validation summary if there are errors
  if (missingFields.length > 0) {
    const summary = document.getElementById('validationSummary');
    const message = document.getElementById('validationMessage');
    message.textContent = `Please fill in the following required fields: ${missingFields.join(', ')}`;
    summary.classList.add('show');
    summary.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }

  return true;
}

// Save employee
async function saveEmployee(e) {
  e.preventDefault();

  // Validate before saving
  if (!validateEmployeeForm()) {
    return;
  }

  const empId = document.getElementById('employeeId').value;

  const data = {
    // Personal Information
    firstName: document.getElementById('firstName').value,
    lastName: document.getElementById('lastName').value,
    email: document.getElementById('email').value,
    mobile: document.getElementById('mobile').value,
    gender: document.getElementById('gender').value,
    dob: document.getElementById('dob').value,
    permanentAddress: document.getElementById('permanentAddress').value,
    communicationAddress: document.getElementById('communicationAddress').value,
    skills: document.getElementById('skills').value,

    // Employment Information
    employeeCode: document.getElementById('employeeCode').value,
    reportingManager: document.getElementById('reportingManager').value,
    employmentType: document.getElementById('employmentType').value,
    dateOfJoining: document.getElementById('dateOfJoining').value,
    workLocation: document.getElementById('workLocation').value,
    officialEmail: document.getElementById('officialEmail').value,
    probationPeriod: document.getElementById('probationPeriod').value,
  };

  // If there are temp position changes, use the first one as the initial position
  if (tempPositionChanges.length > 0) {
    const firstChange = tempPositionChanges[0];
    data.position = firstChange.position;
    data.ctc = firstChange.ctc;
    data.department = firstChange.department;
    data.effectiveDate = firstChange.effectiveDate;
  }

  try {
    const method = empId ? 'PUT' : 'POST';
    const url = empId ? `${API_URL}/api/employees/${empId}` : `${API_URL}/api/employees`;

    console.log('Sending employee data:', data);

    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });

    const responseData = await res.json();
    console.log('Response:', responseData);

    if (!res.ok) {
      // Handle 401 Unauthorized
      if (res.status === 401) {
        console.error('❌ Authentication Failed! Redirecting to login...');
        sessionStorage.clear();
        window.location.href = 'login.html';
        return;
      }

      // Handle backend validation errors
      if (responseData.missingFields) {
        responseData.missingFields.forEach(fieldName => {
          const fieldId = fieldName.toLowerCase().replace(/ /g, '');
          const element = document.getElementById(fieldId);
          if (element) {
            element.closest('.form-group').classList.add('error');
          }
        });
      }

      // Highlight the field that has duplicate error
      if (responseData.field) {
        const fieldElement = document.getElementById(responseData.field);
        if (fieldElement) {
          fieldElement.closest('.form-group').classList.add('error');
        }
      }

      throw new Error(responseData.error || `Save failed (Status: ${res.status})`);
    }

    showToast('Employee saved successfully!', 'success');
    document.getElementById('employeeForm').reset();
    document.getElementById('employeeId').value = '';
    document.getElementById('validationSummary').classList.remove('show');
    tempPositionChanges = [];
    positionHistory = [];
    displayPositionChanges();
    loadEmployees();
  } catch (err) {
    console.error('Save error:', err);
    showToast('Error: ' + err.message, 'error');
  }
}

// Add Position Change
function addPositionChange() {
  const designation = document.getElementById('positionChangeDesignation').value.trim();
  const department = document.getElementById('positionChangeDepartment').value.trim();
  const ctc = parseInt(document.getElementById('positionChangeCTC').value) || 0;
  const effectiveDate = document.getElementById('positionChangeEffectiveDate').value;

  if (!designation || !department || !ctc || !effectiveDate) {
    showToast('Please fill all Position Change fields', 'error');
    return;
  }

  tempPositionChanges.push({
    id: Date.now(),
    position: designation,
    department,
    ctc,
    effectiveDate
  });

  // Clear form
  document.getElementById('positionChangeDesignation').value = '';
  document.getElementById('positionChangeDepartment').value = '';
  document.getElementById('positionChangeCTC').value = '';
  document.getElementById('positionChangeEffectiveDate').value = '';

  displayPositionChanges();
  showToast('Position change added!', 'success');
}

// Display Position Changes
function displayPositionChanges() {
  const allChanges = [...tempPositionChanges, ...positionHistory];

  if (allChanges.length === 0) {
    document.getElementById('positionHistoryContainer').innerHTML = '<p style="text-align: center; color: var(--muted); padding: 20px;">No position changes yet. Add a position change record above.</p>';
    return;
  }

  const html = `
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: rgba(34,197,94,0.1);">
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.85rem;">Designation</th>
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.85rem;">Department</th>
            <th style="padding: 10px; text-align: right; border-bottom: 1px solid var(--border); font-size: 0.85rem;">CTC</th>
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.85rem;">Effective Date</th>
            <th style="padding: 10px; text-align: center; border-bottom: 1px solid var(--border); font-size: 0.85rem;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${allChanges.map((change, idx) => `
            <tr style="border-bottom: 1px solid var(--border); background: ${idx % 2 === 0 ? 'transparent' : 'rgba(34,197,94,0.05)'};">
              <td style="padding: 10px; font-size: 0.9rem;">${change.position}</td>
              <td style="padding: 10px; font-size: 0.9rem;">${change.department}</td>
              <td style="padding: 10px; text-align: right; font-size: 0.9rem; color: var(--green); font-weight: 600;">₹${change.ctc.toLocaleString('en-IN')}</td>
              <td style="padding: 10px; font-size: 0.9rem;">${new Date(change.effectiveDate).toLocaleDateString('en-IN')}</td>
              <td style="padding: 10px; text-align: center;">
                ${tempPositionChanges.find(t => t.id === change.id) ? `
                  <button type="button" class="icon-btn" onclick="removePositionChange(${change.id})" title="Remove" style="color: var(--red);">
                    <i class="fas fa-trash"></i>
                  </button>
                ` : '<span style="color: var(--muted); font-size: 0.8rem;">Saved</span>'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  document.getElementById('positionHistoryContainer').innerHTML = html;
}

// Remove Position Change
function removePositionChange(id) {
  tempPositionChanges = tempPositionChanges.filter(t => t.id !== id);
  displayPositionChanges();
  showToast('Position change removed', 'success');
}

// Edit employee
function editEmployee(empId) {
  const emp = employees.find(e => e._id === empId);
  if (!emp) return;

  // Personal Information
  document.getElementById('employeeId').value = emp._id;
  document.getElementById('firstName').value = emp.firstName;
  document.getElementById('lastName').value = emp.lastName;
  document.getElementById('email').value = emp.email;
  document.getElementById('mobile').value = emp.mobile;
  document.getElementById('gender').value = emp.gender;
  document.getElementById('dob').value = emp.dob || '';
  document.getElementById('permanentAddress').value = emp.permanentAddress || '';
  document.getElementById('communicationAddress').value = emp.communicationAddress || '';
  document.getElementById('skills').value = emp.skills || '';

  // Employment Information
  document.getElementById('employeeCode').value = emp.employeeCode || '';
  document.getElementById('position').value = emp.position || '';
  document.getElementById('department').value = emp.department || '';
  document.getElementById('reportingManager').value = emp.reportingManager || '';
  document.getElementById('employmentType').value = emp.employmentType || 'full-time';
  document.getElementById('dateOfJoining').value = emp.dateOfJoining || '';
  document.getElementById('workLocation').value = emp.workLocation || '';
  document.getElementById('officialEmail').value = emp.officialEmail || '';
  document.getElementById('ctc').value = emp.ctc || '';
  document.getElementById('probationPeriod').value = emp.probationPeriod || '';
  document.getElementById('effectiveDate').value = ''; // Clear for new position changes

  // Load and display position history
  positionHistory = emp.positionHistory || [];
  tempPositionChanges = []; // Clear any unsaved changes
  displayPositionChanges();

  document.querySelector('.section-title').scrollIntoView({ behavior: 'smooth' });
  document.getElementById('firstName').focus();
}

// Open relieving modal
function openRelievingModal(empId) {
  selectedEmployeeId = empId;
  const emp = employees.find(e => e._id === empId);
  if (emp) {
    document.getElementById('relievingDate').value = '';
    document.getElementById('relievingComments').value = '';
    document.getElementById('relievingModal').classList.add('open');
  }
}

// Close relieving modal
function closeRelievingModal() {
  document.getElementById('relievingModal').classList.remove('open');
  selectedEmployeeId = null;
}

// Submit relieving form
async function submitRelievingForm(e) {
  e.preventDefault();

  const dateOfRelieving = document.getElementById('relievingDate').value;
  const relievingComments = document.getElementById('relievingComments').value;

  if (!dateOfRelieving) {
    showToast('Please select date of relieving', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/employees/${selectedEmployeeId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        dateOfRelieving,
        relievingComments
      })
    });

    if (!res.ok) throw new Error((await res.json()).error || 'Failed to relieve employee');
    showToast('Employee marked as inactive', 'success');
    closeRelievingModal();
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

// Display position history
function displayPositionHistory() {
  const historyContainer = document.getElementById('positionHistoryContainer');
  if (!historyContainer) return;

  if (!positionHistory || positionHistory.length === 0) {
    historyContainer.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 20px;">No position history yet</p>';
    return;
  }

  const historyHtml = `
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: rgba(0,180,216,0.1);">
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.85rem;">Position</th>
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.85rem;">Department</th>
            <th style="padding: 10px; text-align: right; border-bottom: 1px solid var(--border); font-size: 0.85rem;">CTC</th>
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.85rem;">Effective Date</th>
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.85rem;">End Date</th>
          </tr>
        </thead>
        <tbody>
          ${positionHistory.map((h, idx) => `
            <tr style="border-bottom: 1px solid var(--border); background: ${idx % 2 === 0 ? 'transparent' : 'rgba(0,180,216,0.05)'};">
              <td style="padding: 10px; font-size: 0.9rem;">${h.position}</td>
              <td style="padding: 10px; font-size: 0.9rem;">${h.department}</td>
              <td style="padding: 10px; text-align: right; font-size: 0.9rem; color: var(--green); font-weight: 600;">₹${h.ctc.toLocaleString('en-IN')}</td>
              <td style="padding: 10px; font-size: 0.9rem;">${new Date(h.effectiveDate).toLocaleDateString('en-IN')}</td>
              <td style="padding: 10px; font-size: 0.9rem; color: var(--muted);">${h.endDate ? new Date(h.endDate).toLocaleDateString('en-IN') : 'Current'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  historyContainer.innerHTML = historyHtml;
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
