'use strict';

const JSZip = require('jszip');
const path  = require('path');
const fs    = require('fs');
const { Candidate, InterviewSheet, CandidateDetailForm, Communication, ActivityLog } = require('../models');

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return String(d); }
}

function esc(v) {
  if (v === null || v === undefined) return '—';
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function safeJson(v) {
  if (!v) return [];
  try { return typeof v === 'string' ? JSON.parse(v) : v; }
  catch { return []; }
}

function headerHtml(title, subtitle) {
  return `
  <div style="background:#1a1a2e;padding:18px 28px;border-bottom:3px solid #f0c030;margin-bottom:24px;">
    <div style="display:flex;align-items:center;gap:14px;">
      <div style="font-size:28px;font-weight:800;color:#f0c030;letter-spacing:1px;">PATRIKA</div>
      <div style="border-left:2px solid #f0c030;padding-left:14px;">
        <div style="color:#ffffff;font-size:16px;font-weight:700;">${title}</div>
        <div style="color:#aaaaaa;font-size:12px;">${subtitle}</div>
      </div>
    </div>
  </div>`;
}

const baseStyle = `
  body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;background:#fff;color:#222;}
  h2{color:#1a1a2e;font-size:18px;margin:0 0 4px 0;}
  h3{color:#1a1a2e;font-size:15px;margin:20px 0 8px 0;padding-bottom:4px;border-bottom:2px solid #f0c030;}
  table{width:100%;border-collapse:collapse;margin-bottom:12px;}
  th{background:#1a1a2e;color:#f0c030;padding:7px 10px;text-align:left;font-size:12px;font-weight:600;}
  td{padding:6px 10px;font-size:13px;border-bottom:1px solid #eee;vertical-align:top;}
  tr:nth-child(even) td{background:#f9f9f9;}
  .label{color:#555;font-size:12px;font-weight:600;width:160px;}
  .section{padding:0 28px 20px 28px;}
  .badge-gold{display:inline-block;background:#f0c030;color:#1a1a2e;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;}
  .not-filled{color:#aaa;font-style:italic;font-size:12px;}
  .footer{text-align:center;margin-top:30px;padding:12px;background:#f5f5f5;font-size:11px;color:#888;border-top:1px solid #ddd;}
`;

// ─── Helper: Interview Sheet HTML ─────────────────────────────────────────────

function generateInterviewHtml(candidate, sheet) {
  const s = sheet || {};

  function roundSection(label, prefix) {
    const by  = s[`${prefix}InterviewedBy`];
    const dt  = s[`${prefix}Date`];
    const rec = s[`${prefix}Recommendation`];
    const sal = s[`${prefix}RecommendedSalary`];
    const des = s[`${prefix}Designation`];
    const mrk = s[`${prefix}Marks`];
    const fb  = s[`${prefix}Feedback`];

    if (!by && !dt && !rec && !fb) {
      return `<h3>${label}</h3><p class="not-filled">Not filled</p>`;
    }
    return `
    <h3>${label}</h3>
    <table>
      <tr><td class="label">Interviewed By</td><td>${esc(by)}</td><td class="label">Date</td><td>${esc(dt)}</td></tr>
      <tr><td class="label">Recommendation</td><td>${esc(rec)}</td><td class="label">Marks</td><td>${esc(mrk)}</td></tr>
      <tr><td class="label">Recommended Salary</td><td>${esc(sal)}</td><td class="label">Designation</td><td>${esc(des)}</td></tr>
      <tr><td class="label" style="width:160px;">Feedback</td><td colspan="3">${esc(fb)}</td></tr>
    </table>`;
  }

  const prelimNotes = s.prelimFamilyNotes;
  const prelimSection = (!s.prelimInterviewedBy && !s.prelimDate && !prelimNotes)
    ? `<h3>Preliminary Round</h3><p class="not-filled">Not filled</p>`
    : `<h3>Preliminary Round</h3>
       <table>
         <tr><td class="label">Interviewed By</td><td>${esc(s.prelimInterviewedBy)}</td><td class="label">Date</td><td>${esc(s.prelimDate)}</td></tr>
         <tr><td class="label">Family / Background Notes</td><td colspan="3">${esc(prelimNotes)}</td></tr>
       </table>`;

  const hasFinalOffer = s.salaryOffered || s.reportingTo || s.otherConditions || s.joiningPeriod || s.finalRemarks;
  const finalSection = hasFinalOffer ? `
    <h3>Final Offer</h3>
    <table>
      <tr><td class="label">Salary Offered</td><td>${esc(s.salaryOffered)}</td><td class="label">Reporting To</td><td>${esc(s.reportingTo)}</td></tr>
      <tr><td class="label">Nature of Appointment</td><td>${esc(s.natureOfAppointment)}</td><td class="label">Probation Period</td><td>${esc(s.probationPeriod)}</td></tr>
      <tr><td class="label">Exit Clause</td><td>${esc(s.exitClause)}</td><td class="label">Joining Period</td><td>${esc(s.joiningPeriod)}</td></tr>
      <tr><td class="label">Other Conditions</td><td colspan="3">${esc(s.otherConditions)}</td></tr>
      <tr><td class="label">Final Remarks</td><td colspan="3">${esc(s.finalRemarks)}</td></tr>
    </table>` : `<h3>Final Offer</h3><p class="not-filled">Not filled</p>`;

  const decisionColor = { Selected:'#198754', 'On Hold':'#ffc107', Rejected:'#dc3545', Pending:'#6c757d' };
  const dc = decisionColor[s.finalDecision] || '#6c757d';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Interview Sheet – ${esc(candidate.fullName)}</title>
<style>${baseStyle}</style>
</head>
<body>
${headerHtml('Interview Sheet', `Generated on ${fmtDate(new Date())}`)}
<div class="section">
  <h2>${esc(candidate.fullName)}</h2>
  <div style="font-size:13px;color:#555;margin-bottom:16px;">
    ${esc(candidate.positionApplying)} &nbsp;·&nbsp; ${esc(candidate.email)} &nbsp;·&nbsp; ${esc(candidate.contactNumber)}
  </div>
  <table>
    <tr><td class="label">Interview Mode</td><td>${esc(s.interviewMode)}</td><td class="label">Scheduled Date</td><td>${esc(s.scheduledDate)}</td></tr>
    <tr><td class="label">Overall Score</td><td>${esc(s.overallScore)}</td><td class="label">Final Decision</td>
    <td><span style="background:${dc};color:#fff;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;">${esc(s.finalDecision) || 'Pending'}</span></td></tr>
  </table>
  ${sheet ? '' : '<p class="not-filled" style="font-size:14px;">Interview sheet has not been filled yet.</p>'}
  ${prelimSection}
  ${roundSection('Round 1', 'r1')}
  ${roundSection('Round 2', 'r2')}
  ${roundSection('HR Round', 'hr')}
  ${finalSection}
</div>
<div class="footer">Patrika HR System &nbsp;·&nbsp; Confidential &nbsp;·&nbsp; Generated ${fmtDate(new Date())}</div>
</body></html>`;
}

// ─── Helper: Personal Detail Form HTML ───────────────────────────────────────

function generateDetailFormHtml(candidate, form) {
  if (!form) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
    <title>Personal Detail Form – ${esc(candidate.fullName)}</title>
    <style>${baseStyle}</style></head><body>
    ${headerHtml('Personal Detail Form', `Generated on ${fmtDate(new Date())}`)}
    <div class="section"><p class="not-filled" style="font-size:14px;padding:20px 0;">Personal detail form has not been submitted yet.</p></div>
    <div class="footer">Patrika HR System &nbsp;·&nbsp; Confidential</div>
    </body></html>`;
  }

  const f = form;

  // Qualifications table
  const quals = safeJson(f.qualifications);
  const qualRows = quals.length > 0
    ? quals.map(q => `<tr>
        <td>${esc(q.examination||q.degree||q.course)}</td>
        <td>${esc(q.board||q.university||q.institute)}</td>
        <td>${esc(q.year||q.passingYear)}</td>
        <td>${esc(q.percentage||q.marks)}</td>
        <td>${esc(q.subjects||q.specialization)}</td>
      </tr>`).join('')
    : `<tr><td colspan="5" class="not-filled">No qualifications entered</td></tr>`;

  // Experience table
  const exps = safeJson(f.experiences);
  const expRows = exps.length > 0
    ? exps.map(e => `<tr>
        <td>${esc(e.employer||e.company||e.organization)}</td>
        <td>${esc(e.designation||e.position)}</td>
        <td>${esc(e.from||e.startDate)}</td>
        <td>${esc(e.to||e.endDate)}</td>
        <td>${esc(e.ctc||e.salary)}</td>
        <td>${esc(e.reasonForLeaving||e.reason)}</td>
      </tr>`).join('')
    : `<tr><td colspan="6" class="not-filled">No experience entered</td></tr>`;

  // References
  const pRefs = safeJson(f.personalReferences);
  const eRefs = safeJson(f.employmentReferences);
  const pRefRows = pRefs.map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.designation||r.position)}</td><td>${esc(r.organization||r.company)}</td><td>${esc(r.contact||r.phone)}</td></tr>`).join('') || `<tr><td colspan="4" class="not-filled">—</td></tr>`;
  const eRefRows = eRefs.map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.designation||r.position)}</td><td>${esc(r.organization||r.company)}</td><td>${esc(r.contact||r.phone)}</td></tr>`).join('') || `<tr><td colspan="4" class="not-filled">—</td></tr>`;

  function yn(v) { return v === true ? 'Yes' : v === false ? 'No' : '—'; }
  function sal(v) { return v ? `₹${parseFloat(v).toFixed(2)}` : '—'; }

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Personal Detail Form – ${esc(candidate.fullName)}</title>
<style>${baseStyle}</style>
</head>
<body>
${headerHtml('Personal Detail Form', `Submitted: ${fmtDate(f.submittedAt)}`)}
<div class="section">
  <h2>${esc(candidate.fullName)}</h2>
  <div style="font-size:13px;color:#555;margin-bottom:16px;">
    ${esc(candidate.positionApplying)} &nbsp;·&nbsp; ${esc(candidate.email)} &nbsp;·&nbsp; ${esc(candidate.contactNumber)}
  </div>

  <h3>Personal Details</h3>
  <table>
    <tr><td class="label">Gender</td><td>${esc(f.gender)}</td><td class="label">Date of Birth</td><td>${esc(f.dob)}</td></tr>
    <tr><td class="label">Age</td><td>${esc(f.age)}</td><td class="label">Marital Status</td><td>${esc(f.maritalStatus)}</td></tr>
    <tr><td class="label">Domicile</td><td>${esc(f.domicile)}</td><td class="label">ID Number</td><td>${esc(f.idNumber)}</td></tr>
    <tr><td class="label">Father's Name</td><td>${esc(f.fatherName)}</td><td class="label">Father's Contact</td><td>${esc(f.fatherContact)}</td></tr>
    <tr><td class="label">Spouse Name</td><td>${esc(f.spouseName)}</td><td class="label">Spouse Contact</td><td>${esc(f.spouseContact)}</td></tr>
    <tr><td class="label">Department</td><td>${esc(f.department)}</td><td class="label">Total Experience</td><td>${esc(f.totalExperience)}</td></tr>
    <tr><td class="label">Present Address</td><td colspan="3">${esc(f.presentAddress)}</td></tr>
    <tr><td class="label">Permanent Address</td><td colspan="3">${esc(f.permanentAddress)}</td></tr>
  </table>

  <h3>Educational Qualifications</h3>
  <table>
    <thead><tr><th>Examination / Degree</th><th>Board / University</th><th>Year</th><th>%/Marks</th><th>Subjects / Specialization</th></tr></thead>
    <tbody>${qualRows}</tbody>
  </table>
  ${f.itSkills ? `<p style="font-size:13px;"><strong>IT Skills:</strong> ${esc(f.itSkills)}</p>` : ''}
  ${f.professionalTraining ? `<p style="font-size:13px;"><strong>Professional Training:</strong> ${esc(f.professionalTraining)}</p>` : ''}

  <h3>Employment History</h3>
  <table>
    <thead><tr><th>Employer</th><th>Designation</th><th>From</th><th>To</th><th>CTC</th><th>Reason for Leaving</th></tr></thead>
    <tbody>${expRows}</tbody>
  </table>
  ${f.employmentGap ? `<p style="font-size:13px;"><strong>Employment Gap:</strong> ${esc(f.employmentGap)}</p>` : ''}
  <p style="font-size:13px;"><strong>Can Contact Previous Employer:</strong> ${yn(f.canContactEmployer)}</p>

  <h3>Remuneration (Current)</h3>
  <table>
    <thead><tr><th>Component</th><th>Amount (p.a.)</th><th>Component</th><th>Amount (p.a.)</th></tr></thead>
    <tbody>
      <tr><td>Basic Salary</td><td>${sal(f.salBasic)}</td><td>Dearness Allowance (DA)</td><td>${sal(f.salDA)}</td></tr>
      <tr><td>HRA</td><td>${sal(f.salHRA)}</td><td>Conveyance</td><td>${sal(f.salConveyance)}</td></tr>
      <tr><td>Medical Allowance</td><td>${sal(f.salMedical)}</td><td>Other Allowances</td><td>${sal(f.salOthers)}</td></tr>
      <tr><td>Incentives</td><td>${sal(f.salIncentives)}</td><td>&nbsp;</td><td>&nbsp;</td></tr>
      <tr><th colspan="2">Statutory Components</th><th colspan="2">&nbsp;</th></tr>
      <tr><td>Provident Fund (PF)</td><td>${sal(f.statPF)}</td><td>ESI</td><td>${sal(f.statESI)}</td></tr>
      <tr><td>Gratuity</td><td>${sal(f.statGratuity)}</td><td>Medi-Claim</td><td>${sal(f.statMediClaim)}</td></tr>
      <tr><td>Superannuation</td><td>${sal(f.statSuperannuation)}</td><td>Bonus</td><td>${sal(f.statBonus)}</td></tr>
      <tr><td>LTA</td><td>${sal(f.statLTA)}</td><td>&nbsp;</td><td>&nbsp;</td></tr>
      <tr style="background:#fff3cd;">
        <td><strong>Total CTC (per annum)</strong></td>
        <td><strong>${sal(f.ctcPerAnnum)}</strong></td>
        <td>Last Salary Revision</td><td>${esc(f.lastSalaryRevision)}</td>
      </tr>
    </tbody>
  </table>

  <h3>Personal References</h3>
  <table>
    <thead><tr><th>Name</th><th>Designation</th><th>Organization</th><th>Contact</th></tr></thead>
    <tbody>${pRefRows}</tbody>
  </table>

  <h3>Employment References</h3>
  <table>
    <thead><tr><th>Name</th><th>Designation</th><th>Organization</th><th>Contact</th></tr></thead>
    <tbody>${eRefRows}</tbody>
  </table>

  <h3>Medical History</h3>
  <table>
    <tr><td class="label">Chronic Illness</td><td>${yn(f.medChronic)}${f.medChronicDetails ? ': ' + esc(f.medChronicDetails) : ''}</td><td class="label">Surgeries</td><td>${yn(f.medSurgeries)}${f.medSurgeriesDetails ? ': ' + esc(f.medSurgeriesDetails) : ''}</td></tr>
    <tr><td class="label">Disabilities</td><td>${yn(f.medDisabilities)}${f.medDisabilitiesDetails ? ': ' + esc(f.medDisabilitiesDetails) : ''}</td><td class="label">Allergies</td><td>${yn(f.medAllergies)}${f.medAllergiesDetails ? ': ' + esc(f.medAllergiesDetails) : ''}</td></tr>
    <tr><td class="label">Communicable Disease</td><td>${yn(f.medCommunicable)}${f.medCommunicableDetails ? ': ' + esc(f.medCommunicableDetails) : ''}</td><td class="label">Health Insurance</td><td>${yn(f.medHealthInsurance)}</td></tr>
    <tr><td class="label">On Medications</td><td colspan="3">${yn(f.medMedications)}${f.medMedicationsDetails ? ': ' + esc(f.medMedicationsDetails) : ''}</td></tr>
  </table>

  <h3>General Declarations</h3>
  <table>
    <tr><td class="label">Legal Suit Pending</td><td>${yn(f.legalSuit)}${f.legalSuitDetails ? ': ' + esc(f.legalSuitDetails) : ''}</td></tr>
    <tr><td class="label">Applied to Patrika Before</td><td>${yn(f.appliedBefore)}${f.appliedBefore ? ` — ${esc(f.appliedBeforeMonth)}, ${esc(f.appliedBeforeDept)}, ${esc(f.appliedBeforeLocation)}, ${esc(f.appliedBeforePosition)}` : ''}</td></tr>
    <tr><td class="label">How did you know about Patrika</td><td>${esc(safeJson(f.patrikaKnown).join(', '))}</td></tr>
  </table>
