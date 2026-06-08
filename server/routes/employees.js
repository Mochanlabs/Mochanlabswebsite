const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const EmployeePositionHistory = require('../models/EmployeePositionHistory');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// GET all employees with position history
router.get('/', async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    const employeesWithHistory = await Promise.all(
      employees.map(async (emp) => {
        const history = await EmployeePositionHistory.find({ employeeId: emp._id }).sort({ effectiveDate: -1 });
        return {
          ...emp.toObject(),
          positionHistory: history
        };
      })
    );
    res.json({ success: true, data: employeesWithHistory });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single employee with position history
router.get('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });

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

// CREATE employee
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, gender } = req.body;

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

    const employee = new Employee(req.body);
    await employee.save();

    // Create initial position history record only if designation, department, and CTC are all provided
    if (position && position.trim() && department && department.trim() && ctc && ctc > 0) {
      try {
        const positionHistory = new EmployeePositionHistory({
          employeeId: employee._id,
          position,
          department,
          ctc,
          effectiveDate: dateOfJoining ? new Date(dateOfJoining) : new Date()
        });
        await positionHistory.save();
      } catch (historyErr) {
        console.error('Error creating position history:', historyErr);
        // Don't fail the employee creation if position history fails
      }
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

    req.body.updatedAt = new Date();
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });

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

// DEACTIVATE employee (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { dateOfRelieving, relievingComments } = req.body;

    if (!dateOfRelieving) {
      return res.status(400).json({ success: false, error: 'Date of relieving is required' });
    }

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      {
        isActive: false,
        dateOfRelieving,
        relievingComments,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });

    const history = await EmployeePositionHistory.find({ employeeId: req.params.id }).sort({ effectiveDate: -1 });
    res.json({
      success: true,
      message: 'Employee marked as inactive',
      data: {
        ...employee.toObject(),
        positionHistory: history
      }
    });
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

module.exports = router;
