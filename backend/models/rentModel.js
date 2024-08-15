const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Rent model definition
const Rent = sequelize.define("Rent", {
  tenantId: {
    type: DataTypes.INTEGER,
    references: { model: "Users", key: "id" },
    allowNull: false,
  },
  propertyId: {
    type: DataTypes.INTEGER,
    references: { model: "Properties", key: "id" }, // Assuming you have a Property model
    allowNull: false,
  },
  amount: { type: DataTypes.FLOAT, allowNull: false },
  dueDate: { type: DataTypes.DATE, allowNull: false },
  status: { type: DataTypes.ENUM("Pending", "Paid"), defaultValue: "Pending" },
});

module.exports = Rent;
