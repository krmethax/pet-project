// controllers/adminControllers.js

const db = require('../db');
const nodemailer = require('nodemailer');

/**
 * Endpoint สำหรับดึงข้อมูลการสมัครพี่เลี้ยง (Sitter Registrations)
 */
exports.getSitterRegistrations = async (req, res) => {
  try {
    const query = `
      SELECT 
        sitter_id, 
        first_name, 
        last_name, 
        email, 
        phone, 
        CASE 
          WHEN profile_image IS NOT NULL 
            THEN 'data:image/jpeg;base64,' || encode(profile_image, 'base64')
          ELSE NULL 
        END AS profile_image_base64,
        verification_status, 
        CASE 
          WHEN face_image IS NOT NULL 
            THEN 'data:image/jpeg;base64,' || encode(face_image, 'base64')
          ELSE NULL 
        END AS face_image,
        CASE 
          WHEN id_card_image IS NOT NULL 
            THEN 'data:image/jpeg;base64,' || encode(id_card_image, 'base64')
          ELSE NULL 
        END AS id_card_image,
        updated_at AS verify_created_at
      FROM Pet_Sitters
      ORDER BY created_at DESC;
    `;
    const result = await db.query(query);
    return res.status(200).json({
      message: 'ดึงข้อมูลพี่เลี้ยงสำเร็จ',
      registrations: result.rows
    });
  } catch (error) {
    console.error('Error fetching sitter registrations:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
};

/**
 * Endpoint สำหรับเปลี่ยนสถานะพี่เลี้ยง (Approve/Reject)
 * รับค่า sitter_id และ status จาก request body และส่งอีเมลแจ้งผลกลับไปยังผู้สมัคร
 */
exports.updateSitterStatus = async (req, res) => {
  try {
    const { sitter_id, status } = req.body;

    // ตรวจสอบข้อมูลเบื้องต้น: status ควรเป็น "approved" หรือ "rejected"
    if (!sitter_id || !status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: "กรุณาส่งข้อมูลให้ครบและสถานะถูกต้อง" });
    }

    // อัปเดตสถานะในตาราง Pet_Sitters
    const updateQuery = `
      UPDATE Pet_Sitters
      SET verification_status = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE sitter_id = $2
      RETURNING email, first_name, last_name, verification_status
    `;
    const result = await db.query(updateQuery, [status, sitter_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบพี่เลี้ยงที่ต้องการอัปเดต" });
    }
    const sitter = result.rows[0];

    // กำหนดข้อความอีเมลตามสถานะที่เปลี่ยนแปลง
    let subject = "";
    let text = "";
    if (status === "approved") {
      subject = "บัญชีพี่เลี้ยงของคุณได้รับการอนุมัติแล้ว";
      text = `สวัสดีคุณ ${sitter.first_name} ${sitter.last_name},\n\nบัญชีพี่เลี้ยงของคุณได้รับการอนุมัติแล้ว คุณสามารถเข้าสู่ระบบได้ทันที\n\nขอบคุณครับ,\nทีมงานของเรา`;
    } else if (status === "rejected") {
      subject = "บัญชีพี่เลี้ยงของคุณไม่ได้รับการอนุมัติ";
      text = `สวัสดีคุณ ${sitter.first_name} ${sitter.last_name},\n\nเราขออภัยที่บัญชีพี่เลี้ยงของคุณไม่ได้รับการอนุมัติ หากคุณมีข้อสงสัย กรุณาติดต่อฝ่ายบริการลูกค้า\n\nขอบคุณครับ,\nทีมงานของเรา`;
    }

    // ส่งอีเมลแจ้งผล
    await sendStatusEmail(sitter.email, subject, text);

    return res.status(200).json({
      message: "สถานะพี่เลี้ยงถูกเปลี่ยนเรียบร้อยและส่งอีเมลแจ้งผลแล้ว",
      sitter
    });
  } catch (error) {
    console.error("Update sitter status error:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
};

/**
 * ฟังก์ชันสำหรับส่งอีเมลแจ้งผลสถานะ
 */
async function sendStatusEmail(email, subject, text) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // ใช้ TLS
    auth: {
      user: 'methasit6061@gmail.com',      // เปลี่ยนเป็นอีเมลจริงของคุณ
      pass: 'glxb vlyf zmva cyqq',           // เปลี่ยนเป็นรหัสผ่านของอีเมลของคุณ
    },
  });

  const mailOptions = {
    from: '"Pet Sitter App" <your_email@gmail.com>',
    to: email,
    subject,
    text,
  };

  await transporter.sendMail(mailOptions);
  console.log(`ส่งอีเมลแจ้งสถานะไปยัง ${email} เรียบร้อยแล้ว`);
}

