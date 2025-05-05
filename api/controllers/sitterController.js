const db = require('../db');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// ใช้ memoryStorage เพื่อเก็บไฟล์ใน memory
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * Helper function แปลงไฟล์จาก Buffer เป็น Base64 string
 */
function bufferToBase64(buffer) {
    return buffer.toString('base64');
}

/**
 * Update Profile Sitter (รวมอัปโหลดรูปไปยัง ImgBB ภายในฟังก์ชันเดียว)
 * รับข้อมูลผ่าน multipart/form-data (สำหรับไฟล์ใน field "image")
 */
exports.uploadSitterImage = async (req, res) => {
    try {
        const { sitter_id, type } = req.body; // type: 'profile', 'face', 'idcard'
        if (!sitter_id || !type) {
            return res.status(400).json({ message: "กรุณาระบุ sitter_id และ type ของรูป" });
        }
        if (!req.file) {
            return res.status(400).json({ message: "ไม่มีไฟล์รูปภาพ" });
        }

        const base64Image = req.file.buffer.toString('base64');
        const apiKey = 'af23e8c14cbf97c99b6e3bbbe3d6aefa';
        const expiration = 0;
        const imgbbUrl = `https://api.imgbb.com/1/upload?key=${apiKey}&expiration=${expiration}`;

        const params = new URLSearchParams();
        params.append('image', base64Image);

        const imgbbResponse = await fetch(imgbbUrl, { method: 'POST', body: params });
        const imgbbData = await imgbbResponse.json();
        if (!imgbbResponse.ok || !imgbbData.success) {
            return res.status(500).json({ message: "ImgBB upload failed", error: imgbbData });
        }
        const imageUrl = imgbbData.data.url;

        // เลือก column ที่จะอัปเดตตาม type
        let updateField;
        switch (type) {
            case 'profile':
                updateField = 'profile_image';
                break;
            case 'face':
                updateField = 'face_image';
                break;
            case 'idcard':
                updateField = 'id_card_image';
                break;
            default:
                return res.status(400).json({ message: "ประเภทของรูปไม่ถูกต้อง" });
        }

        const updateQuery = `UPDATE Pet_Sitters SET ${updateField} = ?, updated_at = CURRENT_TIMESTAMP WHERE sitter_id = ?`;
        const updateResult = await db.query(updateQuery, [imageUrl, sitter_id]);
        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ message: "ไม่พบพี่เลี้ยงที่ต้องการอัปเดต" });
        }
        return res.status(200).json({ message: "อัปโหลดรูปสำเร็จ", url: imageUrl });
    } catch (error) {
        console.error("uploadSitterImage error:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์", error: error.message });
    }
};

/**
 * Update Profile Sitter
 * รองรับทั้งการส่งไฟล์ผ่าน req.file (อัปโหลดไปยัง ImgBB) และการส่ง URL โดยตรงใน req.body.profile_image
 */
