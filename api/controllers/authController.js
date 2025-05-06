const db = require('../db');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const moment = require('moment');
/**
 * ฟังก์ชันสุ่ม OTP 6 หลัก
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
    secure: false, // ใช้ TLS
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
 * Controller สำหรับสมาชิกทั่วไป (Members)
 */

// 1. สมัครสมาชิก (Register)
exports.register = async (req, res) => {
  const { email, password, first_name, last_name, phone, province, amphure, tambon } = req.body;

  try {
    // ตรวจสอบว่ามีสมาชิกที่มี email นี้อยู่หรือยัง
    const memberCheck = await db.query('SELECT * FROM Members WHERE email = ?', [email]);
    if (memberCheck.length > 0) {
      return res.status(400).json({ message: 'อีเมลนี้มีการสมัครไว้แล้ว' });
    }

    // เข้ารหัส password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ตรวจสอบค่า phone ถ้าไม่ได้ส่งค่าหรือเป็นสตริงว่าง ให้ใช้ null
    const phoneValue = (phone && phone.trim() !== '') ? phone : null;

    // สร้าง record สมาชิกใหม่ในตาราง Members โดย profile_image จะเก็บเป็น URL (ยังไม่มีการอัปโหลด)
    const insertMemberQuery = `
      INSERT INTO Members (
        first_name, last_name, email, password, phone, profile_image, province, amphure, tambon
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      first_name || '',
      last_name || '',
      email,
      hashedPassword,
      phoneValue,
      null, // profile_image
      province || null,
      amphure || null,
      tambon || null
    ];
    const memberResult = await db.query(insertMemberQuery, values);
    // ใน MySQL ผลลัพธ์ของ INSERT จะมี insertId
    const newMember = { member_id: memberResult.insertId };

    // สุ่ม OTP 6 หลักและกำหนดเวลาหมดอายุ 10 นาที
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const insertOtpQuery = `
      INSERT INTO Verify_OTP (member_id, otp_code, expires_at)
      VALUES (?, ?, ?)
    `;
    await db.query(insertOtpQuery, [newMember.member_id, otp, expiresAt]);

    // ส่ง OTP ไปที่อีเมล
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
  const { member_id, otp_code } = req.body;

  try {
    const otpQuery = `
      SELECT * FROM Verify_OTP
      WHERE member_id = ? AND otp_code = ? AND is_verified = FALSE
      ORDER BY created_at DESC LIMIT 1
    `;
    const otpResult = await db.query(otpQuery, [member_id, otp_code]);

    if (otpResult.length === 0) {
      return res.status(400).json({ message: 'รหัส OTP ไม่ถูกต้อง' });
    }

    const otpRecord = otpResult[0];

    if (new Date() > new Date(otpRecord.expires_at)) {
      return res.status(400).json({ message: 'รหัส OTP หมดอายุแล้ว' });
    }

    const updateOtpQuery = `
      UPDATE Verify_OTP
      SET is_verified = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE otp_id = ?
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
  const { member_id, first_name, last_name, phone, profile_image, address, tambon, amphure, province } = req.body;

  try {
    const updateQuery = `
      UPDATE Members
      SET first_name = ?,
          last_name = ?,
          phone = ?,
          profile_image = ?,
          address = ?,
          tambon = ?,
          amphure = ?,
          province = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE member_id = ?
    `;
    await db.query(updateQuery, [first_name, last_name, phone, profile_image, address, tambon, amphure, province, member_id]);

    const selectQuery = `
      SELECT member_id, email, first_name, last_name, phone, profile_image, address, tambon, amphure, province
      FROM Members
      WHERE member_id = ?
    `;
    const result = await db.query(selectQuery, [member_id]);
    if (result.length === 0) {
      return res.status(404).json({ message: 'ไม่พบสมาชิก' });
    }
    const member = result[0];
    return res.status(200).json({
      message: 'อัปเดตโปรไฟล์สำเร็จ บัญชีของคุณพร้อมใช้งานแล้ว',
      member,
    });
  } catch (error) {
    console.error('Update Profile error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
};


// 4. แจ้งให้ทราบว่าการเปิดบัญชีสำเร็จ
exports.registrationSuccess = (req, res) => {
  return res.status(200).json({ message: 'เปิดบัญชีสำเร็จ กรุณาเข้าสู่ระบบ' });
};

// 5. ขอรหัส OTP ใหม่ (Resend OTP)
exports.resendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    const memberResult = await db.query('SELECT member_id FROM Members WHERE email = ?', [email]);
    if (memberResult.length === 0) {
      return res.status(404).json({ message: 'ไม่พบสมาชิกที่มีอีเมลนี้ในระบบ' });
    }
    const member_id = memberResult[0].member_id;

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const insertOtpQuery = `
      INSERT INTO Verify_OTP (member_id, otp_code, expires_at)
      VALUES (?, ?, ?)
    `;
    await db.query(insertOtpQuery, [member_id, otp, expiresAt]);

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
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const memberResult = await db.query('SELECT * FROM Members WHERE email = ?', [email]);
    if (memberResult.length === 0) {
      return res.status(400).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }
    const member = memberResult[0];
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
exports.getMember = async (req, res) => {
  const { member_id } = req.params;
  try {
    const query = `
      SELECT member_id, email, first_name, last_name, phone, profile_image, tambon, amphure, province
      FROM Members
      WHERE member_id = ?
    `;
    const memberResult = await db.query(query, [member_id]);
    if (memberResult.length === 0) {
      return res.status(404).json({ message: 'ไม่พบสมาชิก' });
    }
    const member = memberResult[0];
    return res.status(200).json({
      message: 'ดึงข้อมูลสมาชิกสำเร็จ',
      member,
    });
  } catch (error) {
    console.error('Get Member error:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
};


exports.getServiceTypes = async (req, res) => {
  try {
    const query = `
      SELECT service_type_id, short_name, full_description, created_at, updated_at
      FROM Service_Types
      ORDER BY service_type_id ASC
    `;
    const result = await db.query(query);
    return res.status(200).json({ serviceTypes: result });
  } catch (error) {
    console.error("Error fetching service types:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getPetCategories = async (req, res) => {
  try {
    const query = `
      SELECT pet_type_id, type_name, description, created_at, updated_at
      FROM Pet_Types
      ORDER BY pet_type_id ASC
    `;
    const result = await db.query(query);
    return res.status(200).json({ petCategories: result });
  } catch (error) {
    console.error("Error fetching pet categories:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// API สำหรับดึงงานของพี่เลี้ยง (Sitter Services)
// ส่ง service_image เป็น URL ตรงๆ
exports.getSitterServicesForMember = async (req, res) => {
  try {
    const query = `
      SELECT
        sitter_service_id,
        sitter_id,
        service_type_id,
        pet_type_id,
        job_name,
        price,
        created_at,
        updated_at
      FROM Sitter_Services
      ORDER BY created_at DESC
    `;
    const result = await db.query(query);
    return res.status(200).json({
      message: "ดึงงานของพี่เลี้ยงสำเร็จ",
      services: result
    });
  } catch (error) {
    console.error("Error fetching sitter services:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getSitterProfile = async (req, res) => {
  const { sitter_id } = req.params;
  try {
    const query = `
      SELECT 
        s.sitter_id,
        s.first_name,
        s.last_name,
        s.email,
        s.phone,
        s.address,
        s.province,
        s.amphure,
        s.tambon,
        s.experience,
        s.rating,
        s.verification_status,
        s.created_at,
        s.updated_at,
        s.profile_image
      FROM Pet_Sitters s
      WHERE s.sitter_id = ?
    `;
    const result = await db.query(query, [sitter_id]);
    if (result.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลพี่เลี้ยง" });
    }
    return res.status(200).json({
      message: "ดึงข้อมูลพี่เลี้ยงสำเร็จ",
      sitter: result[0],
    });
  } catch (error) {
    console.error("Error fetching sitter profile:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
};

exports.getPaymentMethodsForMember = async (req, res) => {
  try {
    const { sitter_id } = req.params;
    if (!sitter_id) {
      return res.status(400).json({ message: "กรุณาระบุ Sitter ID" });
    }
    const query = `
      SELECT payment_method_id, sitter_id, promptpay_number, created_at, updated_at
      FROM Payment_Methods
      WHERE sitter_id = ?
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [sitter_id]);
    return res.status(200).json({
      message: "ดึงข้อมูลวิธีการชำระเงินของพี่เลี้ยงสำเร็จ",
      paymentMethods: result
    });
  } catch (error) {
    console.error("Error fetching payment methods for member:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
};

exports.submitBookingSlip = async (req, res) => {
  const { booking_id, slip_image } = req.body;
  try {
    const bookingResult = await db.query('SELECT * FROM Bookings WHERE booking_id = ?', [booking_id]);
    if (bookingResult.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลการจอง" });
    }
    const updateQuery = `
      UPDATE Bookings
      SET slip_image = ?, status = 'pending_verification', updated_at = CURRENT_TIMESTAMP
      WHERE booking_id = ?
    `;
    await db.query(updateQuery, [slip_image, booking_id]);
    // ดึงข้อมูลการจองที่อัปเดตแล้ว
    const selectQuery = `SELECT booking_id, slip_image, status FROM Bookings WHERE booking_id = ?`;
    const updatedResult = await db.query(selectQuery, [booking_id]);
    return res.status(200).json({
      message: "ส่งสลิปเรียบร้อยแล้ว รอการตรวจสอบจาก Admin",
      booking: updatedResult[0]
    });
  } catch (error) {
    console.error("Submit Booking Slip error:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
};

exports.createBooking = async (req, res) => {
  const {
    member_id = null,
    sitter_id = null,
    pet_type_id = null,
    sitter_service_id = null,
    service_type_id,
    start_time = null,
    end_time = null,
    total_price = null,
    pet_quantity = 1
  } = req.body;

  // ตรวจสอบว่า service_type_id และ member_id ถูกส่งมาหรือไม่
  if (service_type_id === undefined) {
    return res.status(400).json({ message: "service_type_id จำเป็นต้องระบุ" });
  }

  if (!member_id) {
    return res.status(400).json({ message: "member_id จำเป็นต้องระบุ" });
  }

  // ตรวจสอบว่า start_time และ end_time ถูกส่งมาหรือไม่
  if (!start_time || !end_time) {
    return res.status(400).json({ message: "start_time และ end_time จำเป็นต้องระบุ" });
  }

  try {
    // ตรวจสอบว่า member_id มีอยู่ในระบบ
    const checkMemberQuery = 'SELECT * FROM Members WHERE member_id = ?';
    const memberCheck = await db.query(checkMemberQuery, [member_id]);
    if (memberCheck.length === 0) {
      return res.status(400).json({ message: "member_id ไม่ถูกต้อง หรือไม่มีอยู่ในระบบ" });
    }

    // ตรวจสอบ service_type_id ว่ามีอยู่ใน Service_Types หรือไม่
    const checkServiceTypeQuery = 'SELECT * FROM Service_Types WHERE service_type_id = ?';
    const serviceTypeCheck = await db.query(checkServiceTypeQuery, [service_type_id]);
    if (serviceTypeCheck.length === 0) {
      return res.status(400).json({ message: "service_type_id ไม่ถูกต้อง หรือไม่มีอยู่ในระบบ" });
    }

    // กำหนดค่า booking_date โดยใช้ start_time
    const booking_date = moment(start_time).format("YYYY-MM-DD");

    // คำสั่ง INSERT เข้าตาราง Bookings
    const insertQuery = `
      INSERT INTO Bookings (
        member_id, sitter_id, pet_type_id, sitter_service_id, service_type_id, booking_date, start_time, end_time, total_price, pet_quantity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await db.query(insertQuery, [
      member_id,
      sitter_id,
      pet_type_id,
      sitter_service_id,
      service_type_id,
      booking_date, // กำหนดค่า booking_date
      start_time,
      end_time,
      total_price,
      pet_quantity, // Include pet_quantity here
    ]);

    // ถ้าการ insert สำเร็จ จะส่ง booking_id กลับ
    if (result.insertId) {
      return res.status(200).json({ booking_id: result.insertId });
    } else {
      throw new Error("Error creating booking");
    }
  } catch (err) {
    console.error("Error in createBooking:", err);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในการสร้างการจอง" });
  }
};


exports.getBookingsForMember = async (req, res) => {
  const { member_id } = req.params;
  try {
    const query = `
      SELECT
        b.booking_id,
        b.member_id,
        CONCAT(m.first_name, ' ', m.last_name)      AS member_name,
        b.sitter_id,
        CONCAT(s.first_name, ' ', s.last_name)      AS sitter_name,
        b.pet_type_id,
        pt.type_name                               AS pet_type,
        b.sitter_service_id,
        ss.job_name                                AS service_job_name,
        ss.price                                   AS service_price,
        st.short_name                              AS service_type_short_name,
        st.full_description                        AS service_type_description,
        b.booking_date,
        b.start_time,
        b.end_time,
        b.status,
        b.agreement_status,
        b.total_price,
        b.payment_status,
        b.pet_quantity,
        b.slip_image,
        b.created_at,
        b.updated_at,
        -- ตรวจสอบว่ามีรีวิวของ booking นี้หรือยัง
        EXISTS(
          SELECT 1 
          FROM Reviews r 
          WHERE r.booking_id = b.booking_id 
            AND r.member_id = b.member_id
        ) AS has_review
      FROM Bookings b
      LEFT JOIN Members       m  ON b.member_id         = m.member_id
      LEFT JOIN Pet_Sitters   s  ON b.sitter_id         = s.sitter_id
      LEFT JOIN Pet_Types     pt ON b.pet_type_id       = pt.pet_type_id
      LEFT JOIN Sitter_Services ss ON b.sitter_service_id = ss.sitter_service_id
      LEFT JOIN Service_Types  st ON ss.service_type_id  = st.service_type_id
      WHERE b.member_id = ?
      ORDER BY b.created_at DESC
    `;
    const bookings = await db.query(query, [member_id]);
    return res.status(200).json({
      message: 'ดึงข้อมูลการจองพร้อมรายละเอียดสำเร็จ',
      bookings
    });
  } catch (error) {
    console.error('Error fetching bookings for member:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
};

/**
 * Endpoint สำหรับยกเลิกการจอง
 * สมาชิกสามารถยกเลิกการจองได้เฉพาะเมื่อสถานะการชำระเงินยังไม่เป็น 'paid'
 */
exports.cancelBooking = async (req, res) => {
  const { booking_id, member_id } = req.body;
  try {
    const query = `
      SELECT * FROM Bookings
      WHERE booking_id = ? AND member_id = ?
    `;
    const result = await db.query(query, [booking_id, member_id]);
    if (result.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลการจอง" });
    }
    const booking = result[0];
    if (booking.payment_status === 'paid') {
      return res.status(400).json({ message: "ไม่สามารถยกเลิกการจองได้เนื่องจากชำระเงินแล้ว" });
    }
    const updateQuery = `
      UPDATE Bookings
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE booking_id = ?
    `;
    await db.query(updateQuery, [booking_id]);
    const selectQuery = `SELECT booking_id, status FROM Bookings WHERE booking_id = ?`;
    const updateResult = await db.query(selectQuery, [booking_id]);
    return res.status(200).json({
      message: "ยกเลิกการจองเรียบร้อยแล้ว",
      booking: updateResult[0],
    });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
};

/**
 * ดึงข้อมูลพี่เลี้ยงทั้งหมด
 */
exports.getAllSitters = async (req, res) => {
  try {
    const query = `
      SELECT 
        sitter_id,
        first_name,
        last_name,
        email,
        phone,
        profile_image,
        address,
        province,
        amphure,
        tambon,
        experience,
        rating,
        verification_status,
        created_at,
        updated_at
      FROM Pet_Sitters
      ORDER BY created_at DESC
    `;
    const result = await db.query(query);
    return res.status(200).json({
      message: "ดึงข้อมูลพี่เลี้ยงทั้งหมดสำเร็จ",
      sitters: result
    });
  } catch (error) {
    console.error("Error fetching all sitters:", error);
    return res.status(500).json({
      message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์",
    });
  }
};

/**
 * เพิ่มถูกใจพี่เลี้ยง (Favorite Sitter)
 */
exports.addFavoriteSitter = async (req, res) => {
  const { member_id, sitter_id } = req.body;
  try {
    // ตรวจสอบว่ามี favorite นี้อยู่แล้วหรือไม่
    const checkQuery = 'SELECT * FROM Favorite_Sitters WHERE member_id = ? AND sitter_id = ?';
    const existing = await db.query(checkQuery, [member_id, sitter_id]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'คุณได้ถูกใจพี่เลี้ยงคนนี้แล้ว' });
    }
    // เพิ่ม favorite ใหม่
    const insertQuery = 'INSERT INTO Favorite_Sitters (member_id, sitter_id) VALUES (?, ?)';
    const result = await db.query(insertQuery, [member_id, sitter_id]);
    return res.status(200).json({ message: 'เพิ่มถูกใจพี่เลี้ยงสำเร็จ', favorite_id: result.insertId });
  } catch (error) {
    console.error("Error adding favorite sitter:", error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
};

/**
 * ลบ Favorite_Sitter
 */
exports.removeFavoriteSitter = async (req, res) => {
  const { member_id, sitter_id } = req.params;
  try {
    const deleteQuery = 'DELETE FROM Favorite_Sitters WHERE member_id = ? AND sitter_id = ?';
    await db.query(deleteQuery, [member_id, sitter_id]);
    return res.status(200).json({ message: 'ลบถูกใจพี่เลี้ยงสำเร็จ' });
  } catch (error) {
    console.error("Error removing favorite sitter:", error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
};

/**
 * ดึงข้อมูล Favorite_Sitters ของสมาชิก พร้อมกับข้อมูลชื่อและนามสกุลของพี่เลี้ยง
 */
exports.getFavoriteSitters = async (req, res) => {
  const { member_id } = req.params;
  try {
    const query = `
      SELECT f.favorite_id, f.member_id, f.sitter_id, 
             p.first_name, p.last_name, p.profile_image
      FROM Favorite_Sitters f
      JOIN Pet_Sitters p ON f.sitter_id = p.sitter_id
      WHERE f.member_id = ?
    `;
    const favorites = await db.query(query, [member_id]);
    return res.status(200).json({ favorites });
  } catch (error) {
    console.error("Error fetching favorite sitters:", error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
};
// สร้างรีวิว (Create Review)
exports.createReview = async (req, res) => {
  const { booking_id, member_id, sitter_id, rating, review_text } = req.body;

  // ตรวจสอบว่ามี member_id และ review_text
  if (member_id === undefined || member_id === null) {
    return res.status(400).json({ message: "member_id จำเป็นต้องระบุ" });
  }

  try {
    // ตรวจสอบว่า rating อยู่ในช่วง 1 ถึง 5 หรือไม่
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating ต้องอยู่ในช่วง 1 ถึง 5" });
    }

    const insertReviewQuery = `
      INSERT INTO Reviews (booking_id, member_id, sitter_id, rating, review_text)
      VALUES (?, ?, ?, ?, ?)
    `;
    const result = await db.query(insertReviewQuery, [
      booking_id,
      member_id,
      sitter_id,
      rating,
      review_text || null,
    ]);

    return res.status(200).json({
      message: "สร้างรีวิวสำเร็จ",
      review_id: result.insertId,
    });
  } catch (error) {
    console.error("Error creating review:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
};

// ลบรีวิว (Delete Review)
exports.deleteReview = async (req, res) => {
  const { review_id, member_id } = req.params;
  try {
    const reviewResult = await db.query(
      'SELECT * FROM Reviews WHERE review_id = ? AND member_id = ?',
      [review_id, member_id]
    );
    if (reviewResult.length === 0) {
      return res.status(404).json({ message: "รีวิวไม่พบหรือไม่ใช่ของคุณ" });
    }
    await db.query('DELETE FROM Reviews WHERE review_id = ?', [review_id]);
    return res.status(200).json({ message: "ลบรีวิวสำเร็จ" });
  } catch (error) {
    console.error("Error deleting review:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
};

exports.getReviewsForSitter = async (req, res) => {
  const { sitter_id } = req.params;
  try {
    // ดึงรีวิวทั้งหมดสำหรับ sitter_id ที่ระบุ
    const reviews = await db.query("SELECT * FROM Reviews WHERE sitter_id = ?", [sitter_id]);

    // คำนวณค่าเฉลี่ย rating
    let averageRating = 0;
    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
      averageRating = sum / reviews.length;
    }

    return res.status(200).json({
      message: "ดึงรีวิวของพี่เลี้ยงเรียบร้อยแล้ว",
      reviews,
      averageRating,
    });
  } catch (error) {
    console.error("Error fetching reviews for sitter:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
};