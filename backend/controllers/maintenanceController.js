const Maintenance = require("../models/maintenanceModel");

// Submit a maintenance request
const submitMaintenanceRequest = async (req, res) => {
  const { tenantId, propertyId, description } = req.body;
  try {
    const request = await Maintenance.create({
      tenantId,
      propertyId,
      description,
      status: "Pending", // Default status when creating a new request
    });
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: "Failed to submit maintenance request" });
  }
};

// Update maintenance status
const updateMaintenanceStatus = async (req, res) => {
  const { id, status } = req.body;
  try {
    const [updated] = await Maintenance.update({ status }, { where: { id } });
    if (updated) {
      const updatedRequest = await Maintenance.findByPk(id);
      res.json(updatedRequest);
    } else {
      res.status(404).json({ error: "Maintenance request not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to update maintenance status" });
  }
};

// Get all maintenance requests
const getMaintenanceRequests = async (req, res) => {
  try {
    const requests = await Maintenance.findAll();
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve maintenance requests" });
  }
};

// Update maintenance request status (by id)
const updateMaintenanceRequest = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const request = await Maintenance.findByPk(id);
    if (request) {
      request.status = status;
      await request.save();
      res.json(request);
    } else {
      res.status(404).json({ error: "Maintenance request not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to update maintenance request" });
  }
};

module.exports = {
  submitMaintenanceRequest,
  updateMaintenanceStatus,
  getMaintenanceRequests,
  updateMaintenanceRequest,
};
