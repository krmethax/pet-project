const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');


router.get('/get-all-sitters', adminController.getSitterRegistrations);

router.post('/update-sitter-status', adminController.updateSitterStatus);

router.get('/service-types', adminController.getServiceTypes);

// เพิ่มประเภทบริการใหม่
router.post('/service-types', adminController.createServiceType);

// แก้ไขประเภทบริการ
router.put('/service-types', adminController.updateServiceType);

// ลบประเภทบริการ (ส่ง service_type_id ผ่าน URL parameter)
router.delete('/service-types/:service_type_id', adminController.deleteServiceType);

router.get('/pet-types', adminController.getPetTypes);
router.post('/pet-types', adminController.createPetType);
router.put('/pet-types', adminController.updatePetType);
router.delete('/pet-types/:pet_type_id', adminController.deletePetType);

module.exports = router;
