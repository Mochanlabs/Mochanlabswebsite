const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// GET all employees
router.get('/', async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    res.json({ success: true, data: employees });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single employee
router.get('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });
    res.json({ success: true, data: employee });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CREATE employee
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, gender, address } = req.body;

    if (!firstName || !lastName || !email || !mobile || !gender || !address) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const employee = new Employee(req.body);
    await employee.save();
    res.json({ success: true, data: employee });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, error: 'Email or Employee Code already exists' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE employee
router.put('/:id', async (req, res) => {
  try {
    req.body.updatedAt = new Date();
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });
    res.json({ success: true, data: employee });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE employee
router.delete('/:id', async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });
    res.json({ success: true, message: 'Employee deleted' });
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
