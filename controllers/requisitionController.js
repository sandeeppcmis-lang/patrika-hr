const { ManpowerRequisition } = require('../models');
const { sendEmail } = require('../utils/emailService');
const { Op } = require('sequelize');
const crypto = require('crypto');

// ── Public ─────────────────────────────────────────────────────────────────────

exports.showForm = (req, res) => {
  res.render('requisition-form', {
    title: 'Manpower Requisition Form – Patrika HR',
    v: res.locals.v,
    prefill: {}
  });
};

exports.submitForm = async (req, res) => {
  try {
    const body = req.body;

    // Handle reasonIfNew checkboxes (may come as array)
    let reasonIfNew = '';
    if (body.reasonIfNew) {
      const reasons = Array.isArray(body.reasonIfNew) ? body.reasonIfNew : [body.reasonIfNew];
      const filtered = reasons.filter(r => r !== 'Others');
      if (reasons.includes('Others') && body.reasonIfNewOther) {
        filtered.push(body.reasonIfNewOther);
      }
      reasonIfNew = filtered.join(', ');
    }

    const record = await ManpowerRequisition.create({
      requestedDate:         body.requestedDate         || '',
      department:            body.department             || '',
      requestedByName:       body.requestedByName        || '',
      positionName:          body.positionName           || '',
      noOfRequirements:      parseInt(body.noOfRequirements) || 1,
      presentStrength:       body.presentStrength ? parseInt(body.presentStrength) : null,
      recruitmentType:       body.recruitmentType        || 'New Recruitment',
      whyRequired:           body.whyRequired            || '',
      reasonIfNew,
      replacementName:       body.replacementName        || '',
      replacementSalary:     body.replacementSalary      || '',
      replacementLastWorking:body.replacementLastWorking || '',
      jobResponsibility:     body.jobResponsibility      || '',
      ageSpec:               body.ageSpec                || '',
      qualificationSpec:     body.qualificationSpec      || '',
      experienceSpec:        body.experienceSpec         || '',
      genderSpec:            body.genderSpec             || '',
      otherSkills:           body.otherSkills            || '',
      placeOfPosting:        body.placeOfPosting         || '',
      salaryRange:           body.salaryRange            || '',
      reportingTo:           body.reportingTo            || '',
      referralName:          body.referralName           || '',
      referralMobile:        body.referralMobile         || '',
      referralEmail:         body.referralEmail          || '',
      status:                'Pending'
    });

    // Send email notification (non-blocking)
    try {
      await sendEmail({
        to: process.env.EMAIL_USER,
        subject: `New Manpower Requisition – ${record.positionName} | ${record.department}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0c97a;border-radius:8px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#1a1a2e,#8b6914);padding:24px;text-align:center;">
              <h2 style="color:#f0c030;margin:0;font-size:22px;">Rajasthan Patrika | Patrika HR</h2>
              <p style="color:#fff;margin:4px 0 0;font-size:13px;">New Manpower Requisition Received</p>
            </div>
            <div style="padding:32px;background:#fff;">
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr><td style="padding:8px;color:#555;font-weight:bold;width:40%;">Position:</td><td style="padding:8px;color:#333;">${record.positionName}</td></tr>
                <tr style="background:#f9f6ec;"><td style="padding:8px;color:#555;font-weight:bold;">Department:</td><td style="padding:8px;color:#333;">${record.department}</td></tr>
                <tr><td style="padding:8px;color:#555;font-weight:bold;">Requested By:</td><td style="padding:8px;color:#333;">${record.requestedByName}</td></tr>
                <tr style="background:#f9f6ec;"><td style="padding:8px;color:#555;font-weight:bold;">Type:</td><td style="padding:8px;color:#333;">${record.recruitmentType}</td></tr>
                <tr><td style="padding:8px;color:#555;font-weight:bold;">No. of Requirements:</td><td style="padding:8px;color:#333;">${record.noOfRequirements}</td></tr>
                <tr style="background:#f9f6ec;"><td style="padding:8px;color:#555;font-weight:bold;">Date Requested:</td><td style="padding:8px;color:#333;">${record.requestedDate}</td></tr>
              </table>
              <div style="margin-top:24px;text-align:center;">
                <a href="${process.env.APP_URL || 'http://localhost:4000'}/admin/requisitions/${record.id}"
                   style="background:#c9941a;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">
                  View Requisition
                </a>
              </div>
            </div>
          </div>`
      });
    } catch (emailErr) {
      console.warn('Requisition email notification failed:', emailErr.message);
    }

    res.render('requisition-success', {
      title: 'Requisition Submitted',
      positionName: record.positionName,
      department: record.department,
      v: res.locals.v
    });
  } catch (err) {
    console.error('submitForm error:', err);
    res.status(500).send(`<h2>Error</h2><pre>${err.message}</pre>`);
  }
};

