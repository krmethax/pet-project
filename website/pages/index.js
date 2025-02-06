import React, { useState } from "react";
import { useRouter } from "next/router";
import swal from "sweetalert"; // นำเข้า sweetalert

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault(); // ป้องกันการรีเฟรชหน้าเว็บ

    // ตรวจสอบ username และ password
    if (username === "admin" && password === "1234") {
      // บันทึก token ลงใน localStorage (ในตัวอย่างนี้เราจะใช้ token จำลอง)
      localStorage.setItem("token", "your-login-token");

      // เปลี่ยนเส้นทางไปหน้า dashboard
      router.push("/dashboard");
    } else {
      // แสดง SweetAlert หากเข้าสู่ระบบไม่สำเร็จ
      swal("เข้าสู่ระบบไม่สำเร็จ", "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", "error");
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100">
      <div className="row shadow-lg p-5 bg-white rounded">
        <div className="col-md-6 d-none d-md-block">
          <img
            src="https://img.freepik.com/free-vector/access-control-system-abstract-concept_335657-3180.jpg"
            className="img-fluid rounded"
            alt="Login illustration"
          />
        </div>
        <div className="col-md-6">
          <h1 style={{ fontWeight: "bold" }} className="text-center mb-4">
            ระบบจัดการพี่เลี้ยง
          </h1>
          <hr />
          <div className="card border-0">
            <div className="card-header text-center border-0 bg-transparent">
              <h3 className="text-primary">กรุณาเข้าสู่ระบบ</h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <input
                    type="text"
                    name="username"
                    placeholder="Username"
                    className="form-control p-2"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    className="form-control p-2"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <button type="submit" className="btn btn-primary w-100 p-2">
                    เข้าสู่ระบบ
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
