const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// ตั้งค่า Firebase Admin ก่อน import routes ที่ใช้ Firebase


const app = express();

// ใช้ CORS และ bodyParser
app.use(cors());
app.use(bodyParser.json());

// ตอนนี้จึง import routes ได้อย่างปลอดภัย
const authRoutes = require('./routes/authRoutes');
const sitterRoutes = require('./routes/sitterRoutes');
const adminRoutes = require('./routes/adminRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

// ใช้งาน uploadRoutes และ routes อื่นๆ
app.use('/api/', uploadRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/sitter', sitterRoutes);
app.use('/api/admin', adminRoutes);

// กำหนด PORT และ HOST
const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server is running on http://${HOST}:${PORT}`);
});
