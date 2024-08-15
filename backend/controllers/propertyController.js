// backend/controllers/propertyController.js
const Property = require("../models/propertyModel");
const { Op } = require("sequelize");

// Get vacant properties with optional filtering
const getVacantProperties = async (req, res) => {
  const { rooms, minPrice, maxPrice } = req.query;

  try {
    const query = { where: { isVacant: true } };

    if (rooms) query.where.rooms = rooms;
    if (minPrice || maxPrice) query.where.price = {};
    if (minPrice) query.where.price[Op.gte] = minPrice;
    if (maxPrice) query.where.price[Op.lte] = maxPrice;

    const properties = await Property.findAll(query);
    res.json(properties);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch vacant properties" });
  }
};

// Get all properties
const getProperties = async (req, res) => {
  try {
    const properties = await Property.findAll();
    res.json(properties);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve properties" });
  }
};

// Add a new property
const addProperty = async (req, res) => {
  const { address, type, description, isVacant, price } = req.body;
  try {
    const newProperty = await Property.create({
      address,
      type,
      description,
      isVacant,
      price,
    });
    res.status(201).json(newProperty);
  } catch (error) {
    res.status(500).json({ error: "Failed to add property" });
  }
};

// Update a property
const updateProperty = async (req, res) => {
  const { id } = req.params;
  const { address, type, description, isVacant, price } = req.body;
  try {
    const property = await Property.findByPk(id);
    if (property) {
      property.address = address || property.address;
      property.type = type || property.type;
      property.description = description || property.description;
      property.isVacant = isVacant !== undefined ? isVacant : property.isVacant;
      property.price = price || property.price;
      await property.save();
      res.json(property);
    } else {
      res.status(404).json({ error: "Property not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to update property" });
  }
};

// Delete a property
const deleteProperty = async (req, res) => {
  const { id } = req.params;
  try {
    const property = await Property.findByPk(id);
    if (property) {
      await property.destroy();
      res.json({ message: "Property deleted" });
    } else {
      res.status(404).json({ error: "Property not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to delete property" });
  }
};

module.exports = {
  addProperty,
  getProperties,
  updateProperty,
  deleteProperty,
  getVacantProperties,
};
