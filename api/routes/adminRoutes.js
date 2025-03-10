const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// ดึงข้อมูลสมัครพี่เลี้ยง
router.get('/get-all-sitters', adminController.getSitterRegistrations);

// เปลี่ยนสถานะพี่เลี้ยง (Approve/Reject)
router.post('/update-sitter-status', adminController.updateSitterStatus);

// จัดการประเภทบริการ
router.get('/service-types', adminController.getServiceTypes);
router.post('/service-types', adminController.createServiceType);
router.put('/service-types', adminController.updateServiceType);
router.delete('/service-types/:service_type_id', adminController.deleteServiceType);

// จัดการประเภทสัตว์เลี้ยง
router.get('/pet-types', adminController.getPetTypes);
router.post('/pet-types', adminController.createPetType);
router.put('/pet-types', adminController.updatePetType);
router.delete('/pet-types/:pet_type_id', adminController.deletePetType);

// -----------------------------
// เพิ่ม Route สำหรับ Booking Slips
// -----------------------------

// ดึงข้อมูลสลิปการจอง (สามารถกรองตามสถานะได้ด้วย query parameter "status")
router.get('/booking-slips', adminController.getBookingSlips);

// อัปเดตสถานะสลิปการจอง (เช่น เปลี่ยนเป็น approved หรือ rejected)
// รับค่า booking_id และ status ผ่าน request body
router.put('/booking-slips', adminController.updateBookingSlipStatus);

// ลบสลิปการจอง (โดยอัปเดต slip_image เป็น NULL)
// รับค่า booking_id ผ่าน URL parameter
router.delete('/booking-slips/:booking_id', adminController.deleteBookingSlip);
router.get('/get-image/:filename', adminController.getImage);

module.exports = router;
