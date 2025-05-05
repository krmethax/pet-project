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

// **เพิ่ม endpoints สำหรับการดูและยกเลิกการจองของสมาชิก**
// ดึงข้อมูลการจองของสมาชิก
router.get('/member/:member_id/bookings', authController.getBookingsForMember);

// ยกเลิกการจอง (สมาชิกสามารถยกเลิกได้เฉพาะเมื่อสถานะการชำระเงินไม่ใช่ 'paid')
router.post('/member/cancel-booking', authController.cancelBooking);

// Route สำหรับดึงข้อมูลประเภทบริการ
router.get('/service-type', authController.getServiceTypes);

// Route สำหรับดึงข้อมูลประเภทสัตว์เลี้ยง
router.get('/pet-categories', authController.getPetCategories);

// Route สำหรับดึงงานของพี่เลี้ยง (Sitter Services)
router.get('/sitter-services', authController.getSitterServicesForMember);

// Route สำหรับดึงข้อมูลพี่เลี้ยง
router.get("/sitter/:sitter_id", authController.getSitterProfile);

// Route สำหรับดึงข้อมูลวิธีการชำระเงินของพี่เลี้ยง
router.get('/payment-methods/:sitter_id', authController.getPaymentMethodsForMember);

// Route สำหรับสร้างการจอง
router.post('/create', authController.createBooking);

// Route สำหรับส่งสลิปการจอง
router.post('/submit-slip', authController.submitBookingSlip);

// Route สำหรับดึงข้อมูลพี่เลี้ยงทั้งหมด
router.get('/sitters', authController.getAllSitters);

// **เพิ่ม endpoints สำหรับ Favorite Sitters**
// เพิ่มถูกใจพี่เลี้ยง
router.post('/favorite', authController.addFavoriteSitter);
// ลบถูกใจพี่เลี้ยง (ใช้ member_id และ sitter_id ใน URL)
router.delete('/favorite/:member_id/:sitter_id',authController.removeFavoriteSitter);
// ดึงข้อมูลถูกใจพี่เลี้ยงของสมาชิก
router.get('/favorite/:member_id', authController.getFavoriteSitters);

// เขียนรีวิว
router.post('/review', authController.createReview);
// ลบรีวิว
router.delete('/review/:review_id/:member_id', authController.deleteReview);

router.get('/reviews/sitter/:sitter_id', authController.getReviewsForSitter);

module.exports = router;
