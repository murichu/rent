const Expense = require("../models/expenseModel");

// Log an expense
const logExpense = async (req, res) => {
  const { propertyId, amount, description } = req.body;
  try {
    const expense = await Expense.create({ propertyId, amount, description });
    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: "Failed to log expense" });
  }
};

// Generate expense report
const generateExpenseReport = async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    const expenses = await Expense.findAll({
      where: {
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate expense report" });
  }
};

module.exports = { logExpense, generateExpenseReport };
