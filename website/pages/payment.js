// pages/payment.js

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import swal from "sweetalert";
import CountUp from "react-countup";
import Sidebar from "../components/Sidebar";
import { useRouter } from "next/router";

export default function PaymentManagement() {
  const router = useRouter();
  const [bookingSlips, setBookingSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(""); // ตัวเลือกกรองสถานะ (ถ้ามี)
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState(null);

  // ดึงข้อมูลสลิปการจองจาก API (ส่ง query parameter "status" หากต้องการกรอง)
  const fetchBookingSlips = useCallback(() => {
    setLoading(true);
    axios
      .get("http://192.168.1.12:5000/api/admin/booking-slips", {
        params: { status: statusFilter },
      })
      .then((response) => {
        // สมมุติว่า API ส่งกลับข้อมูลในรูปแบบ { bookingSlips: [...] }
        setBookingSlips(response.data.bookingSlips || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching booking slips:", error);
        swal("Error", "Failed to fetch booking slips", "error");
        setLoading(false);
      });
  }, [statusFilter]);

  useEffect(() => {
    fetchBookingSlips();
  }, [fetchBookingSlips]);

  // เปิด modal สำหรับแก้ไขสถานะสลิป
  const openEditModal = (slip) => {
    setSelectedSlip(slip);
    setModalVisible(true);
  };

  // ปิด modal
  const closeModal = () => {
    setModalVisible(false);
    setSelectedSlip(null);
  };

  // อัปเดตสถานะสลิปการจอง (PUT /api/admin/booking-slips)
  const handleStatusUpdate = async () => {
    try {
      const response = await axios.put("http://192.168.1.12:5000/api/admin/booking-slips", {
        booking_id: selectedSlip.booking_id,
        payment_status: selectedSlip.payment_status, // ส่ง payment_status ที่ถูกเลือกใน modal
      });
      swal("Success", response.data.message, "success");
      closeModal();
      fetchBookingSlips();
    } catch (error) {
      console.error("Error updating booking slip status:", error);
      swal("Error", error.response?.data?.message || "Failed to update booking slip", "error");
    }
  };

  // ลบสลิปการจอง (DELETE /api/admin/booking-slips/:booking_id)
  const handleDeleteSlip = async (booking_id) => {
    if (confirm("Are you sure you want to delete this booking slip?")) {
      try {
        const response = await axios.delete(
          `http://192.168.1.12:5000/api/admin/booking-slips/${booking_id}`
        );
        swal("Success", response.data.message, "success");
        fetchBookingSlips();
      } catch (error) {
        console.error("Error deleting booking slip:", error);
        swal("Error", error.response?.data?.message || "Failed to delete booking slip", "error");
      }
    }
  };

  return (
    <div style={styles.pageContainer}>
      <Sidebar />
      <div style={styles.content}>
        <main style={styles.mainContainer}>
          <h1 style={styles.header}>Payment Management</h1>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              <h2 style={styles.subHeader}>
                Total Booking Slips: <CountUp end={bookingSlips.length} duration={2} />
              </h2>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Booking ID</th>
                    <th style={styles.th}>Member ID</th>
                    <th style={styles.th}>Sitter ID</th>
                    <th style={styles.th}>Slip Image</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Payment Status</th>
                    <th style={styles.th}>Created At</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookingSlips.map((slip) => (
                    <tr key={slip.booking_id}>
                      <td style={styles.td}>{slip.booking_id}</td>
                      <td style={styles.td}>{slip.member_id}</td>
                      <td style={styles.td}>{slip.sitter_id}</td>
                      <td style={styles.td}>
                        {slip.slip_image ? (
                          <img
                            src={
                              slip.slip_image.startsWith("file://")
                                ? "https://via.placeholder.com/100"
                                : slip.slip_image
                            }
                            alt="Slip"
                            style={styles.slipThumbnail}
                          />
                        ) : (
                          "-"
                        )}
                      </td>
                      <td style={styles.td}>
                        {typeof slip.total_price !== "undefined"
                          ? slip.total_price + " บาท"
                          : "-"}
                      </td>
                      <td style={styles.td}>{slip.payment_status}</td>
                      <td style={styles.td}>
                        {new Date(slip.created_at).toLocaleString()}
                      </td>
                      <td style={styles.td}>
                        <button
                          style={styles.editButton}
                          onClick={() => openEditModal(slip)}
                        >
                          Edit
                        </button>
                        <button
                          style={styles.deleteButton}
                          onClick={() => handleDeleteSlip(slip.booking_id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button style={styles.addButton} onClick={() => router.push("/add-payment")}>
                Add Payment
              </button>
            </>
          )}
        </main>
      </div>

      {/* Modal สำหรับแก้ไขสถานะสลิปการจอง */}
      {modalVisible && selectedSlip && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>Edit Booking Slip Payment Status</h2>
            <p>
              Booking ID: <strong>{selectedSlip.booking_id}</strong>
            </p>
            <p>
              Current Payment Status: <strong>{selectedSlip.payment_status}</strong>
            </p>
            <div style={styles.formGroup}>
              <label>New Payment Status:</label>
              <select
                value={selectedSlip.payment_status}
                onChange={(e) =>
                  setSelectedSlip({ ...selectedSlip, payment_status: e.target.value })
                }
                style={styles.select}
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
            <div style={styles.formActions}>
              <button style={styles.submitButton} onClick={handleStatusUpdate}>
                Update
              </button>
              <button style={styles.cancelButton} onClick={closeModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  pageContainer: {
    display: "flex",
  },
  content: {
    marginLeft: "250px", // Sidebar width
    width: "100%",
    padding: "20px",
    boxSizing: "border-box",
    backgroundColor: "#F9F9F9",
  },
  mainContainer: {
    flex: 1,
    padding: "20px",
  },
  header: {
    fontSize: "32px",
    fontWeight: "bold",
    marginBottom: "20px",
    color: "#000",
  },
  subHeader: {
    fontSize: "24px",
    marginBottom: "20px",
    color: "#333",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: "20px",
  },
  th: {
    border: "1px solid #ddd",
    padding: "8px",
    backgroundColor: "#f2f2f2",
    textAlign: "left",
  },
  td: {
    border: "1px solid #ddd",
    padding: "8px",
    textAlign: "left",
  },
  slipThumbnail: {
    width: "100px",
    height: "auto",
  },
  editButton: {
    backgroundColor: "#FFC107",
    border: "none",
    padding: "5px 10px",
    borderRadius: "5px",
    cursor: "pointer",
    color: "#FFF",
    marginRight: "5px",
  },
  deleteButton: {
    backgroundColor: "#DC3545",
    border: "none",
    padding: "5px 10px",
    borderRadius: "5px",
    cursor: "pointer",
    color: "#FFF",
  },
  addButton: {
    display: "block",
    margin: "20px auto",
    padding: "10px 20px",
    fontSize: "16px",
    fontWeight: "bold",
    backgroundColor: "#1E90FF",
    color: "#FFF",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#FFF",
    padding: "20px",
    borderRadius: "10px",
    width: "400px",
    boxSizing: "border-box",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  },
  formGroup: {
    marginBottom: "15px",
  },
  select: {
    width: "100%",
    padding: "8px",
    fontSize: "16px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    boxSizing: "border-box",
  },
  formActions: {
    display: "flex",
    justifyContent: "space-between",
  },
  submitButton: {
    backgroundColor: "#28A745",
    border: "none",
    padding: "10px 20px",
    borderRadius: "5px",
    cursor: "pointer",
    color: "#FFF",
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: "#6C757D",
    border: "none",
    padding: "10px 20px",
    borderRadius: "5px",
    cursor: "pointer",
    color: "#FFF",
    fontWeight: "bold",
  },
};
