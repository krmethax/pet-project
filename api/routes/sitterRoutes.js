const express = require('express');
const multer = require('multer');
const router = express.Router();
const sitterController = require('../controllers/sitterController');
const uploadController = require('../controllers/uploadController');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Sitter registration and authentication routes
router.post("/register-sitter", sitterController.registerSitter);
router.post("/verify-otp-sitter", sitterController.verifyOtp);
router.post("/verify-account", sitterController.verifyAccount);
router.post("/login-sitter", sitterController.loginSitter);
router.get("/sitter/:sitter_id", sitterController.getSitter);

// Jobs routes
router.get("/jobs/:sitter_id", sitterController.getJobs);
router.get("/sitter/jobs/:sitter_id", sitterController.getSitterJobs);
router.post("/jobs/accept", sitterController.acceptJob);
// เพิ่ม route สำหรับยกเลิกงาน
router.post("/jobs/cancel", sitterController.cancelJob);

// Service and Pet Types routes
router.get("/service-types", sitterController.getServiceTypes);
router.get("/pet-types", sitterController.getPetTypesForSitter);

// Sitter Services (CRUD)
// Create a new service
router.post('/add-job', sitterController.addJob);
// Update an existing service
router.put("/sitter-service/:sitter_service_id", sitterController.updateSitterService);
// Delete a service
router.delete("/sitter-service/:sitter_service_id", sitterController.deleteSitterService);
// Get all services for a sitter
router.get("/sitter-services/:sitter_id", sitterController.getSitterServices);

// Payment Methods routes
router.post("/payment-methods", sitterController.addPaymentMethod);
router.put("/payment-methods", sitterController.updatePaymentMethod);
router.delete("/payment-methods/:payment_method_id", sitterController.deletePaymentMethod);
router.get("/payment-methods/:sitter_id", sitterController.getPaymentMethods);

// Income stats routes
router.get("/sitter/income-stats/:sitter_id", sitterController.getPieIncomeStats);

// Upload routes
// Update profile image (using upload middleware)
router.post('/update-profile-sitter', upload.single('image'), sitterController.updateProfileSitter);
// Upload additional job image (handled by uploadController)
router.post('/sitter/upload-job-image', upload.single('image'), uploadController.uploadJobImage);

module.exports = router;
