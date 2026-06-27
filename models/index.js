const Candidate = require('./Candidate');
const Communication = require('./Communication');
const Admin = require('./Admin');
const Position = require('./Position');

// Associations
Candidate.hasMany(Communication, { foreignKey: 'candidateId', as: 'communications', onDelete: 'CASCADE' });
Communication.belongsTo(Candidate, { foreignKey: 'candidateId' });

module.exports = { Candidate, Communication, Admin, Position };
