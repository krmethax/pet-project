const db = require('../db'); // โมดูลสำหรับเชื่อมต่อ MySQL
const multer = require('multer');
const fetch = require('node-fetch'); // ใช้สำหรับส่ง request ไปยัง ImgBB

// ใช้ memoryStorage เพื่อเก็บไฟล์ชั่วคราวใน memory
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * Helper function: แปลง Buffer เป็น Base64 string
 */
function bufferToBase64(buffer) {
  return buffer.toString('base64');
}

/**
 * Helper function: อัปโหลด Base64 image ไปยัง ImgBB API แล้วส่งกลับ URL ของรูป
 */
async function uploadToImgBB(base64Image) {
  const apiKey = 'af23e8c14cbf97c99b6e3bbbe3d6aefa';
  const expiration = 0; // 0 หมายถึงไม่หมดอายุ
  const imgbbUrl = `https://api.imgbb.com/1/upload?key=${apiKey}&expiration=${expiration}`;

  const params = new URLSearchParams();
  params.append('image', base64Image);

  const imgbbResponse = await fetch(imgbbUrl, {
    method: 'POST',
    body: params,
  });
  const imgbbData = await imgbbResponse.json();
  if (!imgbbResponse.ok || !imgbbData.success) {
    throw new Error("ImgBB upload failed: " + JSON.stringify(imgbbData));
  }
  return imgbbData.data.url;
}

/**
 * Endpoint: อัปโหลดรูปโปรไฟล์พี่เลี้ยง (สำหรับตาราง Pet_Sitters)
 */
exports.uploadProfileImage = async (req, res) => {
  try {
    const { sitter_id } = req.body;
    if (!sitter_id) {
      return res.status(400).json({ message: "กรุณาระบุ sitter_id" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "ไม่มีไฟล์รูปภาพ" });
    }
    const base64Image = bufferToBase64(req.file.buffer);
    const imageUrl = await uploadToImgBB(base64Image);

    const updateQuery = `
      UPDATE Pet_Sitters
      SET profile_image = ?, updated_at = CURRENT_TIMESTAMP
      WHERE sitter_id = ?
    `;
    const updateResult = await db.query(updateQuery, [imageUrl, sitter_id]);
    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ message: "ไม่พบพี่เลี้ยงที่ต้องการอัปเดตรูปโปรไฟล์" });
    }
    return res.status(200).json({ message: "อัปโหลดรูปโปรไฟล์สำเร็จ", url: imageUrl });
  } catch (error) {
    console.error("uploadProfileImage error:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์", error: error.message });
  }
};

/**
 * Endpoint: อัปโหลดรูปใบหน้า (สำหรับตาราง Pet_Sitters)
 */
exports.uploadFaceImage = async (req, res) => {
  try {
    const { sitter_id } = req.body;
    if (!sitter_id) {
      return res.status(400).json({ message: "กรุณาระบุ sitter_id" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "ไม่มีไฟล์รูปภาพ" });
    }
    const base64Image = bufferToBase64(req.file.buffer);
    const imageUrl = await uploadToImgBB(base64Image);

    const updateQuery = `
      UPDATE Pet_Sitters
      SET face_image = ?, updated_at = CURRENT_TIMESTAMP
      WHERE sitter_id = ?
    `;
    const updateResult = await db.query(updateQuery, [imageUrl, sitter_id]);
    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ message: "ไม่พบพี่เลี้ยงที่ต้องการอัปเดตรูปใบหน้า" });
    }
    return res.status(200).json({ message: "อัปโหลดรูปใบหน้าสำเร็จ", url: imageUrl });
  } catch (error) {
    console.error("uploadFaceImage error:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์", error: error.message });
  }
};

/**
 * Endpoint: อัปโหลดรูปบัตรประชาชน (สำหรับตาราง Pet_Sitters)
 */
