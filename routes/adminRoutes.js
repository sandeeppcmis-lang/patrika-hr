const express = require('express');
const router = express.Router();
const multer = require('multer');
const adminController = require('../controllers/adminController');
const { requireAdmin, redirectIfLoggedIn } = require('../middleware/auth');

const path = require('path');

const fileFilter = (req, file, cb) => {
  const allowed = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  cb(null, allowed.includes(file.mimetype));
};

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter
});

const diskUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
    filename: (req, file, cb) => {
      const date = new Date().toISOString().split('T')[0];
      const safe = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
      cb(null, `${date}_${Date.now()}_${safe}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter
});

// Auth
router.get('/login', redirectIfLoggedIn, adminController.showLogin);
router.post('/login', redirectIfLoggedIn, adminController.processLogin);
router.get('/logout', adminController.logout);

// Dashboard
router.get('/dashboard', requireAdmin, adminController.dashboard);
router.get('/', requireAdmin, (req, res) => res.redirect('/admin/dashboard'));

// Candidate CRUD
router.get('/candidate/:id', requireAdmin, adminController.candidateDetail);
router.post('/candidate/:id/update', requireAdmin, adminController.updateCandidate);
router.post('/candidate/:id/communicate', requireAdmin, adminController.sendCommunication);
router.get('/candidate/:id/download', requireAdmin, adminController.downloadResume);
router.get('/candidate/:id/preview',  requireAdmin, adminController.previewResume);
router.delete('/candidate/:id', requireAdmin, adminController.deleteCandidate);

// Offline Resume Parser
router.get('/resume-parser',        requireAdmin, adminController.showResumeParser);
router.post('/resume-parser/parse', requireAdmin, memoryUpload.single('resume'), adminController.parseOfflineResume);
router.post('/resume-parser/save',  requireAdmin, diskUpload.single('resume'), adminController.saveOfflineCandidate);

// Stats API
router.get('/api/stats', requireAdmin, adminController.getStats);

// Excel Export
router.get('/candidates/export', requireAdmin, adminController.exportCandidates);

// Grading
router.post('/candidates/grade-all', requireAdmin, adminController.gradeAll);
router.post('/candidate/:id/grade',  requireAdmin, adminController.gradeOne);

// Positions Management
router.get('/positions',              requireAdmin, adminController.listPositions);
router.post('/positions',             requireAdmin, adminController.createPosition);
router.put('/positions/:id',          requireAdmin, adminController.updatePosition);
router.post('/positions/:id/toggle',  requireAdmin, adminController.togglePosition);
router.delete('/positions/:id',       requireAdmin, adminController.deletePosition);

module.exports = router;
