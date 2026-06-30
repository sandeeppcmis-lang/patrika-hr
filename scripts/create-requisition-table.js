require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASS     || '',
    database: process.env.DB_NAME     || 'patrika_hr'
  });

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS manpower_requisitions (
      id                     INT AUTO_INCREMENT PRIMARY KEY,
      requestedDate          VARCHAR(20),
      department             VARCHAR(200) NOT NULL,
      requestedByName        VARCHAR(255) NOT NULL,
      positionName           VARCHAR(255) NOT NULL,
      noOfRequirements       INT DEFAULT 1,
      presentStrength        INT,
      recruitmentType        ENUM('New Recruitment','Replacement','Expansion') NOT NULL,
      whyRequired            TEXT,
      reasonIfNew            VARCHAR(255),
      replacementName        VARCHAR(255),
      replacementSalary      VARCHAR(100),
      replacementLastWorking VARCHAR(100),
      jobResponsibility      TEXT,
      ageSpec                VARCHAR(100),
      qualificationSpec      VARCHAR(255),
      experienceSpec         VARCHAR(100),
      genderSpec             VARCHAR(30),
      otherSkills            VARCHAR(255),
      placeOfPosting         VARCHAR(200),
      salaryRange            VARCHAR(100),
      reportingTo            VARCHAR(255),
      referralName           VARCHAR(255),
      referralMobile         VARCHAR(30),
      referralEmail          VARCHAR(255),
      status                 ENUM('Pending','Approved','Rejected','On Hold') DEFAULT 'Pending',
      adminNotes             TEXT,
      createdAt              DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt              DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_department (department(100)),
      INDEX idx_status     (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  console.log('manpower_requisitions table created (or already exists).');
  await conn.end();
}

run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
