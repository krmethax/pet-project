const express = require('express');
const router = express.Router();
const sitterController = require('../controllers/sitterController');

// Route สำหรับสมัครสมาชิก
router.post("/register-sitter", sitterController.registerSitter);

router.post('/update-profile-sitter', sitterController.updateProfileSitter);

router.post('/verify-otp-sitter', sitterController.verifyOtp);

router.post('/verify-account', sitterController.verifyAccount);

router.post('/login-sitter', sitterController.loginSitter);

router.get('/sitter/:sitter_id', sitterController.getSitter);

router.get('/jobs/:sitter_id', sitterController.getJobs);

router.get('/service-types', sitterController.getServiceTypes);

router.post('/sitter/service', sitterController.createSitterService);

router.get('/:sitter_id/created-jobs', sitterController.getCreatedJobs);

router.get('/pet-types', sitterController.getPetTypesForSitter);

router.get('/sitter/:sitter_id', sitterController.getSitter);

router.post('/add-job', sitterController.addJob);

router.get('/latest-completed-jobs', sitterController.getLatestCompletedJobs);

router.put('/sitter-service', sitterController.updateSitterService);

router.delete('/sitter-service/:sitter_service_id', sitterController.deleteSitterService);

module.exports = router;
