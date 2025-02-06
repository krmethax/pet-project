// controllers/authController.js
const db = require('../db');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// ฟังก์ชันสุ่ม OTP 6 หลัก
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ฟังก์ชันส่งอีเมล OTP (ส่งผ่าน SMTP)
// สามารถปรับใช้การตั้งค่า SMTP ให้ตรงกับการใช้งานจริงของคุณ
async function sendOTPEmailSMTP(email, otp) {
  // สร้าง transporter สำหรับส่งอีเมลผ่าน SMTP
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // ใช้ Gmail SMTP
    port: 587,
    secure: false, // ใช้ TLS
    auth: {
      user: 'methasit6061@gmail.com',      // เปลี่ยนเป็นอีเมลจริงของคุณ
      pass: 'glxb vlyf zmva cyqq',           // เปลี่ยนเป็นรหัสผ่านของอีเมลของคุณ
    },
  });

  // กำหนด mail options (ข้อความภาษาไทย)
  const mailOptions = {
    from: '"Pet Sitter App" <your_email@gmail.com>',
    to: email,
    subject: 'รหัส OTP สำหรับการยืนยันตัวตน',
    text: `รหัส OTP ของคุณคือ: ${otp} (มีอายุ 10 นาที)`,
  };

  // ส่งอีเมล
  await transporter.sendMail(mailOptions);
  console.log(`ส่ง OTP ${otp} ไปยังอีเมล: ${email} ผ่าน SMTP แล้ว`);
}

// -----------------------------------------------------------------
// Controller สำหรับสมาชิกทั่วไป (Members)
// -----------------------------------------------------------------

