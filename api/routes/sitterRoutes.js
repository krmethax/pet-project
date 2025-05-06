const express = require('express');
const multer  = require('multer');
const router  = express.Router();

const sitterController = require('../controllers/sitterController');
const uploadController = require('../controllers/uploadController');

const storage = multer.memoryStorage();
const upload  = multer({ storage: storage });

// Sitter registration and authentication
router.post("/register-sitter",    sitterController.registerSitter);
router.post("/verify-otp-sitter",  sitterController.verifyOtp);
router.post("/verify-account",     sitterController.verifyAccount);
router.post("/login-sitter",       sitterController.loginSitter);
router.get ("/sitter/:sitter_id",  sitterController.getSitter);

// Jobs routes
router.get ("/jobs/:sitter_id",         sitterController.getJobs);
router.get ("/sitter/jobs/:sitter_id",  sitterController.getSitterJobs);
router.post("/jobs/accept",             sitterController.acceptJob);
router.post("/jobs/cancel",             sitterController.cancelJob);

// **New**: Sitter submits deliverables with images
// POST /api/sitter/bookings/submit
// fields: booking_id, sitter_id, images[] (multipart/form-data)
router.post(
  '/sitter/bookings/submit',
  upload.array('images', 5),
  sitterController.submitJob
);

// Service and Pet Types
router.get("/service-types",       sitterController.getServiceTypes);
router.get("/pet-types",           sitterController.getPetTypesForSitter);

// Sitter Services (CRUD)
router.post  ('/add-job',                      sitterController.addJob);
router.put   ("/sitter-service/:sitter_service_id", sitterController.updateSitterService);
router.delete("/sitter-service/:sitter_service_id", sitterController.deleteSitterService);
router.get   ("/sitter-services/:sitter_id",   sitterController.getSitterServices);

// Payment Methods
router.post  ("/payment-methods",             sitterController.addPaymentMethod);
router.put   ("/payment-methods",             sitterController.updatePaymentMethod);
router.delete("/payment-methods/:payment_method_id", sitterController.deletePaymentMethod);
router.get   ("/payment-methods/:sitter_id",  sitterController.getPaymentMethods);

// Income stats
router.get("/sitter/income-stats/:sitter_id", sitterController.getPieIncomeStats);

// Upload profile & job-image (existing)
router.post('/update-profile-sitter',
  upload.single('image'),
  sitterController.updateProfileSitter
);
router.post('/sitter/upload-job-image',
  upload.single('image'),
  uploadController.uploadJobImage
);

module.exports = router;