</div>
<div class="footer">Patrika HR System &nbsp;·&nbsp; Confidential &nbsp;·&nbsp; Generated ${fmtDate(new Date())}</div>
</body></html>`;
}

// ─── Helper: Activity Timeline HTML ──────────────────────────────────────────

function generateTimelineHtml(candidate, communications, activityLogs) {
  const events = [];

  // Application received
  events.push({
    timestamp: candidate.submittedAt ? new Date(candidate.submittedAt) : new Date(0),
    title: 'Application Received',
    body: `Applied for <strong>${esc(candidate.positionApplying || '—')}</strong>`,
    icon: '📋',
    color: '#f0c030',
    performedBy: 'System'
  });

  // Activity logs
  const iconMap = {
    status_changed:        { icon: '🔄', color: '#0d6efd' },
    note_saved:            { icon: '📝', color: '#ffc107' },
    email_sent:            { icon: '📧', color: '#198754' },
    whatsapp_sent:         { icon: '💬', color: '#20c997' },
    interview_updated:     { icon: '🎥', color: '#6f42c1' },
    detail_form_submitted: { icon: '📄', color: '#0dcaf0' }
  };

  for (const log of activityLogs) {
    const { icon, color } = iconMap[log.activityType] || { icon: '•', color: '#6c757d' };
    let body = '';
    if (log.activityType === 'status_changed') {
      body = `Status changed from <strong>${esc(log.oldValue || '—')}</strong> to <strong>${esc(log.newValue || '—')}</strong>`;
    } else {
      body = esc(log.details || '');
    }
    events.push({
      timestamp: log.createdAt ? new Date(log.createdAt) : new Date(0),
      title: log.title || log.activityType,
      body,
      icon,
      color,
      performedBy: log.performedBy || 'Admin'
    });
  }

  // Communications (deduplicate against activity logs)
  const loggedBuckets = new Set(
    activityLogs
      .filter(l => l.activityType === 'email_sent' || l.activityType === 'whatsapp_sent')
      .map(l => Math.floor(new Date(l.createdAt).getTime() / 60000))
  );

  for (const comm of communications) {
    const bucket = Math.floor(new Date(comm.sentAt).getTime() / 60000);
    if (loggedBuckets.has(bucket)) continue;
    const isEmail = comm.channel === 'Email';
    events.push({
      timestamp: comm.sentAt ? new Date(comm.sentAt) : new Date(0),
      title: comm.subject || (isEmail ? 'Email Sent' : 'WhatsApp Sent'),
      body: esc(comm.message ? comm.message.substring(0, 300) : '—'),
      icon: isEmail ? '📧' : '💬',
      color: isEmail ? '#198754' : '#20c997',
      performedBy: comm.sentBy || 'Admin'
    });
  }

  events.sort((a, b) => b.timestamp - a.timestamp);

  const rows = events.map(ev => `
    <tr>
      <td style="white-space:nowrap;color:#555;font-size:12px;">${fmtDate(ev.timestamp)}</td>
      <td style="text-align:center;font-size:18px;">${ev.icon}</td>
      <td>
        <div style="font-weight:600;font-size:13px;">${esc(ev.title)}</div>
        <div style="font-size:12px;color:#555;margin-top:2px;">${ev.body}</div>
      </td>
      <td style="font-size:12px;color:#888;white-space:nowrap;">${esc(ev.performedBy)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Activity History – ${esc(candidate.fullName)}</title>
<style>${baseStyle}
table{border-collapse:collapse;}
tr:hover td{background:#fffbf0;}
</style>
</head>
<body>
${headerHtml('Activity History', `Generated on ${fmtDate(new Date())}`)}
<div class="section">
  <h2>${esc(candidate.fullName)}</h2>
  <div style="font-size:13px;color:#555;margin-bottom:16px;">
    ${esc(candidate.positionApplying)} &nbsp;·&nbsp; ${esc(candidate.email)}
    &nbsp;·&nbsp; <span class="badge-gold">${esc(candidate.status)}</span>
  </div>
  <p style="font-size:12px;color:#888;">${events.length} event(s) total</p>
  <table>
    <thead><tr><th>Timestamp</th><th style="width:40px;">  </th><th>Event</th><th>By</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="4" class="not-filled">No activity recorded</td></tr>'}</tbody>
  </table>
</div>
<div class="footer">Patrika HR System &nbsp;·&nbsp; Confidential &nbsp;·&nbsp; Generated ${fmtDate(new Date())}</div>
</body></html>`;
}

// ─── Single Candidate Download ────────────────────────────────────────────────

async function downloadSingle(req, res) {
  try {
    const { id } = req.params;
    const docsParam = req.query.docs || 'resume,interview,detail_form,timeline';
    const docs = docsParam.split(',').map(d => d.trim()).filter(Boolean);

    const candidate = await Candidate.findByPk(id);
    if (!candidate) return res.status(404).send('Candidate not found');

    const zip = new JSZip();
    const folderName = `${candidate.fullName.replace(/\s+/g, '_')}_${candidate.id}`;
    const folder = zip.folder(folderName);

    // Resume
    if (docs.includes('resume')) {
      if (candidate.resumePath && fs.existsSync(candidate.resumePath)) {
        const fileBuffer = fs.readFileSync(candidate.resumePath);
        const ext = path.extname(candidate.resumeOriginalName || candidate.resumePath);
        const safeOriginal = (candidate.resumeOriginalName || `resume${ext}`).replace(/[^a-zA-Z0-9._-]/g, '_');
        folder.file(safeOriginal, fileBuffer);
      } else {
        folder.file('Resume_not_uploaded.txt', 'Resume has not been uploaded for this candidate.');
      }
    }

    // Interview Sheet
    if (docs.includes('interview')) {
      const sheet = await InterviewSheet.findOne({ where: { candidateId: id } });
      const html = generateInterviewHtml(candidate, sheet);
      folder.file('interview-sheet.html', html);
    }

    // Personal Detail Form
    if (docs.includes('detail_form')) {
      const form = await CandidateDetailForm.findOne({ where: { candidateId: id } });
      const html = generateDetailFormHtml(candidate, form);
      folder.file('personal-detail-form.html', html);
    }

    // Activity History / Timeline
    if (docs.includes('timeline')) {
      const [communications, activityLogs] = await Promise.all([
        Communication.findAll({
          where: { candidateId: id },
          order: [['sentAt', 'DESC']]
        }),
        ActivityLog.findAll({
          where: { candidateId: id },
          order: [['createdAt', 'DESC']]
        })
      ]);
      const html = generateTimelineHtml(candidate, communications, activityLogs);
      folder.file('activity-history.html', html);
    }

    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    const safeName = `${candidate.fullName.replace(/[^a-zA-Z0-9]/g, '_')}_${candidate.id}_documents.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.send(buffer);

  } catch (err) {
    console.error('[downloadSingle] Error:', err);
    res.status(500).send('Failed to generate document bundle: ' + err.message);
  }
}

