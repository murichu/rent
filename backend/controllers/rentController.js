const Rent = require("../models/rentModel");
const User = require("../models/userModel"); // Assuming you have a User model
const sendEmail = require("../utils/sendEmail");

// Create a rent invoice and send via email
const generateRentInvoice = async (req, res) => {
  const { tenantId, propertyId, amount, dueDate } = req.body;
  try {
    const invoice = await Rent.create({
      tenantId,
      propertyId,
      amount,
      dueDate,
    });

    // Send email with Nodemailer
    const tenant = await User.findByPk(tenantId);
    await sendEmail(
      tenant.email,
      "Rent Invoice",
      `Your rent invoice is ready. Amount: ${amount}, Due Date: ${dueDate}`
    );

    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ error: "Failed to create rent invoice" });
  }
};

// Get all rent invoices
const getRentInvoices = async (req, res) => {
  try {
    const rents = await Rent.findAll();
    res.json(rents);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve rent invoices" });
  }
};

// Update rent payment status
const updateRentStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const rent = await Rent.findByPk(id);
    if (rent) {
      rent.status = status;
      await rent.save();

      // Send payment receipt
      if (status === "Paid") {
        const tenant = await User.findByPk(rent.tenantId);
        await sendEmail(
          tenant.email,
          "Payment Receipt",
          `Your payment of ${rent.amount} has been received`
        );
      }

      res.json(rent);
    } else {
      res.status(404).json({ error: "Rent not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to update rent status" });
  }
};

module.exports = { generateRentInvoice, getRentInvoices, updateRentStatus };
