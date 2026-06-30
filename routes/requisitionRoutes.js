const express = require('express');
const router = express.Router();
const requisitionController = require('../controllers/requisitionController');

router.get('/requisition',             requisitionController.showForm);
router.post('/requisition',            requisitionController.submitForm);
router.get('/requisition/fill/:token', requisitionController.showTokenForm);
router.post('/requisition/fill/:token',requisitionController.submitTokenForm);

module.exports = router;
