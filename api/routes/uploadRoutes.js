const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');

// Endpoint สำหรับอัปโหลดรูปโปรไฟล์พี่เลี้ยง
router.post('/sitter/upload-profile-image', uploadController.uploadMiddleware, uploadController.uploadProfileImage);

// Endpoint สำหรับอัปโหลดรูปใบหน้า
router.post('/sitter/upload-face-image', uploadController.uploadMiddleware, uploadController.uploadFaceImage);

// Endpoint สำหรับอัปโหลดรูปบัตรประชาชน
router.post('/sitter/upload-idcard-image', uploadController.uploadMiddleware, uploadController.uploadIdCardImage);

// Endpoint สำหรับอัปโหลดรูปงาน
router.post('/sitter/upload-job-image', uploadController.uploadMiddleware, uploadController.uploadJobImage);

// Endpoint สำหรับอัปโหลดรูปโปรไฟล์สมาชิก (Member Profile)
router.post('/member/upload-profile-image', uploadController.uploadMiddleware, uploadController.uploadMemberProfile);

// Endpoint สำหรับอัปโหลดสลิปโอนเงิน (Payment Slip)
router.post('/bookings/upload-payment-slip', uploadController.uploadMiddleware, uploadController.uploadPaymentSlip);

module.exports = router;
