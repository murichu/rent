const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Maintenance model definition
const Maintenance = sequelize.define("Maintenance", {
  tenantId: {
    type: DataTypes.INTEGER,
    references: { model: "Tenants", key: "id" }, // Assuming you have a Tenants model
    allowNull: false,
  },
  propertyId: {
    type: DataTypes.INTEGER,
    references: { model: "Properties", key: "id" },
    allowNull: false,
  },
  description: { type: DataTypes.TEXT, allowNull: false },
  status: {
    type: DataTypes.ENUM("Pending", "In Progress", "Completed"),
    defaultValue: "Pending",
  },
});

module.exports = Maintenance;