// 1. สมัครสมาชิก (Register)
exports.register = async (req, res) => {
  // รับค่าจาก request body
  const { 
    email, 
    password,
    first_name, 
    last_name, 
    phone,
    province,    // จังหวัด (จาก API)
    amphure,     // อำเภอ (จาก API)
    tambon       // ตำบล (จาก API)
  } = req.body;

  try {
    // ตรวจสอบว่ามีสมาชิกที่มี email นี้อยู่หรือยัง
    const memberCheck = await db.query('SELECT * FROM Members WHERE email = $1', [email]);
    if (memberCheck.rows.length > 0) {
      return res.status(400).json({ message: 'อีเมลนี้มีการสมัครไว้แล้ว' });
    }

    // เข้ารหัส password
    const hashedPassword = await bcrypt.hash(password, 10);

    // สร้าง record สมาชิกใหม่ในตาราง Members
    const insertMemberQuery = `
      INSERT INTO Members (
        first_name, last_name, email, password, phone, profile_image, province, amphure, tambon
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING member_id, email
    `;
    const values = [
      first_name || '',         // หากไม่ได้ส่ง first_name ให้ใช้ empty string
      last_name  || '',         // หากไม่ได้ส่ง last_name ให้ใช้ empty string
      email,
      hashedPassword,
      phone || '',              // หากไม่ได้ส่ง phone ให้ใช้ empty string
      null,                     // profile_image (ยังไม่มีการอัพโหลด)
      province || null,
      amphure  || null,
      tambon   || null
    ];
    const memberResult = await db.query(insertMemberQuery, values);
    const newMember = memberResult.rows[0];

    // สุ่ม OTP 6 หลัก
    const otp = generateOTP();
    // กำหนดเวลาหมดอายุของ OTP (10 นาที)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // บันทึก OTP ลงในตาราง Verify_OTP (ใช้ member_id)
    const insertOtpQuery = `
      INSERT INTO Verify_OTP (member_id, otp_code, expires_at)
      VALUES ($1, $2, $3)
    `;
    await db.query(insertOtpQuery, [newMember.member_id, otp, expiresAt]);

    // ส่ง OTP ไปที่อีเมลที่กรอก
    await sendOTPEmailSMTP(email, otp);

    return res.status(200).json({
      message: 'ส่ง OTP ไปที่อีเมลของคุณแล้ว กรุณายืนยัน OTP เพื่อดำเนินการต่อ',
      member_id: newMember.member_id
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
};

// 2. ยืนยัน OTP
exports.verifyOtp = async (req, res) => {
  // รับ member_id และ otp_code จาก request body
  const { member_id, otp_code } = req.body;

  try {
    // ดึงข้อมูล OTP ที่เกี่ยวข้องกับ member_id
    const otpQuery = `
      SELECT * FROM Verify_OTP
      WHERE member_id = $1 AND otp_code = $2 AND is_verified = FALSE
      ORDER BY created_at DESC LIMIT 1
    `;
    const otpResult = await db.query(otpQuery, [member_id, otp_code]);

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ message: 'รหัส OTP ไม่ถูกต้อง' });
    }

    const otpRecord = otpResult.rows[0];

    // ตรวจสอบว่า OTP หมดอายุหรือยัง
    if (new Date() > new Date(otpRecord.expires_at)) {
      return res.status(400).json({ message: 'รหัส OTP หมดอายุแล้ว' });
    }

    // อัปเดตสถานะ OTP ให้เป็น verified
    const updateOtpQuery = `
      UPDATE Verify_OTP
      SET is_verified = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE otp_id = $1
    `;
    await db.query(updateOtpQuery, [otpRecord.otp_id]);

    return res.status(200).json({
      message: 'ยืนยัน OTP สำเร็จ กรุณาดำเนินการอัปเดตโปรไฟล์',
      member_id
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
};

// 3. อัปเดตโปรไฟล์สมาชิก (first_name, last_name, phone, profile_image)
exports.updateProfile = async (req, res) => {
  const { member_id, first_name, last_name, phone, profile_image } = req.body;

  try {
    const updateQuery = `
      UPDATE Members
      SET first_name = $1,
          last_name = $2,
          phone = $3,
          profile_image = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE member_id = $5
      RETURNING *
    `;
    const result = await db.query(updateQuery, [first_name, last_name, phone, profile_image, member_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบสมาชิก' });
    }

    return res.status(200).json({
      message: 'อัปเดตโปรไฟล์สำเร็จ บัญชีของคุณพร้อมใช้งานแล้ว',
      member: result.rows[0]
    });
  } catch (error) {
    console.error('Update Profile error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
};

// 4. แจ้งให้ทราบว่าการเปิดบัญชีสำเร็จ
exports.registrationSuccess = (req, res) => {
  return res.status(200).json({
    message: 'เปิดบัญชีสำเร็จ กรุณาเข้าสู่ระบบ'
  });
};

// 5. ขอรหัส OTP ใหม่ (Resend OTP)
exports.resendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    // ตรวจสอบว่ามีสมาชิกที่มีอีเมลนี้ในระบบหรือไม่
    const memberResult = await db.query('SELECT member_id FROM Members WHERE email = $1', [email]);
    if (memberResult.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบสมาชิกที่มีอีเมลนี้ในระบบ' });
    }
    const member_id = memberResult.rows[0].member_id;

    // สุ่ม OTP ใหม่ 6 หลัก
    const otp = generateOTP();
    // กำหนดเวลาหมดอายุของ OTP ใหม่ (10 นาที)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // บันทึก OTP ใหม่ลงในตาราง Verify_OTP
    const insertOtpQuery = `
      INSERT INTO Verify_OTP (member_id, otp_code, expires_at)
      VALUES ($1, $2, $3)
    `;
    await db.query(insertOtpQuery, [member_id, otp, expiresAt]);

    // ส่ง OTP ใหม่ไปที่อีเมล
    await sendOTPEmailSMTP(email, otp);

    return res.status(200).json({
      message: 'รหัส OTP ใหม่ถูกส่งไปที่อีเมลของคุณแล้ว',
      member_id
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
};

// 6. เข้าสู่ระบบ (Login)
// สำหรับสมาชิกทั่วไป ใช้ตาราง Members ในการตรวจสอบ email และ password
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // ตรวจสอบว่ามีสมาชิกที่มี email นี้หรือไม่
    const memberResult = await db.query('SELECT * FROM Members WHERE email = $1', [email]);
    if (memberResult.rows.length === 0) {
      return res.status(400).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }
    const member = memberResult.rows[0];

    // ตรวจสอบรหัสผ่านด้วย bcrypt
    const isPasswordValid = await bcrypt.compare(password, member.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    return res.status(200).json({
      message: 'เข้าสู่ระบบสำเร็จ',
      member: {
        member_id: member.member_id,
        email: member.email,
        first_name: member.first_name,
        last_name: member.last_name,
        phone: member.phone,
        profile_image: member.profile_image
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
};

// 7. ดึงข้อมูลสมาชิก (Get Member)
// ตัวอย่าง: GET /api/auth/member/:member_id
exports.getMember = async (req, res) => {
  const { member_id } = req.params;

  try {
    const memberResult = await db.query('SELECT * FROM Members WHERE member_id = $1', [member_id]);
    if (memberResult.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบสมาชิก' });
    }
    const member = memberResult.rows[0];
    return res.status(200).json({
      message: 'ดึงข้อมูลสมาชิกสำเร็จ',
      member: {
        member_id: member.member_id,
        email: member.email,
        first_name: member.first_name,
        last_name: member.last_name,
        phone: member.phone,
        profile_image: member.profile_image
      }
    });
  } catch (error) {
    console.error('Get Member error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
};

// -----------------------------------------------------------------
// Controller สำหรับพี่เลี้ยงสัตว์ (Pet Sitters)
// -----------------------------------------------------------------

// 8. ลงทะเบียนพี่เลี้ยง (Register Sitter)
// สมาชิกที่มีอยู่ในตาราง Members สามารถขอเปลี่ยนเป็นพี่เลี้ยงได้
exports.registerSitter = async (req, res) => {
  // รับข้อมูลจาก request body
  // ตัวอย่างข้อมูลที่รับ: firstName, lastName, email, phone, idCard, faceImage, idCardImage, address, province, amphure, tambon, experience
  const { firstName, lastName, email, phone, idCard, faceImage, idCardImage, address, province, amphure, tambon, experience } = req.body;

  try {
    // ตรวจสอบว่ามีสมาชิกที่มีอีเมลนี้อยู่ในระบบหรือไม่
    const memberResult = await db.query('SELECT * FROM Members WHERE email = $1', [email]);
    if (memberResult.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบสมาชิกที่มีอีเมลนี้ กรุณาสมัครสมาชิกก่อน' });
    }
    const member = memberResult.rows[0];

    // สร้าง record ใหม่ในตาราง Pet_Sitters โดยดึงข้อมูลบางส่วนจากสมาชิกที่มีอยู่
    // สำหรับ password เราสามารถใช้ password เดิมจากสมาชิกที่สมัครไว้ได้
    const insertSitterQuery = `
      INSERT INTO Pet_Sitters (
        first_name, last_name, email, password, phone, profile_image, address, province, amphure, tambon, experience
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING sitter_id
    `;
    const sitterValues = [
      firstName || member.first_name,
      lastName  || member.last_name,
      email,
      member.password,
      phone || member.phone,
      faceImage || member.profile_image,
      address || '',
      province || null,
      amphure  || null,
      tambon   || null,
      experience || ''
    ];
    const sitterResult = await db.query(insertSitterQuery, sitterValues);
    const newSitter = sitterResult.rows[0];

    // สร้าง record ในตาราง Verify_Account สำหรับการยืนยันตัวตนของพี่เลี้ยง
    const insertVerifyAccountQuery = `
      INSERT INTO Verify_Account (
        sitter_id, identity_document, face_image, id_card_image
      )
      VALUES ($1, $2, $3, $4)
      RETURNING verification_id
    `;
    await db.query(insertVerifyAccountQuery, [newSitter.sitter_id, idCard, faceImage, idCardImage]);

    return res.status(200).json({
      message: 'ส่งข้อมูลสำเร็จ รอตรวจสอบเอกสารโดยประมาณ 1-2 วัน',
      sitter_id: newSitter.sitter_id
    });
  } catch (error) {
    console.error('Register Sitter error:', error);
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
exports.getPetCategories = async (req, res) => {
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
    return res.status(200).json({ petCategories: result.rows });
  } catch (error) {
    console.error("Error fetching pet categories:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
// เพิ่ม API สำหรับดึงงานของพี่เลี้ยง (Sitter Services) สำหรับสมาชิก
exports.getSitterServicesForMember = async (req, res) => {
  try {
    // Query ดึงข้อมูลจากตาราง Sitter_Services
    // ในที่นี้ เราใช้ CASE ในการแปลง service_image เป็น Base64 หากมีข้อมูล (หากคุณเก็บเป็น BYTEA)
    const query = `
      SELECT 
        ss.sitter_service_id,
        ss.sitter_id,
        ss.service_type_id,
        ss.pet_type_id,
        ss.price,
        ss.pricing_unit,
        ss.duration,
        ss.description,
        CASE 
          WHEN ss.service_image IS NOT NULL 
            THEN 'data:image/jpeg;base64,' || encode(ss.service_image, 'base64')
          ELSE NULL 
        END AS service_image,
        ss.created_at,
        ss.updated_at
      FROM Sitter_Services ss
      ORDER BY ss.created_at DESC
    `;
    const result = await db.query(query);
    return res.status(200).json({
      message: "ดึงงานของพี่เลี้ยงสำเร็จ",
      services: result.rows
    });
  } catch (error) {
    console.error("Error fetching sitter services:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
