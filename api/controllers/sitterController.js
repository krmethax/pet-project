// controllers/sitterControllers.js

const db = require('../db'); // โมดูลสำหรับเชื่อมต่อ PostgreSQL
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

/**
 * Endpoint สำหรับสมัครพี่เลี้ยง (Register Sitter)
 * รับค่า email กับ password ใน request body
 * จากนั้นเข้ารหัส password ด้วย bcrypt แล้วสร้าง record ในตาราง Pet_Sitters
 * คืนค่า sitter_id ที่สร้างขึ้นใหม่
 */
exports.registerSitter = async (req, res) => {
    try {
        const { email, password } = req.body;

        // ตรวจสอบข้อมูลเบื้องต้น
        if (!email || !password) {
            return res.status(400).json({ message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
        }

        // ตรวจสอบว่ามีอีเมลนี้อยู่ในระบบหรือไม่
        const checkResult = await db.query('SELECT * FROM Pet_Sitters WHERE email = $1', [email]);
        if (checkResult.rows.length > 0) {
            return res.status(400).json({ message: 'อีเมลนี้ได้ลงทะเบียนไว้แล้ว' });
        }

        // เข้ารหัสรหัสผ่านด้วย bcrypt
        const hashedPassword = await bcrypt.hash(password, 10);

        // สร้าง record ใหม่ในตาราง Pet_Sitters  
        // ใช้ NULL สำหรับ phone และ profile_image แทนที่จะเป็นค่าว่าง
        const insertQuery = `
        INSERT INTO Pet_Sitters (
          email, password, first_name, last_name, phone, profile_image, address, province, amphure, tambon, experience, rating, verification_status
        )
        VALUES ($1, $2, '', '', NULL, NULL, '', '', '', '', '', NULL, 'pending')
        RETURNING sitter_id
      `;
        const values = [email, hashedPassword];
        const result = await db.query(insertQuery, values);
        const sitter_id = result.rows[0].sitter_id;

        // สร้าง OTP และกำหนดวันหมดอายุ (เช่น 10 นาที)
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 นาทีจากนี้

        // บันทึก OTP ลงในตาราง Verify_OTP_Sitter โดยใช้ sitter_id
        const insertOtpQuery = `
          INSERT INTO Verify_OTP_Sitter (sitter_id, otp_code, expires_at, is_verified, created_at, updated_at)
          VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        await db.query(insertOtpQuery, [sitter_id, otp, expiresAt]);

        // ส่ง OTP ไปที่อีเมลของผู้สมัคร
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
 * Endpoint สำหรับอัปเดตโปรไฟล์พี่เลี้ยง (Update Profile Sitter)
 * รับข้อมูลที่จำเป็นใน request body (รวมทั้งที่อยู่และข้อมูลส่วนตัว)
 * จากนั้นอัปเดตข้อมูลในตาราง Pet_Sitters โดยใช้ sitter_id เป็นตัวระบุ
 */
exports.updateProfileSitter = async (req, res) => {
    try {
        const {
            sitter_id,
            first_name,
            last_name,
            phone,
            profile_image,
            address,
            province,
            amphure,
            tambon,
            experience
        } = req.body;

        // ตรวจสอบข้อมูลที่จำเป็น
        if (!sitter_id || !first_name || !last_name || !phone) {
            return res.status(400).json({ message: "กรุณากรอกข้อมูลที่จำเป็นให้ครบ" });
        }

        // อัปเดตข้อมูลในตาราง Pet_Sitters
        const updateQuery = `
          UPDATE Pet_Sitters
          SET first_name = $1,
              last_name = $2,
              phone = $3,
              profile_image = $4,
              address = $5,
              province = $6,
              amphure = $7,
              tambon = $8,
              experience = $9,
              updated_at = CURRENT_TIMESTAMP
          WHERE sitter_id = $10
          RETURNING *
        `;
        const values = [
            first_name,
            last_name,
            phone,
            profile_image,
            address,
            province,
            amphure,
            tambon,
            experience,
            sitter_id
        ];
        const result = await db.query(updateQuery, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "ไม่พบพี่เลี้ยงที่ต้องการอัปเดต" });
        }

        return res.status(200).json({
            message: "อัปเดตโปรไฟล์สำเร็จ",
            sitter: result.rows[0]
        });
    } catch (error) {
        console.error("Update Profile Sitter error:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};

/**
 * Endpoint สำหรับดึงข้อมูลพี่เลี้ยง (Get Sitter)
 * สามารถเรียกใช้โดยส่ง sitter_id ผ่าน URL parameter หรือใช้ข้อมูลจาก req.user
 */
exports.getSitter = async (req, res) => {
    try {
        // รับ sitter_id จาก URL parameter หรือจาก req.user (ถ้ามี middleware authentication)
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
            WHERE sitter_id = $1
        `;
        const result = await db.query(query, [sitterId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "ไม่พบข้อมูลพี่เลี้ยง" });
        }

        return res.status(200).json({ sitter: result.rows[0] });
    } catch (error) {
        console.error("Get Sitter error:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};

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

/**
 * Endpoint สำหรับยืนยัน OTP สำหรับพี่เลี้ยง (Verify OTP)
 * ปรับให้ใช้ sitter_id แทน member_id
 */
exports.verifyOtp = async (req, res) => {
    // รับ sitter_id และ otp_code จาก request body
    const { sitter_id, otp_code } = req.body;

    try {
        // ดึงข้อมูล OTP จากตาราง Verify_OTP_Sitter
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

        // ตรวจสอบว่า OTP หมดอายุหรือยัง
        if (new Date() > new Date(otpRecord.expires_at)) {
            return res.status(400).json({ message: 'รหัส OTP หมดอายุแล้ว' });
        }

        // อัปเดตสถานะ OTP ให้เป็น verified
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

/**
 * Endpoint สำหรับส่งเอกสารยืนยันตัวตนของพี่เลี้ยง (Verify Account)
 * ในฐานข้อมูลใหม่ เราได้รวมข้อมูล Verify_Account เข้าไปในตาราง Pet_Sitters แล้ว
 * ดังนั้น endpoint นี้จะทำการอัปเดตข้อมูลในตาราง Pet_Sitters โดยตั้งค่า face_image, id_card_image และ verification_status เป็น 'pending'
 */
exports.verifyAccount = async (req, res) => {
    try {
        const { sitter_id, face_image, id_card_image } = req.body;

        // ตรวจสอบข้อมูลที่จำเป็น
        if (!sitter_id || !face_image || !id_card_image) {
            return res.status(400).json({ message: "กรุณากรอกข้อมูลเอกสารที่จำเป็นให้ครบ" });
        }

        const updateQuery = `
          UPDATE Pet_Sitters
          SET face_image = $1,
              id_card_image = $2,
              verification_status = 'pending',
              updated_at = CURRENT_TIMESTAMP
          WHERE sitter_id = $3
          RETURNING sitter_id, verification_status, face_image, id_card_image, updated_at
        `;
        const values = [face_image, id_card_image, sitter_id];
        const result = await db.query(updateQuery, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "ไม่พบพี่เลี้ยงที่ต้องการอัปโหลดเอกสาร" });
        }

        return res.status(200).json({
            message: "ส่งเอกสารยืนยันตัวตนเรียบร้อยแล้ว กรุณารอการตรวจสอบ",
            sitter: result.rows[0]
        });
    } catch (error) {
        console.error("Verify Account error:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};

exports.loginSitter = async (req, res) => {
    try {
        const { email, password } = req.body;

        // ตรวจสอบข้อมูลเบื้องต้น
        if (!email || !password) {
            return res.status(400).json({ message: "กรุณาใส่อีเมลและรหัสผ่าน" });
        }

        // ดึงข้อมูลพี่เลี้ยงจากตาราง Pet_Sitters โดยใช้ email
        const query = `SELECT * FROM Pet_Sitters WHERE email = $1`;
        const result = await db.query(query, [email]);

        if (result.rows.length === 0) {
            return res.status(400).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
        }

        const sitter = result.rows[0];

        // ตรวจสอบรหัสผ่านด้วย bcrypt
        const isPasswordValid = await bcrypt.compare(password, sitter.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
        }

        // ตรวจสอบสถานะการยืนยันตัวตน
        if (sitter.verification_status !== "approved") {
            return res.status(403).json({ message: "บัญชีของคุณยังไม่ได้รับการอนุมัติ" });
        }

        // หากตรวจสอบครบทุกอย่าง ให้ส่ง response login สำเร็จ
        return res.status(200).json({
            message: "เข้าสู่ระบบสำเร็จ",
            sitter: {
                sitter_id: sitter.sitter_id,
                first_name: sitter.first_name,
                last_name: sitter.last_name,
                email: sitter.email,
                phone: sitter.phone,
                profile_image: sitter.profile_image, // คุณอาจแปลงเป็น base64 ในฝั่ง client
                verification_status: sitter.verification_status,
            }
        });

    } catch (error) {
        console.error("Login Sitter error:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};

exports.getJobs = async (req, res) => {
    try {
        const sitterId = req.params.sitter_id;
        if (!sitterId) {
            return res.status(400).json({ message: "Sitter ID is required" });
        }

        const query = `
        SELECT 
          booking_id,
          member_id,
          sitter_id,
          pet_type_id,
          pet_breed,
          sitter_service_id,
          start_date,
          end_date,
          status,
          total_price,
          payment_status,
          created_at,
          updated_at
        FROM Bookings
        WHERE sitter_id = $1
        ORDER BY created_at DESC
      `;
        const result = await db.query(query, [sitterId]);

        // หากไม่มีงาน ส่งกลับ response 200 พร้อม empty array
        return res.status(200).json({ jobs: result.rows });
    } catch (error) {
        console.error("Error fetching jobs:", error);
        return res.status(500).json({ message: "Internal server error" });
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

exports.createSitterService = async (req, res) => {
    try {
        const { sitter_id, service_type_id, price, duration, description, service_image } = req.body;

        // ตรวจสอบข้อมูลที่จำเป็น
        if (!sitter_id || !service_type_id || !price || !duration) {
            return res.status(400).json({ message: "กรุณากรอกข้อมูลที่จำเป็นให้ครบ" });
        }

        // หากต้องการเก็บรูปภาพในฐานข้อมูลในรูปแบบ BYTEA คุณสามารถแปลง Base64 เป็น Buffer ได้เช่นนี้:
        // const imageBuffer = service_image ? Buffer.from(service_image, 'base64') : null;
        // แต่ในที่นี้ สมมติว่าเราใช้ service_image ตรง ๆ

        const insertQuery = `
        INSERT INTO Sitter_Services (
          sitter_id, service_type_id, price, duration, description, service_image, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
        const values = [sitter_id, service_type_id, price, duration, description || null, service_image || null];

        const result = await db.query(insertQuery, values);

        return res.status(200).json({
            message: "สร้างบริการสำเร็จ",
            service: result.rows[0]
        });
    } catch (error) {
        console.error("Create Sitter Service error:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
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
 * Endpoint สำหรับเพิ่มงาน (Add Job)
 * รับข้อมูลที่จำเป็นใน request body แล้วเพิ่มข้อมูลลงในตาราง Sitter_Services
 */
exports.addJob = async (req, res) => {
    try {
        // รับข้อมูลใหม่เพิ่มเติม: pet_type_id, pricing_unit, service_image
        const {
            sitter_id,
            service_type_id,
            pet_type_id,
            price,
            pricing_unit,
            duration, // หากบริการที่คิดราคาแบบบางประเภทมีระยะเวลา ให้ส่งมาด้วย
            description,
            service_image // สามารถส่งเป็น Base64 หรือ URL ตามที่คุณออกแบบไว้
        } = req.body;

        // ตรวจสอบข้อมูลที่จำเป็น (ปรับตามความต้องการ)
        if (!sitter_id || !service_type_id || !pet_type_id || !price || !pricing_unit) {
            return res.status(400).json({ message: "กรุณากรอกข้อมูลที่จำเป็นให้ครบ" });
        }

        // สร้าง record ใหม่ในตาราง Sitter_Services
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
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

        const result = await db.query(insertQuery, values);

        return res.status(200).json({
            message: "เพิ่มงานเรียบร้อยแล้ว",
            job: result.rows[0]
        });
    } catch (error) {
        console.error("Add Job error:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};

exports.getCreatedJobs = async (req, res) => {
    try {
        const sitter_id = req.params.sitter_id;
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
        WHERE sitter_id = $1
        ORDER BY created_at DESC
      `;
        const result = await db.query(query, [sitter_id]);

        return res.status(200).json({ jobs: result.rows });
    } catch (error) {
        console.error("Error fetching created jobs:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};

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
        return res.status(200).json({ petTypes: result.rows });
    } catch (error) {
        console.error("Error fetching pet types for sitter:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};

exports.getLatestCompletedJobs = async (req, res) => {
    try {
        const query = `
        SELECT 
          booking_id,
          member_id,
          sitter_id,
          pet_type_id,
          pet_breed,
          sitter_service_id,
          start_date,
          end_date,
          status,
          total_price,
          payment_status,
          created_at,
          updated_at
        FROM Bookings
        WHERE status = 'completed'
          AND payment_status = 'paid'
        ORDER BY updated_at DESC
        LIMIT 10;
      `;
        const result = await db.query(query);
        return res.status(200).json({
            message: "ดึงงานล่าสุดที่สำเร็จและโอนเงินแล้วสำเร็จ",
            jobs: result.rows
        });
    } catch (error) {
        console.error("Error fetching latest completed jobs:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};

exports.updateSitterService = async (req, res) => {
    try {
      const { sitter_service_id, price, duration, description, service_image } = req.body;
  
      if (!sitter_service_id) {
        return res.status(400).json({ message: "กรุณาระบุรหัสงาน" });
      }
  
      const updateQuery = `
        UPDATE Sitter_Services
        SET price = $1,
            duration = $2,
            description = $3,
            service_image = $4,
            updated_at = CURRENT_TIMESTAMP
        WHERE sitter_service_id = $5
        RETURNING *
      `;
      const values = [price, duration, description, service_image, sitter_service_id];
      const result = await db.query(updateQuery, values);
  
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "ไม่พบงานที่ต้องการแก้ไข" });
      }
  
      return res.status(200).json({
        message: "แก้ไขงานสำเร็จ",
        service: result.rows[0]
      });
    } catch (error) {
      console.error("Update Sitter Service error:", error);
      return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
  };
  
  /* Delete งานของพี่เลี้ยง */
  exports.deleteSitterService = async (req, res) => {
    try {
      const { sitter_service_id } = req.params;
      if (!sitter_service_id) {
        return res.status(400).json({ message: "กรุณาระบุรหัสงาน" });
      }
  
      const deleteQuery = `
        DELETE FROM Sitter_Services
        WHERE sitter_service_id = $1
        RETURNING *
      `;
      const result = await db.query(deleteQuery, [sitter_service_id]);
  
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "ไม่พบงานที่ต้องการลบ" });
      }
  
      return res.status(200).json({
        message: "ลบงานสำเร็จ",
        service: result.rows[0]
      });
    } catch (error) {
      console.error("Delete Sitter Service error:", error);
      return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
  };
  