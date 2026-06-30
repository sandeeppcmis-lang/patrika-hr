const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ManpowerRequisition = sequelize.define('ManpowerRequisition', {
  id:                   { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  requestedDate:        { type: DataTypes.STRING(20) },
  department:           { type: DataTypes.STRING(200), allowNull: false },
  requestedByName:      { type: DataTypes.STRING(255), allowNull: false },
  positionName:         { type: DataTypes.STRING(255), allowNull: false },
  noOfRequirements:     { type: DataTypes.INTEGER, defaultValue: 1 },
  presentStrength:      { type: DataTypes.INTEGER },
  recruitmentType:      { type: DataTypes.ENUM('New Recruitment','Replacement','Expansion'), allowNull: false },
  whyRequired:          { type: DataTypes.TEXT },
  reasonIfNew:          { type: DataTypes.STRING(255) },
  replacementName:      { type: DataTypes.STRING(255) },
  replacementSalary:    { type: DataTypes.STRING(100) },
  replacementLastWorking: { type: DataTypes.STRING(100) },
  jobResponsibility:    { type: DataTypes.TEXT },
  ageSpec:              { type: DataTypes.STRING(100) },
  qualificationSpec:    { type: DataTypes.STRING(255) },
  experienceSpec:       { type: DataTypes.STRING(100) },
  genderSpec:           { type: DataTypes.STRING(30) },
  otherSkills:          { type: DataTypes.STRING(255) },
  placeOfPosting:       { type: DataTypes.STRING(200) },
  salaryRange:          { type: DataTypes.STRING(100) },
  reportingTo:          { type: DataTypes.STRING(255) },
  referralName:         { type: DataTypes.STRING(255) },
  referralMobile:       { type: DataTypes.STRING(30) },
  referralEmail:        { type: DataTypes.STRING(255) },
  status:               { type: DataTypes.ENUM('Pending','Approved','Rejected','On Hold'), defaultValue: 'Pending' },
  adminNotes:           { type: DataTypes.TEXT },
  token:                { type: DataTypes.STRING(64), allowNull: true, unique: true },
  tokenExpiresAt:       { type: DataTypes.DATE, allowNull: true },
  sentToEmail:          { type: DataTypes.STRING(255), allowNull: true },
  sentToName:           { type: DataTypes.STRING(255), allowNull: true },
  createdAt:            { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt:            { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'manpower_requisitions',
  timestamps: false
});

module.exports = ManpowerRequisition;
