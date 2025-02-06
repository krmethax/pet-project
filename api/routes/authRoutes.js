const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Route สำหรับสมัครสมาชิก
router.post('/register', authController.register);

// Route สำหรับยืนยัน OTP
router.post('/verify-otp', authController.verifyOtp);

// Route สำหรับอัปเดตโปรไฟล์สมาชิก
router.post('/update-profile', authController.updateProfile);

// Route สำหรับขอรหัส OTP ใหม่
router.post('/resend-otp', authController.resendOtp);

// Route สำหรับเข้าสู่ระบบ
router.post('/login', authController.login);

// Route สำหรับดึงข้อมูลสมาชิก (ตรวจสอบว่าเราใช้ getMember ตามใน Controller)
router.get('/member/:member_id', authController.getMember);

router.get('/service-type', authController.getServiceTypes);

router.get('/pet-categories',authController.getPetCategories);

router.get('/sitter-services', authController.getSitterServicesForMember);

module.exports = router;
