-- สร้าง Schema สำหรับแอปพลิเคชัน pet_sitter_app
CREATE SCHEMA `pet_sitter_app`;

-- เลือกใช้ Schema ที่สร้างขึ้น
USE `pet_sitter_app`;

-- ตาราง Members
CREATE TABLE Members (
    member_id    INT AUTO_INCREMENT PRIMARY KEY,
    first_name   VARCHAR(50) NOT NULL,
    last_name    VARCHAR(50) NOT NULL,
    email        VARCHAR(100) NOT NULL UNIQUE,
    password     VARCHAR(255) NOT NULL,
    phone        VARCHAR(20) NOT NULL UNIQUE,
    profile_image TEXT,  -- เก็บลิงก์ของรูปภาพ
    address      TEXT,
    province     VARCHAR(100),
    amphure      VARCHAR(100),
    tambon       VARCHAR(100),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ตาราง Pet_Sitters
CREATE TABLE Pet_Sitters (
    sitter_id           INT AUTO_INCREMENT PRIMARY KEY,
    first_name          VARCHAR(50) NOT NULL,
    last_name           VARCHAR(50) NOT NULL,
    email               VARCHAR(100) NOT NULL UNIQUE,
    password            VARCHAR(255) NOT NULL,
    phone               VARCHAR(20) UNIQUE,
    profile_image       TEXT,  -- เก็บลิงก์ของรูปโปรไฟล์
    address             TEXT,
    province            VARCHAR(100),
    amphure             VARCHAR(100),
    tambon              VARCHAR(100),
    experience          TEXT,
    rating              DECIMAL(3,2),
    verification_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    face_image          TEXT,  -- เก็บลิงก์ของรูปใบหน้า
    id_card_image       TEXT,  -- เก็บลิงก์ของรูปบัตรประชาชน
    reviewed_by         INT,
    reviewed_at         TIMESTAMP NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ตาราง Pet_Types (แก้ไขโดยเพิ่ม created_at และ updated_at)
CREATE TABLE Pet_Types (
    pet_type_id INT AUTO_INCREMENT PRIMARY KEY,
    type_name   VARCHAR(100) NOT NULL,
    description TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ตาราง Service_Types
CREATE TABLE Service_Types (
    service_type_id   INT AUTO_INCREMENT PRIMARY KEY,
    short_name        VARCHAR(50) NOT NULL,
    full_description  VARCHAR(255) NOT NULL,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ตาราง Sitter_Services
CREATE TABLE Sitter_Services (
    sitter_service_id INT AUTO_INCREMENT PRIMARY KEY,
    sitter_id         INT NOT NULL,
    service_type_id   INT NOT NULL,
    pet_type_id       INT NOT NULL,
    price             DECIMAL(10,2) NOT NULL,
    pricing_unit      ENUM('per_walk', 'per_night', 'per_session') NOT NULL,
    duration          INT,
    description       TEXT,
    service_image     TEXT,  -- เก็บลิงก์ของรูปบริการ
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sitter_id) REFERENCES Pet_Sitters(sitter_id) ON DELETE CASCADE,
    FOREIGN KEY (service_type_id) REFERENCES Service_Types(service_type_id) ON DELETE CASCADE,
    FOREIGN KEY (pet_type_id) REFERENCES Pet_Types(pet_type_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ตาราง Bookings (เพิ่มคอลัมน์ service_type_id)
CREATE TABLE Bookings (
    booking_id        INT AUTO_INCREMENT PRIMARY KEY,
    member_id         INT NOT NULL,
    sitter_id         INT NOT NULL,
    pet_type_id       INT NOT NULL,
    pet_breed         VARCHAR(50) NOT NULL,
    sitter_service_id INT NOT NULL,
    service_type_id   INT NOT NULL,  -- เก็บ service_type โดยตรง
    start_date        DATETIME NOT NULL,
    end_date          DATETIME NOT NULL,
    status            ENUM('pending', 'pending_verification', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
    agreement_status  ENUM('pending', 'sitter_agreed', 'member_agreed', 'cancelled_by_sitter', 'cancelled_by_member') DEFAULT 'pending',
    total_price       DECIMAL(10,2) NOT NULL,
    payment_status    ENUM('pending', 'paid', 'failed', 'unpaid') DEFAULT 'unpaid',
    slip_image        TEXT,  -- เก็บลิงก์ของสลิปการชำระเงิน
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES Members(member_id) ON DELETE CASCADE,
    FOREIGN KEY (sitter_id) REFERENCES Pet_Sitters(sitter_id) ON DELETE CASCADE,
    FOREIGN KEY (pet_type_id) REFERENCES Pet_Types(pet_type_id) ON DELETE CASCADE,
    FOREIGN KEY (sitter_service_id) REFERENCES Sitter_Services(sitter_service_id) ON DELETE CASCADE,
    FOREIGN KEY (service_type_id) REFERENCES Service_Types(service_type_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ตาราง Payments
CREATE TABLE Payments (
    payment_id        INT AUTO_INCREMENT PRIMARY KEY,
    booking_id        INT NOT NULL,
    member_id         INT NOT NULL,
    amount            INT NOT NULL,
    payment_method    ENUM('promptpay', 'credit_card', 'bank_transfer', 'e-wallet') NOT NULL,
    payment_status    ENUM('pending', 'paid', 'failed', 'unpaid') DEFAULT 'pending',
    transaction_id    VARCHAR(255) UNIQUE,
    payment_initiated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES Members(member_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ตาราง Reviews
CREATE TABLE Reviews (
    review_id   INT AUTO_INCREMENT PRIMARY KEY,
    booking_id  INT NOT NULL,
    member_id   INT NOT NULL,
    sitter_id   INT NOT NULL,
    rating      INT CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES Members(member_id) ON DELETE CASCADE,
    FOREIGN KEY (sitter_id) REFERENCES Pet_Sitters(sitter_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ตาราง Verify_OTP
CREATE TABLE Verify_OTP (
    otp_id      INT AUTO_INCREMENT PRIMARY KEY,
    member_id   INT NOT NULL,
    otp_code    VARCHAR(6) NOT NULL,
    expires_at  TIMESTAMP NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES Members(member_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ตาราง Verify_OTP_Sitter
CREATE TABLE Verify_OTP_Sitter (
    otp_id      INT AUTO_INCREMENT PRIMARY KEY,
    sitter_id   INT NOT NULL,
    otp_code    VARCHAR(6) NOT NULL,
    expires_at  TIMESTAMP NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sitter_id) REFERENCES Pet_Sitters(sitter_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ตาราง Confirm_Email
CREATE TABLE Confirm_Email (
    email_verify_id    INT AUTO_INCREMENT PRIMARY KEY,
    member_id          INT NOT NULL,
    email              VARCHAR(100) NOT NULL,
    verification_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at         TIMESTAMP NOT NULL,
    is_verified        BOOLEAN DEFAULT FALSE,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES Members(member_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ตาราง Favorite_Sitters
CREATE TABLE Favorite_Sitters (
    favorite_id INT AUTO_INCREMENT PRIMARY KEY,
    member_id   INT NOT NULL,
    sitter_id   INT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES Members(member_id) ON DELETE CASCADE,
    FOREIGN KEY (sitter_id) REFERENCES Pet_Sitters(sitter_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ตาราง Payment_Methods
CREATE TABLE Payment_Methods (
    payment_method_id INT AUTO_INCREMENT PRIMARY KEY,
    sitter_id         INT NOT NULL,
    promptpay_number  VARCHAR(20) NOT NULL,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sitter_id) REFERENCES Pet_Sitters(sitter_id) ON DELETE CASCADE
) ENGINE=InnoDB;