exports.uploadIdCardImage = async (req, res) => {
  try {
    const { sitter_id } = req.body;
    if (!sitter_id) {
      return res.status(400).json({ message: "กรุณาระบุ sitter_id" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "ไม่มีไฟล์รูปภาพ" });
    }
    const base64Image = bufferToBase64(req.file.buffer);
    const imageUrl = await uploadToImgBB(base64Image);

    const updateQuery = `
      UPDATE Pet_Sitters
      SET id_card_image = ?, updated_at = CURRENT_TIMESTAMP
      WHERE sitter_id = ?
    `;
    const updateResult = await db.query(updateQuery, [imageUrl, sitter_id]);
    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ message: "ไม่พบพี่เลี้ยงที่ต้องการอัปเดตรูปบัตรประชาชน" });
    }
    return res.status(200).json({ message: "อัปโหลดรูปบัตรประชาชนสำเร็จ", url: imageUrl });
  } catch (error) {
    console.error("uploadIdCardImage error:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์", error: error.message });
  }
};

/**
 * Endpoint: อัปโหลดรูปงาน (สำหรับตาราง Sitter_Services)
 */
exports.uploadJobImage = async (req, res) => {
  try {
    const { sitter_service_id } = req.body;
    if (!sitter_service_id) {
      return res.status(400).json({ message: "กรุณาระบุ sitter_service_id" });
    }
    if (!req.file) {
      console.error("ไม่มีไฟล์รูปภาพที่อัปโหลดมาจาก client");
      return res.status(400).json({ message: "ไม่มีไฟล์รูปภาพ" });
    }

    const base64Image = bufferToBase64(req.file.buffer);
    console.log("Base64 image (first 100 chars):", base64Image.substring(0, 100));

    const imageUrl = await uploadToImgBB(base64Image);
    console.log("อัปโหลดไปยัง ImgBB เรียบร้อย, Image URL:", imageUrl);

    const updateQuery = `
      UPDATE Sitter_Services 
      SET service_image = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE sitter_service_id = ?
    `;
    const updateResult = await db.query(updateQuery, [imageUrl, sitter_service_id]);
    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ message: "ไม่พบงานที่ต้องการอัปเดตรูป" });
    }
    return res.status(200).json({ message: "อัปโหลดรูปงานสำเร็จ", url: imageUrl });
  } catch (error) {
    console.error("uploadJobImage error:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์", error: error.message });
  }
};

/**
 * Endpoint: อัปโหลดรูปโปรไฟล์สมาชิก (Upload Member Profile)
 * สำหรับตาราง Members
 */
exports.uploadMemberProfile = async (req, res) => {
  try {
    const { member_id } = req.body;
    if (!member_id) {
      return res.status(400).json({ message: "กรุณาระบุ member_id" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "ไม่มีไฟล์รูปภาพ" });
    }
    const base64Image = bufferToBase64(req.file.buffer);
    const imageUrl = await uploadToImgBB(base64Image);

    const updateQuery = `
      UPDATE Members
      SET profile_image = ?, updated_at = CURRENT_TIMESTAMP
      WHERE member_id = ?
    `;
    const updateResult = await db.query(updateQuery, [imageUrl, member_id]);
    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ message: "ไม่พบสมาชิกที่ต้องการอัปเดตรูปโปรไฟล์" });
    }
    return res.status(200).json({ message: "อัปโหลดรูปโปรไฟล์สมาชิกสำเร็จ", url: imageUrl });
  } catch (error) {
    console.error("uploadMemberProfile error:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์", error: error.message });
  }
};

/**
 * Endpoint: อัปโหลดสลิปโอนเงิน (สำหรับตาราง Bookings)
 */
exports.uploadPaymentSlip = async (req, res) => {
  try {
    const { booking_id } = req.body;
    if (!booking_id) {
      return res.status(400).json({ message: "กรุณาระบุ booking_id" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "ไม่มีไฟล์รูปภาพ" });
    }
    const base64Image = bufferToBase64(req.file.buffer);
    const imageUrl = await uploadToImgBB(base64Image);

    const updateQuery = `
      UPDATE Bookings
      SET slip_image = ?, updated_at = CURRENT_TIMESTAMP
      WHERE booking_id = ?
    `;
    const updateResult = await db.query(updateQuery, [imageUrl, booking_id]);
    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ message: "ไม่พบ booking ที่ต้องการอัปเดตรูปสลิป" });
    }
    return res.status(200).json({ message: "อัปโหลดสลิปโอนเงินสำเร็จ", url: imageUrl });
  } catch (error) {
    console.error("uploadPaymentSlip error:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์", error: error.message });
  }
};


// Export multer middleware สำหรับรับไฟล์ (field "image")
exports.uploadMiddleware = upload.single('image');
