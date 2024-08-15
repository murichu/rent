// backend/models/propertyModel.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Property model definition
const Property = sequelize.define("Property", {
  address: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  isVacant: { type: DataTypes.BOOLEAN, defaultValue: true },
  price: { type: DataTypes.FLOAT, allowNull: true }, // Example of an additional field
});

module.exports = Property;
