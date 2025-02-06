// db.js
const { Pool } = require('pg');

// ปรับการตั้งค่า connection ตาม environment ของคุณ
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'pet_sitter_app',
  password: 'krmethax',
  port: 5432,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
