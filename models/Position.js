const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Position = sequelize.define('Position', {
  id:         { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name:       { type: DataTypes.STRING(255), allowNull: false, unique: true },
  department: { type: DataTypes.STRING(100), defaultValue: '' },
  icon:       { type: DataTypes.STRING(50),  defaultValue: 'briefcase' },
  badge:      { type: DataTypes.STRING(255), defaultValue: '' },
  jdHtml:     { type: DataTypes.TEXT('long'), defaultValue: '' },
  isActive:   { type: DataTypes.BOOLEAN, defaultValue: true },
  sortOrder:  { type: DataTypes.INTEGER, defaultValue: 0 },
  createdAt:  { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt:  { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'positions',
  timestamps: false
});

module.exports = Position;
