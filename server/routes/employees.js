const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const EmployeePositionHistory = require('../models/EmployeePositionHistory');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Helper function to parse date string from frontend (YYYY-MM-DD format)
function parseDate(dateString) {
  if (!dateString) return null;

  // If it's already a Date object, return it
  if (dateString instanceof Date) return dateString;

  // Parse YYYY-MM-DD or ISO format
  if (typeof dateString === 'string') {
    const parts = dateString.split('T')[0].split('-'); // Get just the date part
    if (parts.length === 3) {
      // Create date at midnight UTC for YYYY-MM-DD format
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
  }

  return null;
}

// GET all employees with position history and identity documents
router.get('/', async (req, res) => {
  try {
    const EmployeeIdentity = require('../models/EmployeeIdentity');
    const employees = await Employee.find().sort({ createdAt: -1 });
    const employeesWithHistory = await Promise.all(
      employees.map(async (emp) => {
        const history = await EmployeePositionHistory.find({ employeeId: emp._id }).sort({ effectiveDate: -1 });
        const identityDocuments = await EmployeeIdentity.find({ employeeId: emp._id }).sort({ createdAt: -1 });
        return {
          ...emp.toObject(),
          positionHistory: history,
          identityDocuments: identityDocuments
        };
      })
    );
    res.json({ success: true, data: employeesWithHistory });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single employee with position history and identity documents
router.get('/:id', async (req, res) => {
  try {
    const EmployeeIdentity = require('../models/EmployeeIdentity');
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });

    const history = await EmployeePositionHistory.find({ employeeId: req.params.id }).sort({ effectiveDate: -1 });
    const identityDocuments = await EmployeeIdentity.find({ employeeId: req.params.id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        ...employee.toObject(),
        positionHistory: history,
        identityDocuments: identityDocuments
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CREATE employee
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, gender, position, department, ctc, dateOfJoining } = req.body;

    // Validate required fields
    const missingFields = [];
    if (!firstName) missingFields.push('First Name');
    if (!lastName) missingFields.push('Last Name');
    if (!email) missingFields.push('Email Address');
    if (!mobile) missingFields.push('Mobile Number');
    if (!gender) missingFields.push('Gender');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields: missingFields
      });
    }

    // Convert date strings to Date objects
    const data = { ...req.body };
    data.dob = parseDate(data.dob);
    data.dateOfJoining = parseDate(data.dateOfJoining);
    data.dateOfRelieving = parseDate(data.dateOfRelieving);

    console.log('CREATE - Parsed dates - dob:', data.dob, 'dateOfJoining:', data.dateOfJoining);

    const employee = new Employee(data);
    await employee.save();
    console.log('Employee created with data:', { firstName, lastName, email, dob: req.body.dob, reportingManager: req.body.reportingManager, dateOfJoining: req.body.dateOfJoining, workLocation: req.body.workLocation });

    // Create initial position history record only if position, department, and CTC are all provided
    const hasPosition = position && typeof position === 'string' && position.trim();
    const hasDepartment = department && typeof department === 'string' && department.trim();
    const hasCTC = ctc && parseInt(ctc) > 0;

    if (hasPosition && hasDepartment && hasCTC) {
      try {
        const positionHistory = new EmployeePositionHistory({
          employeeId: employee._id,
          position: position.trim(),
          department: department.trim(),
          ctc: parseInt(ctc),
          effectiveDate: dateOfJoining ? new Date(dateOfJoining) : new Date()
        });
        await positionHistory.save();
        console.log('Position history created for employee:', employee._id);
      } catch (historyErr) {
        console.error('Error creating position history:', historyErr);
        // Don't fail the employee creation if position history fails
      }
    } else {
      console.log('Skipping position history creation - position:', hasPosition, 'department:', hasDepartment, 'ctc:', hasCTC);
    }

    const history = await EmployeePositionHistory.find({ employeeId: employee._id });
    res.json({
      success: true,
      data: {
        ...employee.toObject(),
        positionHistory: history
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      let message = '';
      if (field === 'email') {
        message = `Email address already exists. Please use a different email or edit the existing employee.`;
      } else if (field === 'employeeCode') {
        message = `Employee ID already exists. Please use a different Employee ID or leave it blank for auto-generation.`;
      } else {
        message = `${field} already exists`;
      }
      return res.status(400).json({ success: false, error: message, field: field });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE employee
router.put('/:id', async (req, res) => {
  try {
    const { position, department, ctc, effectiveDate } = req.body;
    const oldEmployee = await Employee.findById(req.params.id);

    if (!oldEmployee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    // Convert date strings to Date objects
    const data = { ...req.body };
    data.dob = parseDate(data.dob);
    data.dateOfJoining = parseDate(data.dateOfJoining);
    data.dateOfRelieving = parseDate(data.dateOfRelieving);

    console.log('UPDATE - Parsed dates - dob:', data.dob, 'dateOfJoining:', data.dateOfJoining);

    data.updatedAt = new Date();
    const employee = await Employee.findByIdAndUpdate(req.params.id, data, { new: true });

    // Check if position, department, or ctc changed
    if ((position && position !== oldEmployee.position) ||
        (department && department !== oldEmployee.department) ||
        (ctc && ctc !== oldEmployee.ctc)) {

      // End previous position record if exists
      const lastHistory = await EmployeePositionHistory.findOne({ employeeId: req.params.id, endDate: null }).sort({ effectiveDate: -1 });
      if (lastHistory) {
        lastHistory.endDate = new Date();
        await lastHistory.save();
      }

      // Create new position history record
      const newHistory = new EmployeePositionHistory({
        employeeId: req.params.id,
        position: position || oldEmployee.position,
        department: department || oldEmployee.department,
        ctc: ctc || oldEmployee.ctc,
        effectiveDate: effectiveDate || new Date()
      });
      await newHistory.save();
    }

    const history = await EmployeePositionHistory.find({ employeeId: req.params.id }).sort({ effectiveDate: -1 });
    res.json({
      success: true,
      data: {
        ...employee.toObject(),
        positionHistory: history
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE employee (soft or permanent)
router.delete('/:id', async (req, res) => {
  try {
    const isPermanent = req.query.permanent === 'true';
    let { dateOfRelieving, relievingComments } = req.body;

    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });

    if (isPermanent) {
      // Permanent delete - remove from database
      await Employee.findByIdAndDelete(req.params.id);
      await EmployeePositionHistory.deleteMany({ employeeId: req.params.id });

      res.json({
        success: true,
        message: 'Employee permanently deleted'
      });
    } else {
      // Soft delete - mark as inactive
      if (!dateOfRelieving) {
        return res.status(400).json({ success: false, error: 'Date of relieving is required' });
      }

      // Convert date string to Date object
      if (dateOfRelieving && typeof dateOfRelieving === 'string') {
        dateOfRelieving = new Date(dateOfRelieving);
      }

      const updatedEmployee = await Employee.findByIdAndUpdate(
        req.params.id,
        {
          isActive: false,
          dateOfRelieving,
          relievingComments,
          updatedAt: new Date()
        },
        { new: true }
      );

      const history = await EmployeePositionHistory.find({ employeeId: req.params.id }).sort({ effectiveDate: -1 });
      res.json({
        success: true,
        message: 'Employee marked as inactive',
        data: {
          ...updatedEmployee.toObject(),
          positionHistory: history
        }
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ADD generated letter info
router.post('/:id/letters', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });

    employee.generatedLetters.push(req.body);
    await employee.save();
    res.json({ success: true, data: employee });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ADD identity document
router.post('/:id/identity', async (req, res) => {
  try {
    const EmployeeIdentity = require('../models/EmployeeIdentity');
    const { identityType, identityNumber, documentName, documentData } = req.body;

    const identity = new EmployeeIdentity({
      employeeId: req.params.id,
      identityType,
      identityNumber,
      documentName,
      documentPath: documentData // Store as base64 data URL
    });

    await identity.save();
    res.json({ success: true, data: identity });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ADD position history record
router.post('/:id/position-history', async (req, res) => {
  try {
    const { position, department, ctc, effectiveDate } = req.body;

    // Convert date string to Date object
    const effectiveDateObj = parseDate(effectiveDate);

    console.log('Position history - effectiveDate input:', effectiveDate, 'parsed:', effectiveDateObj);

    const positionHistory = new EmployeePositionHistory({
      employeeId: req.params.id,
      position,
      department,
      ctc,
      effectiveDate: effectiveDateObj
    });

    await positionHistory.save();
    res.json({ success: true, data: positionHistory });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE identity document
router.delete('/:empId/identity/:docId', async (req, res) => {
  try {
    const EmployeeIdentity = require('../models/EmployeeIdentity');
    const result = await EmployeeIdentity.findByIdAndDelete(req.params.docId);

    if (!result) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    res.json({ success: true, message: 'Identity document deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE position history record
router.delete('/:empId/position-history/:posId', async (req, res) => {
  try {
    const result = await EmployeePositionHistory.findByIdAndDelete(req.params.posId);

    if (!result) {
      return res.status(404).json({ success: false, error: 'Position history record not found' });
    }

    res.json({ success: true, message: 'Position history deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
