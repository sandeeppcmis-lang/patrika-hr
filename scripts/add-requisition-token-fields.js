require('dotenv').config();
const { sequelize } = require('../config/db');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');

    const queries = [
      `ALTER TABLE manpower_requisitions ADD COLUMN token VARCHAR(64) NULL UNIQUE`,
      `ALTER TABLE manpower_requisitions ADD COLUMN tokenExpiresAt DATETIME NULL`,
      `ALTER TABLE manpower_requisitions ADD COLUMN sentToEmail VARCHAR(255) NULL`,
      `ALTER TABLE manpower_requisitions ADD COLUMN sentToName VARCHAR(255) NULL`
    ];

    for (const q of queries) {
      try {
        await sequelize.query(q);
        console.log('OK:', q.split(' ADD COLUMN ')[1]);
      } catch (e) {
        if (e.original && e.original.code === 'ER_DUP_FIELDNAME') {
          console.log('Already exists (skipping):', q.split(' ADD COLUMN ')[1]);
        } else {
          throw e;
        }
      }
    }

    console.log('\nMigration complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
})();