exports.updateProfileSitter = async (req, res) => {
    try {
        const {
            sitter_id,
            first_name,
            last_name,
            phone,
            address,
            province,
            amphure,
            tambon,
            experience,
            profile_image // กรณีไม่มีไฟล์อัปโหลด แต่มี URL ส่งมาแทน
        } = req.body;

        if (!sitter_id || !first_name || !last_name || !phone) {
            return res.status(400).json({ message: "กรุณากรอกข้อมูลที่จำเป็นให้ครบ" });
        }

        let profileImageUrl = null;
        if (req.file) {
            // อัปโหลดไฟล์ไปยัง ImgBB API
            const base64Image = req.file.buffer.toString('base64');
            const apiKey = 'af23e8c14cbf97c99b6e3bbbe3d6aefa';
            const expiration = 0;
            const imgbbUrl = `https://api.imgbb.com/1/upload?key=${apiKey}&expiration=${expiration}`;

            const params = new URLSearchParams();
            params.append('image', base64Image);

            const imgbbResponse = await fetch(imgbbUrl, {
                method: 'POST',
                body: params
            });
            const imgbbData = await imgbbResponse.json();
            if (!imgbbResponse.ok || !imgbbData.success) {
                console.error("ImgBB upload failed:", imgbbData);
                return res.status(500).json({ message: "ImgBB upload failed", error: imgbbData });
            }
            profileImageUrl = imgbbData.data.url;
        } else if (profile_image) {
            profileImageUrl = profile_image;
        }

        const addressVal = typeof address === 'undefined' ? null : address;
        const provinceVal = typeof province === 'undefined' ? null : province;
        const amphureVal = typeof amphure === 'undefined' ? null : amphure;
        const tambonVal = typeof tambon === 'undefined' ? null : tambon;
        const experienceVal = typeof experience === 'undefined' ? null : experience;

        const updateQuery = `
      UPDATE Pet_Sitters
      SET first_name = ?,
          last_name = ?,
          phone = ?,
          profile_image = ?,
          address = ?,
          province = ?,
          amphure = ?,
          tambon = ?,
          experience = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE sitter_id = ?
    `;
        const updateResult = await db.query(updateQuery, [
            first_name,
            last_name,
            phone,
            profileImageUrl,
            addressVal,
            provinceVal,
            amphureVal,
            tambonVal,
            experienceVal,
            sitter_id
        ]);

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ message: "ไม่พบพี่เลี้ยงที่ต้องการอัปเดต" });
        }

        const selectQuery = `SELECT * FROM Pet_Sitters WHERE sitter_id = ?`;
        const rows = await db.query(selectQuery, [sitter_id]);

        return res.status(200).json({
            message: "อัปเดตโปรไฟล์สำเร็จ",
            sitter: rows[0]
        });
    } catch (error) {
        console.error("Update Profile Sitter error:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};

/**
 * Register Sitter
 */
exports.registerSitter = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
        }

        const checkQuery = 'SELECT * FROM Pet_Sitters WHERE email = ?';
        const checkResult = await db.query(checkQuery, [email]);
        if (checkResult.length > 0) {
            return res.status(400).json({ message: 'อีเมลนี้ได้ลงทะเบียนไว้แล้ว' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const insertQuery = `
          INSERT INTO Pet_Sitters (
            email, password, first_name, last_name, phone, profile_image, address, province, amphure, tambon, experience, rating, verification_status, created_at, updated_at
          )
          VALUES (?, ?, '', '', NULL, NULL, '', '', '', '', '', NULL, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        const insertResult = await db.query(insertQuery, [email, hashedPassword]);
        const sitter_id = insertResult.insertId;

        // สร้าง OTP และกำหนดวันหมดอายุ (10 นาที)
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        const insertOtpQuery = `
          INSERT INTO Verify_OTP_Sitter (sitter_id, otp_code, expires_at, is_verified, created_at, updated_at)
          VALUES (?, ?, ?, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        await db.query(insertOtpQuery, [sitter_id, otp, expiresAt]);

        await sendOTPEmailSMTP(email, otp);

        return res.status(200).json({
            message: 'สมัครพี่เลี้ยงสำเร็จ โปรดยืนยัน OTP ที่ส่งไปทางอีเมล',
            sitter_id
        });
    } catch (error) {
        console.error("Register Sitter error:", error);
        return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
    }
};

/**
 * Helper function สำหรับสุ่ม OTP 6 หลัก
 */
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * ฟังก์ชันสำหรับส่งอีเมล OTP ผ่าน SMTP (ใช้ Nodemailer)
 */
async function sendOTPEmailSMTP(email, otp) {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: 'methasit6061@gmail.com',
            pass: 'glxb vlyf zmva cyqq',
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
 * Get Sitter
 */
exports.getSitter = async (req, res) => {
    try {
        const sitterId = req.params.sitter_id || (req.user && req.user.sitter_id);
        if (!sitterId) {
            return res.status(400).json({ message: "Sitter ID is required" });
        }

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
              verification_status,
              created_at,
              updated_at
            FROM Pet_Sitters
            WHERE sitter_id = ?
        `;
        const result = await db.query(query, [sitterId]);

        if (result.length === 0) {
            return res.status(404).json({ message: "ไม่พบข้อมูลพี่เลี้ยง" });
        }

        return res.status(200).json({ sitter: result[0] });
    } catch (error) {
        console.error("Get Sitter error:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};

/**
 * Verify OTP สำหรับพี่เลี้ยง
 */
exports.verifyOtp = async (req, res) => {
    const { sitter_id, otp_code } = req.body;

    try {
        const otpQuery = `
          SELECT * FROM Verify_OTP_Sitter
          WHERE sitter_id = ? AND otp_code = ? AND is_verified = FALSE
          ORDER BY created_at DESC LIMIT 1
        `;
        const otpResult = await db.query(otpQuery, [sitter_id, otp_code]);

        if (otpResult.length === 0) {
            return res.status(400).json({ message: 'รหัส OTP ไม่ถูกต้อง' });
        }

        const otpRecord = otpResult[0];

        if (new Date() > new Date(otpRecord.expires_at)) {
            return res.status(400).json({ message: 'รหัส OTP หมดอายุแล้ว' });
        }

        const updateOtpQuery = `
          UPDATE Verify_OTP_Sitter
          SET is_verified = TRUE, updated_at = CURRENT_TIMESTAMP
          WHERE otp_id = ?
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

/**
 * Verify Account (ส่งเอกสารยืนยันตัวตน)
 */
exports.verifyAccount = async (req, res) => {
    try {
        const { sitter_id, face_image, id_card_image } = req.body;

        if (!sitter_id || !face_image || !id_card_image) {
            return res.status(400).json({ message: "กรุณากรอกข้อมูลเอกสารที่จำเป็นให้ครบ" });
        }

        const updateQuery = `
          UPDATE Pet_Sitters
          SET face_image = ?,
              id_card_image = ?,
              verification_status = 'pending',
              updated_at = CURRENT_TIMESTAMP
          WHERE sitter_id = ?
        `;
        await db.query(updateQuery, [face_image, id_card_image, sitter_id]);

        const selectQuery = `
          SELECT sitter_id, verification_status, face_image, id_card_image, updated_at
          FROM Pet_Sitters
          WHERE sitter_id = ?
        `;
        const rows = await db.query(selectQuery, [sitter_id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: "ไม่พบพี่เลี้ยงที่ต้องการอัปโหลดเอกสาร" });
        }

        return res.status(200).json({
            message: "ส่งเอกสารยืนยันตัวตนเรียบร้อยแล้ว กรุณารอการตรวจสอบ",
            sitter: rows[0]
        });
    } catch (error) {
        console.error("Verify Account error:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};

/**
 * Login Sitter
 */
exports.loginSitter = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "กรุณาใส่อีเมลและรหัสผ่าน" });
        }

        const query = `SELECT * FROM Pet_Sitters WHERE email = ?`;
        const result = await db.query(query, [email]);

        if (result.length === 0) {
            return res.status(400).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
        }

        const sitter = result[0];

        const isPasswordValid = await bcrypt.compare(password, sitter.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
        }

        if (sitter.verification_status !== "approved") {
            return res.status(403).json({ message: "บัญชีของคุณยังไม่ได้รับการอนุมัติ" });
        }

        return res.status(200).json({
            message: "เข้าสู่ระบบสำเร็จ",
            sitter: {
                sitter_id: sitter.sitter_id,
                first_name: sitter.first_name,
                last_name: sitter.last_name,
                email: sitter.email,
                phone: sitter.phone,
                profile_image: sitter.profile_image,
                verification_status: sitter.verification_status,
            }
        });
    } catch (error) {
        console.error("Login Sitter error:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};

/**
 * Get Jobs สำหรับพี่เลี้ยง
 */
exports.getJobs = async (req, res) => {
    try {
        const sitterId = req.params.sitter_id;
        if (!sitterId) {
            return res.status(400).json({ message: "กรุณาระบุ Sitter ID" });
        }

        const query = `
        SELECT 
          b.booking_id,
          b.member_id,
          b.sitter_id,
          b.pet_type_id,
          b.pet_breed,
          b.sitter_service_id,
          b.service_type_id,
          b.start_date,
          b.end_date,
          b.status,
          b.agreement_status,
          b.total_price,
          b.payment_status,
          b.slip_image,
          b.created_at,
          b.updated_at,
          ss.description AS sitter_service_description
        FROM Bookings b
        LEFT JOIN Sitter_Services ss ON b.sitter_service_id = ss.sitter_service_id
        WHERE b.sitter_id = ?
        ORDER BY b.created_at DESC;
      `;

        const result = await db.query(query, [sitterId]);
        return res.status(200).json({ jobs: result });
    } catch (error) {
        console.error("Error fetching jobs:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};

/**
 * Create Sitter Service (Add Job)
 */
exports.addJob = async (req, res) => {
    try {
        const {
            sitter_id,
            service_type_id,
            pet_type_id,
            price,
            pricing_unit,
            duration,
            description,
            service_image
        } = req.body;

        if (!sitter_id || !service_type_id || !pet_type_id || !price || !pricing_unit) {
            return res.status(400).json({ message: "กรุณากรอกข้อมูลที่จำเป็นให้ครบ" });
        }

        const insertQuery = `
        INSERT INTO Sitter_Services (
          sitter_id,
          service_type_id,
          pet_type_id,
          price,
          pricing_unit,
          duration,
          description,
          service_image,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
        const values = [
            sitter_id,
            service_type_id,
            pet_type_id,
            price,
            pricing_unit,
            duration || null,
            description || null,
            service_image || null
        ];

        console.log("Request body:", req.body);
        console.log("Values array for INSERT:", values);

        const result = await db.query(insertQuery, values);
        const insertedId = result.insertId;

        const selectQuery = `SELECT * FROM Sitter_Services WHERE sitter_service_id = ?`;
        const rows = await db.query(selectQuery, [insertedId]);

        return res.status(200).json({
            message: "เพิ่มงานเรียบร้อยแล้ว",
            job: rows[0]
        });
    } catch (error) {
        console.error("Add Job error:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};

/**
 * Update Sitter Service
 */
exports.updateSitterService = async (req, res) => {
    try {
        const { sitter_service_id, price, duration, description, service_image } = req.body;

        if (!sitter_service_id) {
            return res.status(400).json({ message: "กรุณาระบุรหัสงาน" });
        }

        const updateQuery = `
        UPDATE Sitter_Services
        SET price = ?,
            duration = ?,
            description = ?,
            service_image = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE sitter_service_id = ?
        `;
        const updateResult = await db.query(updateQuery, [price, duration, description, service_image, sitter_service_id]);
        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ message: "ไม่พบงานที่ต้องการแก้ไข" });
        }
        const selectQuery = `SELECT * FROM Sitter_Services WHERE sitter_service_id = ?`;
        const rows = await db.query(selectQuery, [sitter_service_id]);

        return res.status(200).json({
            message: "แก้ไขงานสำเร็จ",
            service: rows[0]
        });
    } catch (error) {
        console.error("Update Sitter Service error:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};

/**
 * Delete Sitter Service
 */
exports.deleteSitterService = async (req, res) => {
    try {
        const { sitter_service_id } = req.params;
        if (!sitter_service_id) {
            return res.status(400).json({ message: "กรุณาระบุรหัสงาน" });
        }

        const selectQuery = `SELECT * FROM Sitter_Services WHERE sitter_service_id = ?`;
        const rows = await db.query(selectQuery, [sitter_service_id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "ไม่พบงานที่ต้องการลบ" });
        }
        const deletedService = rows[0];

        const deleteQuery = `DELETE FROM Sitter_Services WHERE sitter_service_id = ?`;
        await db.query(deleteQuery, [sitter_service_id]);

        return res.status(200).json({
            message: "ลบงานเรียบร้อยแล้ว",
            service: deletedService
        });
    } catch (error) {
        console.error("Delete Sitter Service error:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์", error: error.message });
    }
};

/**
 * Get Service Types
 */
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
        return res.status(200).json({ serviceTypes: result });
    } catch (error) {
        console.error("Error fetching service types:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Get Pet Types สำหรับพี่เลี้ยง
 */
exports.getPetTypesForSitter = async (req, res) => {
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
        return res.status(200).json({ petTypes: result });
    } catch (error) {
        console.error("Error fetching pet types for sitter:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};

/**
 * Get Sitter Jobs (ร่วมกับข้อมูลของสมาชิก)
 */
exports.getSitterJobs = async (req, res) => {
    try {
        const sitterId = req.params.sitter_id;
        if (!sitterId) {
            return res.status(400).json({ message: "กรุณาระบุ Sitter ID" });
        }

        const query = `
        SELECT 
          b.booking_id,
          b.member_id,
          b.sitter_id,
          b.pet_type_id,
          b.pet_breed,
          b.sitter_service_id,
          b.start_date,
          b.end_date,
          b.status,
          b.total_price,
          b.payment_status,
          b.created_at,
          b.updated_at,
          COALESCE(m.first_name, '') AS first_name,
          COALESCE(m.last_name, '') AS last_name
        FROM Bookings b
        LEFT JOIN Members m ON b.member_id = m.member_id
        WHERE b.sitter_id = ?
        ORDER BY b.created_at DESC
      `;
        const result = await db.query(query, [sitterId]);
        console.log("Fetched sitter jobs:", result);
        return res.status(200).json({ jobs: result });
    } catch (error) {
        console.error("Error fetching sitter jobs:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};

/**
 * Accept Job
 */
exports.acceptJob = async (req, res) => {
    try {
        const { booking_id, sitter_id } = req.body;

        if (!booking_id || !sitter_id) {
            return res.status(400).json({ message: "กรุณาระบุ booking_id และ sitter_id" });
        }

        const updateQuery = `
        UPDATE Bookings
        SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP
        WHERE booking_id = ? AND sitter_id = ? AND status != 'confirmed'
        `;
        const updateResult = await db.query(updateQuery, [booking_id, sitter_id]);

        if (updateResult.affectedRows === 0) {
            return res.status(400).json({ message: "งานนี้ถูกรับงานแล้ว หรือคุณไม่มีสิทธิ์รับงานนี้" });
        }

        const selectQuery = `SELECT * FROM Bookings WHERE booking_id = ?`;
        const rows = await db.query(selectQuery, [booking_id]);

        return res.status(200).json({
            message: "รับงานเรียบร้อยแล้ว",
            job: rows[0]
        });
    } catch (error) {
        console.error("Accept Job error:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};

/**
 * Get Income Stats
 */
exports.getIncomeStats = async (req, res) => {
    try {
        const sitterId = req.params.sitter_id;
        if (!sitterId) {
            return res.status(400).json({ message: "กรุณาระบุ Sitter ID" });
        }

        const query = `
        SELECT 
          bs.sitter_service_id,
          st.short_name,
          CAST(SUM(bs.total_price) AS DECIMAL(10,2)) AS total_income,
          COUNT(*) AS job_count
        FROM Bookings bs
        LEFT JOIN Service_Types st ON bs.sitter_service_id = st.service_type_id
        WHERE bs.sitter_id = ?
          AND bs.status = 'confirmed'
          AND bs.payment_status = 'paid'
        GROUP BY bs.sitter_service_id, st.short_name
        ORDER BY total_income DESC
      `;
        const result = await db.query(query, [sitterId]);
        return res.status(200).json({ incomeStats: result });
    } catch (error) {
        console.error("Error fetching income stats:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};

/**
 * Get Pie Income Stats
 */
exports.getPieIncomeStats = async (req, res) => {
    try {
        const sitterId = req.params.sitter_id;
        if (!sitterId) {
            return res.status(400).json({ message: "กรุณาระบุ Sitter ID" });
        }

        const statsQuery = `
        SELECT 
          COUNT(*) AS jobs_completed,
          CAST(COALESCE(SUM(total_price), 0) AS DECIMAL(10,2)) AS total_income
        FROM Bookings
        WHERE sitter_id = ?
          AND status = 'confirmed'
          AND payment_status = 'paid'
      `;
        const statsResult = await db.query(statsQuery, [sitterId]);
        const statsRow = statsResult[0];
        const stats = {
            jobsCompleted: statsRow.jobs_completed.toString(),
            totalIncome: statsRow.total_income.toString()
        };

        const breakdownQuery = `
        SELECT 
          ss.sitter_service_id,
          ss.description,
          st.service_type_id,
          COALESCE(st.short_name, 'N/A') AS short_name,
          CAST(COALESCE(SUM(bs.total_price), 0) AS DECIMAL(10,2)) AS total_income,
          COUNT(*) AS job_count
        FROM Bookings bs
        JOIN Sitter_Services ss ON bs.sitter_service_id = ss.sitter_service_id
        LEFT JOIN Service_Types st ON ss.service_type_id = st.service_type_id
        WHERE bs.sitter_id = ?
          AND bs.status = 'confirmed'
          AND bs.payment_status = 'paid'
        GROUP BY ss.sitter_service_id, st.service_type_id, st.short_name, ss.description
        ORDER BY total_income DESC
      `;
        const breakdownResult = await db.query(breakdownQuery, [sitterId]);
        const incomeStats = breakdownResult.map(row => ({
            sitter_service_id: row.sitter_service_id,
            service_type_id: row.service_type_id,
            short_name: row.short_name,
            description: row.description,
            total_income: row.total_income.toString(),
            job_count: row.job_count.toString()
        }));

        return res.status(200).json({ stats, incomeStats });
    } catch (error) {
        console.error("Error fetching pie income stats:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};

/**
 * Cancel Job
 */
exports.cancelJob = async (req, res) => {
    try {
        const { booking_id, sitter_id } = req.body;

        if (!booking_id || !sitter_id) {
            return res.status(400).json({ message: "กรุณาระบุ booking_id และ sitter_id" });
        }

        const checkQuery = `SELECT status FROM Bookings WHERE booking_id = ? AND sitter_id = ?`;
        const checkResult = await db.query(checkQuery, [booking_id, sitter_id]);
        if (checkResult.length === 0) {
            return res.status(404).json({ message: "ไม่พบงานที่ต้องการยกเลิก" });
        }
        const currentStatus = checkResult[0].status;
        if (currentStatus === "confirmed" || currentStatus === "cancelled") {
            return res.status(400).json({ message: "งานนี้ไม่สามารถยกเลิกได้" });
        }

        const updateQuery = `
            UPDATE Bookings
            SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
            WHERE booking_id = ? AND sitter_id = ?
        `;
        const updateResult = await db.query(updateQuery, [booking_id, sitter_id]);

        if (updateResult.affectedRows === 0) {
            return res.status(400).json({ message: "ไม่สามารถยกเลิกงานได้" });
        }

        const selectQuery = `SELECT * FROM Bookings WHERE booking_id = ?`;
        const rows = await db.query(selectQuery, [booking_id]);

        return res.status(200).json({
            message: "ยกเลิกงานเรียบร้อยแล้ว",
            job: rows[0]
        });
    } catch (error) {
        console.error("Cancel Job error:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};

/* Payment Methods APIs */

/**
 * Add Payment Method
 */
exports.addPaymentMethod = async (req, res) => {
    try {
        const { sitter_id, promptpay_number } = req.body;
        if (!sitter_id || !promptpay_number) {
            return res.status(400).json({ message: "กรุณาระบุข้อมูลที่จำเป็นให้ครบ" });
        }

        const insertQuery = `
        INSERT INTO Payment_Methods (sitter_id, promptpay_number, created_at, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
        const insertResult = await db.query(insertQuery, [sitter_id, promptpay_number]);
        const insertedId = insertResult.insertId;
        const selectQuery = `SELECT * FROM Payment_Methods WHERE payment_method_id = ?`;
        const rows = await db.query(selectQuery, [insertedId]);

        return res.status(200).json({
            message: "เพิ่มวิธีการชำระเงินเรียบร้อยแล้ว",
            paymentMethod: rows[0]
        });
    } catch (error) {
        console.error("Add Payment Method error:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};

/**
 * Update Payment Method
 */
exports.updatePaymentMethod = async (req, res) => {
    try {
        const { payment_method_id, promptpay_number } = req.body;
        if (!payment_method_id || !promptpay_number) {
            return res.status(400).json({ message: "กรุณาระบุข้อมูลที่ต้องการแก้ไขให้ครบ" });
        }

        const updateQuery = `
        UPDATE Payment_Methods
        SET promptpay_number = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE payment_method_id = ?
        `;
        const updateResult = await db.query(updateQuery, [promptpay_number, payment_method_id]);
        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ message: "ไม่พบวิธีการชำระเงินที่ต้องการแก้ไข" });
        }
        const selectQuery = `SELECT * FROM Payment_Methods WHERE payment_method_id = ?`;
        const rows = await db.query(selectQuery, [payment_method_id]);

        return res.status(200).json({
            message: "แก้ไขวิธีการชำระเงินเรียบร้อยแล้ว",
            paymentMethod: rows[0]
        });
    } catch (error) {
        console.error("Update Payment Method error:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};

/**
 * Delete Payment Method
 */
exports.deletePaymentMethod = async (req, res) => {
    try {
        const { payment_method_id } = req.params;
        if (!payment_method_id) {
            return res.status(400).json({ message: "กรุณาระบุรหัสวิธีการชำระเงินที่ต้องการลบ" });
        }

        const selectQuery = `SELECT * FROM Payment_Methods WHERE payment_method_id = ?`;
        const rows = await db.query(selectQuery, [payment_method_id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "ไม่พบวิธีการชำระเงินที่ต้องการลบ" });
        }
        const deletedPaymentMethod = rows[0];

        const deleteQuery = `DELETE FROM Payment_Methods WHERE payment_method_id = ?`;
        await db.query(deleteQuery, [payment_method_id]);

        return res.status(200).json({
            message: "ลบวิธีการชำระเงินเรียบร้อยแล้ว",
            paymentMethod: deletedPaymentMethod
        });
    } catch (error) {
        console.error("Delete Payment Method error:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};

/**
 * Get Payment Methods
 */
exports.getPaymentMethods = async (req, res) => {
    try {
        const { sitter_id } = req.params;
        if (!sitter_id) {
            return res.status(400).json({ message: "กรุณาระบุ Sitter ID" });
        }

        const query = `
        SELECT 
          payment_method_id,
          sitter_id,
          promptpay_number,
          created_at,
          updated_at
        FROM Payment_Methods
        WHERE sitter_id = ?
        ORDER BY created_at DESC
      `;
        const result = await db.query(query, [sitter_id]);
        return res.status(200).json({ paymentMethods: result });
    } catch (error) {
        console.error("Error fetching payment methods:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};

// ในไฟล์ controllers/sitterController.js
exports.getSitterServices = async (req, res) => {
    try {
        const { sitter_id } = req.params;
        if (!sitter_id) {
            return res.status(400).json({ message: "กรุณาระบุ Sitter ID" });
        }
        const query = `
        SELECT 
          sitter_service_id,
          sitter_id,
          service_type_id,
          pet_type_id,
          price,
          pricing_unit,
          duration,
          description,
          service_image,
          created_at,
          updated_at
        FROM Sitter_Services
        WHERE sitter_id = ?
        ORDER BY created_at DESC
      `;
        const services = await db.query(query, [sitter_id]);
        return res.status(200).json({ services });
    } catch (error) {
        console.error("Error fetching sitter services:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

exports.deleteOwnService = async (req, res) => {
    try {
        const { sitter_service_id } = req.params;
        const { sitter_id } = req.body; // ตรวจสอบว่า requester คือเจ้าของบริการ

        if (!sitter_service_id || !sitter_id) {
            return res.status(400).json({ message: "กรุณาระบุรหัสงานและ sitter_id" });
        }

        // ตรวจสอบว่าบริการที่ต้องการลบนั้นมีอยู่และเป็นของพี่เลี้ยงที่ร้องขอ
        const selectQuery = `SELECT * FROM Sitter_Services WHERE sitter_service_id = ?`;
        const rows = await db.query(selectQuery, [sitter_service_id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "ไม่พบงานที่ต้องการลบ" });
        }
        const service = rows[0];

        // ตรวจสอบความเป็นเจ้าของ (เปรียบเทียบ sitter_id ใน service กับ sitter_id ที่ส่งมา)
        if (parseInt(service.sitter_id) !== parseInt(sitter_id)) {
            return res.status(403).json({ message: "คุณไม่มีสิทธิ์ลบบริการนี้" });
        }

        // ดำเนินการลบบริการ
        const deleteQuery = `DELETE FROM Sitter_Services WHERE sitter_service_id = ?`;
        await db.query(deleteQuery, [sitter_service_id]);

        return res.status(200).json({
            message: "ลบบริการเรียบร้อยแล้ว",
            service
        });
    } catch (error) {
        console.error("Delete Own Service error:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};