// ── Admin ──────────────────────────────────────────────────────────────────────

exports.listRequisitions = async (req, res) => {
  try {
    const { status, department } = req.query;
    const where = {};
    if (status && status !== 'All') where.status = status;
    if (department) where.department = { [Op.like]: `%${department}%` };

    const requisitions = await ManpowerRequisition.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    // Stats
    const all = await ManpowerRequisition.findAll();
    const stats = {
      total:    all.length,
      pending:  all.filter(r => r.status === 'Pending').length,
      approved: all.filter(r => r.status === 'Approved').length,
      rejected: all.filter(r => r.status === 'Rejected').length,
      onhold:   all.filter(r => r.status === 'On Hold').length
    };

    res.render('admin/requisitions', {
      title: 'Manpower Requisitions',
      adminName: req.session.adminName || 'Admin',
      requisitions,
      stats,
      filterStatus: status || 'All',
      filterDept: department || '',
      v: res.locals.v
    });
  } catch (err) {
    console.error('listRequisitions error:', err);
    res.status(500).send(`<h2>Error</h2><pre>${err.message}</pre>`);
  }
};

exports.requisitionDetail = async (req, res) => {
  try {
    const req_ = await ManpowerRequisition.findByPk(req.params.id);
    if (!req_) return res.status(404).send('Requisition not found');

    res.render('admin/requisition-detail', {
      title: `Requisition #${req_.id} – ${req_.positionName}`,
      adminName: req.session.adminName || 'Admin',
      r: req_,
      v: res.locals.v
    });
  } catch (err) {
    console.error('requisitionDetail error:', err);
    res.status(500).send(`<h2>Error</h2><pre>${err.message}</pre>`);
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const record = await ManpowerRequisition.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, error: 'Not found' });

    record.status = status;
    record.adminNotes = adminNotes || '';
    record.updatedAt = new Date();
    await record.save();

    res.json({ success: true });
  } catch (err) {
    console.error('updateStatus error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── Email form link to dept head ───────────────────────────────────────────────

exports.sendFormToEmail = async (req, res) => {
  try {
    const { sentToEmail, sentToName, department } = req.body;
    if (!sentToEmail) return res.status(400).json({ success: false, error: 'Email is required' });

    const token          = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const record = await ManpowerRequisition.create({
      department:      department      || '',
      requestedByName: sentToName      || '',
      positionName:    '[Draft]',
      recruitmentType: 'New Recruitment',
      requestedDate:   new Date().toISOString().split('T')[0],
      status:          'Pending',
      token,
      tokenExpiresAt,
      sentToEmail,
      sentToName: sentToName || ''
    });

    const formUrl = `${process.env.APP_URL || 'http://localhost:4000'}/requisition/fill/${token}`;

    await sendEmail({
      to:      sentToEmail,
      subject: `Manpower Requisition Form – Action Required | Patrika HR`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0c97a;border-radius:8px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1a1a2e,#8b6914);padding:24px;text-align:center;">
            <h2 style="color:#f0c030;margin:0;font-size:22px;">Rajasthan Patrika | Patrika HR</h2>
            <p style="color:#fff;margin:4px 0 0;font-size:13px;">Manpower Requisition Request</p>
          </div>
          <div style="padding:32px;background:#fff;">
            <p style="font-size:15px;color:#333;">Dear <strong>${sentToName || 'Department Head'}</strong>,</p>
            <p style="color:#555;line-height:1.7;">You are requested to fill in the Manpower Requisition Form for your department. Please click the button below to open the form.</p>
            ${department ? `<p style="color:#555;"><strong>Department:</strong> ${department}</p>` : ''}
            <div style="margin:28px 0;text-align:center;">
              <a href="${formUrl}" style="background:#c9941a;color:#fff;padding:14px 36px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">
                Fill Requisition Form &rarr;
              </a>
            </div>
            <p style="color:#888;font-size:12px;">This link is valid for 7 days. If you did not expect this email, please ignore it.</p>
            <p style="color:#555;margin-top:24px;">Regards,<br><strong>HR Department</strong><br>Patrika Group</p>
          </div>
          <div style="background:#f5f5f5;padding:10px;text-align:center;">
            <p style="font-size:11px;color:#999;margin:0;">Please do not reply to this email.</p>
          </div>
        </div>`
    });

    res.json({ success: true, id: record.id });
  } catch (err) {
    console.error('sendFormToEmail error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── Token-based form (dept head fills via emailed link) ────────────────────────

exports.showTokenForm = async (req, res) => {
  try {
    const record = await ManpowerRequisition.findOne({ where: { token: req.params.token } });
    if (!record)                          return res.status(404).send('<h2>Invalid or expired link.</h2>');
    if (record.tokenExpiresAt < new Date()) return res.status(410).send('<h2>This form link has expired.</h2><p>Please contact HR for a new link.</p>');
    if (record.positionName !== '[Draft]') return res.status(410).send('<h2>This form has already been submitted.</h2><p>Thank you!</p>');

    res.render('requisition-form', {
      title: 'Manpower Requisition Form – Patrika HR',
      v: res.locals.v,
      prefill: {
        token:           record.token,
        department:      record.department,
        requestedByName: record.requestedByName
      }
    });
  } catch (err) {
    console.error('showTokenForm error:', err);
    res.status(500).send('<h2>Error loading form.</h2><pre>' + err.message + '</pre>');
  }
};

exports.submitTokenForm = async (req, res) => {
  try {
    const record = await ManpowerRequisition.findOne({ where: { token: req.params.token } });
    if (!record)                          return res.status(404).send('<h2>Invalid or expired link.</h2>');
    if (record.tokenExpiresAt < new Date()) return res.status(410).send('<h2>This link has expired.</h2>');
    if (record.positionName !== '[Draft]') return res.status(410).send('<h2>Already submitted.</h2>');

    const body = req.body;

    let reasonIfNew = '';
    if (body.reasonIfNew) {
      const reasons = Array.isArray(body.reasonIfNew) ? body.reasonIfNew : [body.reasonIfNew];
      const filtered = reasons.filter(r => r !== 'Others');
      if (reasons.includes('Others') && body.reasonIfNewOther) filtered.push(body.reasonIfNewOther);
      reasonIfNew = filtered.join(', ');
    }

    await record.update({
      requestedDate:          body.requestedDate          || record.requestedDate,
      department:             body.department             || record.department,
      requestedByName:        body.requestedByName        || record.requestedByName,
      positionName:           body.positionName           || '',
      noOfRequirements:       parseInt(body.noOfRequirements) || 1,
      presentStrength:        body.presentStrength ? parseInt(body.presentStrength) : null,
      recruitmentType:        body.recruitmentType        || 'New Recruitment',
      whyRequired:            body.whyRequired            || '',
      reasonIfNew,
      replacementName:        body.replacementName        || '',
      replacementSalary:      body.replacementSalary      || '',
      replacementLastWorking: body.replacementLastWorking || '',
      jobResponsibility:      body.jobResponsibility      || '',
      ageSpec:                body.ageSpec                || '',
      qualificationSpec:      body.qualificationSpec      || '',
      experienceSpec:         body.experienceSpec         || '',
      genderSpec:             body.genderSpec             || '',
      otherSkills:            body.otherSkills            || '',
      placeOfPosting:         body.placeOfPosting         || '',
      salaryRange:            body.salaryRange            || '',
      reportingTo:            body.reportingTo            || '',
      referralName:           body.referralName           || '',
      referralMobile:         body.referralMobile         || '',
      referralEmail:          body.referralEmail          || '',
      token:                  null,   // invalidate token after use
      updatedAt:              new Date()
    });

    // Notify HR
    try {
      await sendEmail({
        to: process.env.EMAIL_USER,
        subject: `Requisition Submitted – ${record.positionName || body.positionName} | ${record.department}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;border:1px solid #e0c97a;border-radius:8px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#1a1a2e,#8b6914);padding:20px;text-align:center;">
              <h2 style="color:#f0c030;margin:0;font-size:20px;">New Requisition Submitted</h2>
            </div>
            <div style="padding:28px;background:#fff;">
              <p style="color:#555;"><strong>${record.sentToName || record.requestedByName}</strong> has filled the requisition form.</p>
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr><td style="padding:7px;color:#666;width:40%;font-weight:bold;">Position:</td><td style="padding:7px;">${body.positionName}</td></tr>
                <tr style="background:#f9f6ec;"><td style="padding:7px;color:#666;font-weight:bold;">Department:</td><td style="padding:7px;">${record.department}</td></tr>
                <tr><td style="padding:7px;color:#666;font-weight:bold;">Type:</td><td style="padding:7px;">${body.recruitmentType}</td></tr>
              </table>
              <div style="margin-top:20px;text-align:center;">
                <a href="${process.env.APP_URL || 'http://localhost:4000'}/admin/requisitions/${record.id}"
                   style="background:#c9941a;color:#fff;padding:11px 26px;border-radius:6px;text-decoration:none;font-weight:bold;">
                  View Requisition
                </a>
              </div>
            </div>
          </div>`
      });
    } catch (emailErr) {
      console.warn('Notification email failed:', emailErr.message);
    }

    res.render('requisition-success', {
      title: 'Requisition Submitted',
      positionName: body.positionName || record.positionName,
      department:   record.department,
      v: res.locals.v
    });
  } catch (err) {
    console.error('submitTokenForm error:', err);
    res.status(500).send('<h2>Error submitting form.</h2><pre>' + err.message + '</pre>');
  }
};
