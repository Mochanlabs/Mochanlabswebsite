const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Invoice = require('../models/Invoice');
const logger = require('../services/logger');

router.post('/', async (req, res) => {
  try {
    const { amount, type, description, category, date, referenceId, status, notes } = req.body;

    if (!amount || !type || !description) {
      return res.status(400).json({
        success: false,
        message: 'Amount, type, and description are required'
      });
    }

    if (!['credit', 'debit'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be "credit" or "debit"'
      });
    }

    const transaction = new Transaction({
      amount,
      type,
      description,
      category: category || '',
      date: date ? new Date(date) : Date.now(),
      referenceId: referenceId || '',
      status: status || 'pending',
      notes: notes || ''
    });

    await transaction.save();
    logger.info('Transaction created', { transactionId: transaction._id, amount, type });

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction
    });
  } catch (error) {
    logger.error('Error creating transaction', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error creating transaction'
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const { type, status, category } = req.query;
    const query = {};

    if (type && ['credit', 'debit'].includes(type)) {
      query.type = type;
    }
    if (status && ['pending', 'completed', 'cancelled'].includes(status)) {
      query.status = status;
    }
    if (category) {
      query.category = category;
    }

    const transactions = await Transaction.find(query).sort({ date: -1 });

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    logger.error('Error fetching transactions', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error fetching transactions'
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    logger.error('Error fetching transaction', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction'
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { amount, type, description, category, date, referenceId, status, notes } = req.body;
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (amount !== undefined) transaction.amount = amount;
    if (type && ['credit', 'debit'].includes(type)) transaction.type = type;
    if (description) transaction.description = description;
    if (category !== undefined) transaction.category = category;
    if (date) transaction.date = new Date(date);
    if (referenceId !== undefined) transaction.referenceId = referenceId;
    if (status && ['pending', 'completed', 'cancelled'].includes(status)) transaction.status = status;
    if (notes !== undefined) transaction.notes = notes;

    await transaction.save();

    if (transaction.invoiceId && transaction.lineItemIndex !== null) {
      const invoice = await Invoice.findById(transaction.invoiceId);
      if (invoice && invoice.items[transaction.lineItemIndex]) {
        invoice.items[transaction.lineItemIndex].amount = amount || transaction.amount;
        await invoice.save();
        logger.info('Invoice updated from transaction sync', { invoiceId: invoice._id });
      }
    }

    logger.info('Transaction updated', { transactionId: transaction._id });

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: transaction
    });
  } catch (error) {
    logger.error('Error updating transaction', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error updating transaction'
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndDelete(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    logger.info('Transaction deleted', { transactionId: transaction._id });

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting transaction', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error deleting transaction'
    });
  }
});

router.post('/:id/link-invoice', async (req, res) => {
  try {
    const { invoiceId, lineItemIndex } = req.body;
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    transaction.invoiceId = invoiceId;
    transaction.lineItemIndex = lineItemIndex || 0;
    transaction.status = 'completed';
    await transaction.save();

    if (!invoice.items[lineItemIndex || 0]) {
      invoice.items.push({
        desc: transaction.description,
        qty: 1,
        rate: transaction.amount,
        amount: transaction.amount
      });
    } else {
      invoice.items[lineItemIndex || 0].amount = transaction.amount;
    }

    await invoice.save();
    logger.info('Transaction linked to invoice', { transactionId: transaction._id, invoiceId });

    res.json({
      success: true,
      message: 'Transaction linked to invoice',
      data: transaction
    });
  } catch (error) {
    logger.error('Error linking transaction to invoice', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error linking transaction to invoice'
    });
  }
});

module.exports = router;
