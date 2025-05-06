import { useEffect, useState } from "react";
import axios from "axios";
import swal from "sweetalert";
import CountUp from "react-countup";
import Sidebar from "../components/Sidebar";

export default function Dashboard() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegistration, setSelectedRegistration] = useState(null);

  // Mapping สถานะเป็นภาษาไทย
  const statusMapping = {
    pending: "รอตรวจสอบ",
    approved: "อนุมัติ",
    rejected: "ปฏิเสธ",
  };

  // ดึงข้อมูลพี่เลี้ยงจาก API
  useEffect(() => {
    axios
      .get("http://192.168.1.8:5000/api/admin/get-all-sitters")
      .then((res) => {
        if (res.data && res.data.registrations) {
          setRegistrations(res.data.registrations);
        } else {
          setRegistrations([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching sitter registrations:", err);
        swal("Error", "ไม่สามารถดึงข้อมูลการสมัครพี่เลี้ยงได้", "error");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={styles.mainContainer}>
        <Sidebar />
        <div style={styles.content}>
          <h1 style={styles.heading}>Dashboard</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // นับจำนวนแต่ละสถานะ
  const countPending = registrations.filter(
    (item) => item.verification_status === "pending"
  ).length;
  const countApproved = registrations.filter(
    (item) => item.verification_status === "approved"
  ).length;
  const countRejected = registrations.filter(
    (item) => item.verification_status === "rejected"
  ).length;

  // ฟังก์ชันสำหรับปิด modal
  const closeModal = () => {
    setSelectedRegistration(null);
  };

  // ฟังก์ชันสำหรับจัดการสถานะ (Approve/Reject)
  const handleManage = async (decision) => {
    try {
      const response = await axios.post(
        "http://192.168.1.8:5000/api/admin/update-sitter-status",
        {
          sitter_id: selectedRegistration.sitter_id,
          status: decision,
        }
      );
      if (response.data && response.data.sitter) {
        swal(
          "Success",
          `สถานะถูกเปลี่ยนเป็น ${statusMapping[decision]}`,
          "success"
        );
        setRegistrations((prevRegs) =>
          prevRegs.map((reg) =>
            reg.sitter_id === selectedRegistration.sitter_id
              ? {
                  ...reg,
                  verification_status:
                    response.data.sitter.verification_status,
                }
              : reg
          )
        );
      } else {
        swal("Error", "ไม่สามารถเปลี่ยนสถานะได้", "error");
      }
    } catch (error) {
      console.error("Update sitter status error:", error);
      swal("Error", "เกิดข้อผิดพลาดในการเปลี่ยนสถานะ", "error");
    }
    closeModal();
  };

  return (
    <div style={styles.mainContainer}>
      <Sidebar />
      <div style={styles.content}>
        <h1 style={styles.heading}>ระบบจัดการพี่เลี้ยง</h1>
        {/* Card สรุปจำนวนพี่เลี้ยงแต่ละประเภท */}
        <div style={styles.cardContainer}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>พี่เลี้ยงใหม่</h3>
            <CountUp
              end={countPending}
              duration={2}
              style={styles.cardCount}
            />
          </div>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>พี่เลี้ยงที่อนุมัติ</h3>
            <CountUp
              end={countApproved}
              duration={2}
              style={styles.cardCount}
            />
          </div>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>พี่เลี้ยงที่ปฏิเสธ</h3>
            <CountUp
              end={countRejected}
              duration={2}
              style={styles.cardCount}
            />
          </div>
        </div>

        {/* ตารางแสดงรายละเอียด */}
        {registrations.length === 0 ? (
          <p style={styles.noData}>ยังไม่มีการสมัครพี่เลี้ยงเข้ามา</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ชื่อ</th>
                <th style={styles.th}>นามสกุล</th>
                <th style={styles.th}>เบอร์โทร</th>
                <th style={styles.th}>สถานะ</th>
                <th style={styles.th}>ตรวจสอบ</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((item) => (
                <tr key={item.sitter_id} style={styles.tr}>
                  <td style={styles.td}>{item.first_name}</td>
                  <td style={styles.td}>{item.last_name}</td>
                  <td style={styles.td}>{item.phone}</td>
                  <td style={styles.td}>
                    {statusMapping[item.verification_status] ||
                      item.verification_status}
                  </td>
                  <td style={styles.td}>
                    <button
                      style={styles.checkButton}
                      onClick={() => setSelectedRegistration(item)}
                    >
                      ตรวจสอบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Modal สำหรับตรวจสอบข้อมูล */}
        {selectedRegistration && (
          <div style={styles.modalOverlay} onClick={closeModal}>
            <div
              style={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={styles.modalHeading}>
                {selectedRegistration.first_name}{" "}
                {selectedRegistration.last_name}
              </h2>
              <p>เบอร์โทร: {selectedRegistration.phone}</p>
              <p>
                สถานะ:{" "}
                {statusMapping[selectedRegistration.verification_status] ||
                  selectedRegistration.verification_status}
              </p>
              <div style={styles.modalImages}>
                <div>
                  <p>รูปใบหน้า</p>
                  {selectedRegistration.face_image_url ? (
                    <img
                      src={selectedRegistration.face_image_url}
                      alt="Face"
                      style={styles.modalImage}
                    />
                  ) : (
                    <p>ไม่มีรูป</p>
                  )}
                </div>
                <div>
                  <p>รูปบัตรประชาชน</p>
                  {selectedRegistration.id_card_image_url ? (
                    <img
                      src={selectedRegistration.id_card_image_url}
                      alt="ID Card"
                      style={styles.modalImage}
                    />
                  ) : (
                    <p>ไม่มีรูป</p>
                  )}
                </div>
              </div>
              <div style={styles.modalButtons}>
                <button
                  style={{ ...styles.manageButton, backgroundColor: "#4CAF50" }}
                  onClick={() => handleManage("approved")}
                >
                  อนุมัติ
                </button>
                <button
                  style={{ ...styles.manageButton, backgroundColor: "#F44336" }}
                  onClick={() => handleManage("rejected")}
                >
                  ปฏิเสธ
                </button>
              </div>
              <button style={styles.closeButton} onClick={closeModal}>
                ปิด
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  mainContainer: {
    display: "flex",
  },
  content: {
    marginLeft: "250px", // กว้างของ sidebar
    width: "100%",
    padding: "20px",
    boxSizing: "border-box",
  },
  heading: {
    textAlign: "center",
    color: "#333",
  },
  cardContainer: {
    display: "flex",
    justifyContent: "space-around",
    marginBottom: "20px",
  },
  card: {
    flex: "1",
    margin: "0 10px",
    padding: "20px",
    borderRadius: "8px",
    backgroundColor: "#f2f2f2",
    textAlign: "center",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  cardTitle: {
    marginBottom: "10px",
    color: "#333",
    fontSize: "18px",
    fontWeight: "bold",
  },
  cardCount: {
    fontSize: "28px",
    color: "#FF5722",
  },
  noData: {
    textAlign: "center",
    color: "#666",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "20px",
  },
  th: {
    border: "1px solid #ddd",
    padding: "8px",
    backgroundColor: "#f2f2f2",
    textAlign: "left",
  },
  tr: {
    borderBottom: "1px solid #ddd",
  },
  td: {
    border: "1px solid #ddd",
    padding: "8px",
    verticalAlign: "middle",
  },
  checkButton: {
    padding: "6px 12px",
    backgroundColor: "#2196F3",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
  },
  modalContent: {
    position: "relative",
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "8px",
    textAlign: "center",
    maxWidth: "90vw",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  modalHeading: {
    marginBottom: "10px",
  },
  modalImages: {
    display: "flex",
    justifyContent: "space-around",
    marginBottom: "20px",
  },
  modalImage: {
    maxWidth: "300px",
    maxHeight: "300px",
    borderRadius: "8px",
  },
  modalButtons: {
    display: "flex",
    justifyContent: "center",
    gap: "20px",
    marginBottom: "20px",
  },
  manageButton: {
    padding: "10px 20px",
    border: "none",
    borderRadius: "4px",
    color: "#fff",
    cursor: "pointer",
    fontSize: "16px",
  },
  closeButton: {
    padding: "8px 16px",
    backgroundColor: "#333",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
};
