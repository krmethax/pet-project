// db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',          // ปรับ user ให้ตรงกับ MySQL ของคุณ
  database: 'pet_sitter_app',
  password: 'krmethax',
  port: 3307             // ค่า port ของ MySQL โดยปกติคือ 3306
});

module.exports = {
  query: async (sql, params) => {
    const [results] = await pool.execute(sql, params);
    return results;
  }
};