// ─── Bulk Download ────────────────────────────────────────────────────────────

async function downloadBulk(req, res) {
  try {
    let { candidateIds, docs } = req.body;

    // normalise to arrays
    if (!Array.isArray(candidateIds)) candidateIds = candidateIds ? [candidateIds] : [];
    if (!Array.isArray(docs))         docs         = docs         ? [docs]         : [];

    candidateIds = candidateIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    docs = docs.map(d => d.trim()).filter(Boolean);

    if (!candidateIds.length) return res.status(400).send('No candidates selected.');
    if (!docs.length)         return res.status(400).send('No document types selected.');

    const zip = new JSZip();
    const dateStr = new Date().toISOString().split('T')[0];

    // Process sequentially to avoid DB overload
    let idx = 0;
    for (const candidateId of candidateIds) {
      idx++;
      const candidate = await Candidate.findByPk(candidateId);
      if (!candidate) continue;

      const folderLabel = `${String(idx).padStart(2, '0')}_${candidate.fullName.replace(/\s+/g, '_')}`;
      const folder = zip.folder(folderLabel);

      // Resume
      if (docs.includes('resume')) {
        if (candidate.resumePath && fs.existsSync(candidate.resumePath)) {
          const fileBuffer = fs.readFileSync(candidate.resumePath);
          const ext = path.extname(candidate.resumeOriginalName || candidate.resumePath);
          const safeOriginal = (candidate.resumeOriginalName || `resume${ext}`).replace(/[^a-zA-Z0-9._-]/g, '_');
          folder.file(safeOriginal, fileBuffer);
        } else {
          folder.file('Resume_not_uploaded.txt', 'Resume has not been uploaded for this candidate.');
        }
      }

      // Interview Sheet
      if (docs.includes('interview')) {
        const sheet = await InterviewSheet.findOne({ where: { candidateId } });
        const html = generateInterviewHtml(candidate, sheet);
        folder.file('interview-sheet.html', html);
      }

      // Personal Detail Form
      if (docs.includes('detail_form')) {
        const form = await CandidateDetailForm.findOne({ where: { candidateId } });
        const html = generateDetailFormHtml(candidate, form);
        folder.file('personal-detail-form.html', html);
      }

      // Activity History
      if (docs.includes('timeline')) {
        const [communications, activityLogs] = await Promise.all([
          Communication.findAll({
            where: { candidateId },
            order: [['sentAt', 'DESC']]
          }),
          ActivityLog.findAll({
            where: { candidateId },
            order: [['createdAt', 'DESC']]
          })
        ]);
        const html = generateTimelineHtml(candidate, communications, activityLogs);
        folder.file('activity-history.html', html);
      }
    }

    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    const zipName = `Patrika_HR_Documents_${dateStr}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
    res.send(buffer);

  } catch (err) {
    console.error('[downloadBulk] Error:', err);
    res.status(500).send('Failed to generate bulk document bundle: ' + err.message);
  }
}

module.exports = { downloadSingle, downloadBulk };