/**
 * ฟังก์ชันสำหรับสร้างรหัส OTP 6 หลัก
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * ฟังก์ชันส่งอีเมล OTP ผ่าน SMTP (ใช้ Nodemailer)
 */
async function sendOTPEmailSMTP(email, otp) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // ใช้ Gmail SMTP
    port: 587,
    secure: false,
    auth: {
      user: 'methasit6061@gmail.com', // เปลี่ยนเป็นอีเมลจริงของคุณ
      pass: 'glxb vlyf zmva cyqq',      // เปลี่ยนเป็นรหัสผ่านของอีเมลของคุณ
    },
  });

  const mailOptions = {
    from: '"Pet Sitter App" <your_email@gmail.com>',
    to: email,
    subject: 'รหัส OTP สำหรับการยืนยันตัวตน',
    text: `รหัส OTP ของคุณคือ: ${otp} (มีอายุ 10 นาที)`,
  };

  await transporter.sendMail(mailOptions);
  console.log(`ส่ง OTP ${otp} ไปยังอีเมล: ${email} ผ่าน SMTP แล้ว`);
}

/**
 * Endpoint สำหรับยืนยัน OTP สำหรับพี่เลี้ยง (Verify OTP)
 */
exports.verifyOtp = async (req, res) => {
  const { sitter_id, otp_code } = req.body;

  try {
    const otpQuery = `
      SELECT * FROM Verify_OTP_Sitter
      WHERE sitter_id = $1 AND otp_code = $2 AND is_verified = FALSE
      ORDER BY created_at DESC LIMIT 1
    `;
    const otpResult = await db.query(otpQuery, [sitter_id, otp_code]);

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ message: 'รหัส OTP ไม่ถูกต้อง' });
    }

    const otpRecord = otpResult.rows[0];

    if (new Date() > new Date(otpRecord.expires_at)) {
      return res.status(400).json({ message: 'รหัส OTP หมดอายุแล้ว' });
    }

    const updateOtpQuery = `
      UPDATE Verify_OTP_Sitter
      SET is_verified = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE otp_id = $1
    `;
    await db.query(updateOtpQuery, [otpRecord.otp_id]);

    return res.status(200).json({
      message: 'ยืนยัน OTP สำเร็จ กรุณาดำเนินการอัปเดตโปรไฟล์',
      sitter_id
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
};

exports.getServiceTypes = async (req, res) => {
  try {
    const query = `
      SELECT 
        service_type_id,
        short_name,
        full_description,
        created_at,
        updated_at
      FROM Service_Types
      ORDER BY service_type_id ASC
    `;
    const result = await db.query(query);
    return res.status(200).json({ serviceTypes: result.rows });
  } catch (error) {
    console.error("Error fetching service types:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Endpoint สำหรับเพิ่มประเภทบริการใหม่ (Create Service Type)
 * รับค่า short_name และ full_description ใน request body
 */
exports.createServiceType = async (req, res) => {
  try {
    const { short_name, full_description } = req.body;
    
    // ตรวจสอบข้อมูลที่จำเป็น (แต่ไม่ต้องตรวจสอบ short_name ให้ตรงกับตัวเลือก)
    if (!short_name || !full_description) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบ" });
    }
    
    const insertQuery = `
      INSERT INTO Service_Types (short_name, full_description, created_at, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const result = await db.query(insertQuery, [short_name, full_description]);
    
    return res.status(200).json({
      message: "เพิ่มประเภทบริการสำเร็จ",
      serviceType: result.rows[0]
    });
  } catch (error) {
    console.error("Error creating service type:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Endpoint สำหรับแก้ไขประเภทบริการ (Update Service Type)
 * รับค่า service_type_id, short_name และ full_description ใน request body
 */
exports.updateServiceType = async (req, res) => {
  try {
    const { service_type_id, short_name, full_description } = req.body;
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!service_type_id || !short_name || !full_description) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบ" });
    }
    
    const updateQuery = `
      UPDATE Service_Types
      SET short_name = $1,
          full_description = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE service_type_id = $3
      RETURNING *
    `;
    const result = await db.query(updateQuery, [short_name, full_description, service_type_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบประเภทบริการที่ต้องการแก้ไข" });
    }
    
    return res.status(200).json({
      message: "แก้ไขประเภทบริการสำเร็จ",
      serviceType: result.rows[0]
    });
  } catch (error) {
    console.error("Error updating service type:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Endpoint สำหรับลบประเภทบริการ (Delete Service Type)
 * รับค่า service_type_id ผ่าน URL parameter
 */
exports.deleteServiceType = async (req, res) => {
  try {
    const { service_type_id } = req.params;
    if (!service_type_id) {
      return res.status(400).json({ message: "Service Type ID is required" });
    }
    
    const deleteQuery = `
      DELETE FROM Service_Types
      WHERE service_type_id = $1
      RETURNING *
    `;
    const result = await db.query(deleteQuery, [service_type_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบประเภทบริการที่ต้องการลบ" });
    }
    
    return res.status(200).json({
      message: "ลบประเภทบริการสำเร็จ",
      serviceType: result.rows[0]
    });
  } catch (error) {
    console.error("Error deleting service type:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ดึงข้อมูลประเภทสัตว์เลี้ยงทั้งหมด (GET)
exports.getPetTypes = async (req, res) => {
  try {
    const query = `
      SELECT 
        pet_type_id,
        type_name,
        description,
        created_at,
        updated_at
      FROM Pet_Types
      ORDER BY pet_type_id ASC
    `;
    const result = await db.query(query);
    return res.status(200).json({
      message: "ดึงข้อมูลประเภทสัตว์เลี้ยงสำเร็จ",
      petTypes: result.rows
    });
  } catch (error) {
    console.error("Error fetching pet types:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// สร้างประเภทสัตว์เลี้ยงใหม่ (CREATE)
exports.createPetType = async (req, res) => {
  try {
    const { type_name, description } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!type_name) {
      return res.status(400).json({ message: "กรุณากรอกชื่อประเภทสัตว์เลี้ยง" });
    }

    const insertQuery = `
      INSERT INTO Pet_Types (type_name, description, created_at, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const result = await db.query(insertQuery, [type_name, description || null]);

    return res.status(200).json({
      message: "สร้างประเภทสัตว์เลี้ยงสำเร็จ",
      petType: result.rows[0]
    });
  } catch (error) {
    console.error("Error creating pet type:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// แก้ไขประเภทสัตว์เลี้ยง (UPDATE)
exports.updatePetType = async (req, res) => {
  try {
    const { pet_type_id, type_name, description } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!pet_type_id || !type_name) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลที่จำเป็นให้ครบ" });
    }

    const updateQuery = `
      UPDATE Pet_Types
      SET type_name = $1,
          description = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE pet_type_id = $3
      RETURNING *
    `;
    const result = await db.query(updateQuery, [type_name, description || null, pet_type_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบประเภทสัตว์เลี้ยงที่ต้องการแก้ไข" });
    }

    return res.status(200).json({
      message: "แก้ไขประเภทสัตว์เลี้ยงสำเร็จ",
      petType: result.rows[0]
    });
  } catch (error) {
    console.error("Error updating pet type:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ลบประเภทสัตว์เลี้ยง (DELETE)
exports.deletePetType = async (req, res) => {
  try {
    const { pet_type_id } = req.params;
    if (!pet_type_id) {
      return res.status(400).json({ message: "กรุณาระบุ pet_type_id" });
    }

    const deleteQuery = `
      DELETE FROM Pet_Types
      WHERE pet_type_id = $1
      RETURNING *
    `;
    const result = await db.query(deleteQuery, [pet_type_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบประเภทสัตว์เลี้ยงที่ต้องการลบ" });
    }

    return res.status(200).json({
      message: "ลบประเภทสัตว์เลี้ยงสำเร็จ",
      petType: result.rows[0]
    });
  } catch (error) {
    console.error("Error deleting pet type:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
