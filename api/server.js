const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/authRoutes');
const sitterRoutes = require('./routes/sitterRoutes');
const adminRoutes = require('./routes/adminRoutes');
const cors = require('cors');

const app = express();

// ใช้ CORS ก่อน mount routes
app.use(cors());

// ใช้ bodyParser.json() เพื่อแปลงข้อมูล JSON
app.use(bodyParser.json());

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/sitter', sitterRoutes);
app.use('/api/admin', adminRoutes);

// กำหนด PORT และ HOST
const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0"; // หรือไม่ระบุ HOST เพื่อให้ฟังทุก interface

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server is running on http://${HOST}:${PORT}`);
});
