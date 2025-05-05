// pages/addServiceDetail.js

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import swal from "sweetalert";
import CountUp from "react-countup";
import Sidebar from "../components/Sidebar";
import { useRouter } from "next/router";

export default function Service() {
  const router = useRouter();
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" หรือ "edit"
  const [formData, setFormData] = useState({
    service_type_id: "",
    short_name: "",
    full_description: "",
  });

  // ดึงข้อมูลประเภทบริการจาก API เมื่อ component mount
  const fetchServiceTypes = useCallback(() => {
    setLoading(true);
    axios
      .get("http://192.168.1.8:5000/api/admin/service-types")
      .then((response) => {
        setServiceTypes(response.data.serviceTypes || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching service types:", error);
        swal("Error", "Failed to fetch service types", "error");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchServiceTypes();
  }, [fetchServiceTypes]);

  // ฟังก์ชันเปิด modal สำหรับเพิ่มประเภทบริการใหม่
  const openAddModal = () => {
    setModalMode("add");
    setFormData({
      service_type_id: "",
      short_name: "",
      full_description: "",
    });
    setModalVisible(true);
  };

  // ฟังก์ชันเปิด modal สำหรับแก้ไขประเภทบริการ
  const openEditModal = (service) => {
    setModalMode("edit");
    setFormData({
      service_type_id: service.service_type_id,
      short_name: service.short_name,
      full_description: service.full_description,
    });
    setModalVisible(true);
  };

  // ปิด modal
  const closeModal = () => {
    setModalVisible(false);
  };

  // ฟังก์ชันส่งข้อมูลฟอร์ม (เพิ่มหรือแก้ไข)
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting form data:", formData);
    try {
      if (modalMode === "add") {
        const response = await axios.post(
          "http://192.168.1.8:5000/api/admin/service-types",
          {
            short_name: formData.short_name,
            full_description: formData.full_description,
          }
        );
        swal("Success", response.data.message, "success");
      } else if (modalMode === "edit") {
        const response = await axios.put(
          "http://192.168.1.8:5000/api/admin/service-types",
          {
            service_type_id: formData.service_type_id,
            short_name: formData.short_name,
            full_description: formData.full_description,
          }
        );
        swal("Success", response.data.message, "success");
      }
      closeModal();
      fetchServiceTypes();
    } catch (error) {
      console.error("Error saving service type:", error);
      if (error.response) {
        console.error("Response data:", error.response.data);
        swal(
          "Error",
          error.response.data.message || "Failed to save service type",
          "error"
        );
      } else {
        swal("Error", "Failed to save service type", "error");
      }
    }
  };

  // ฟังก์ชันลบประเภทบริการ
  const handleDelete = async (service_type_id) => {
    if (confirm("Are you sure you want to delete this service type?")) {
      try {
        const response = await axios.delete(
          `http://192.168.1.8:5000/api/admin/service-types/${service_type_id}`
        );
        swal("Success", response.data.message, "success");
        fetchServiceTypes();
      } catch (error) {
        console.error("Error deleting service type:", error);
        swal(
          "Error",
          error.response?.data?.message || "Failed to delete service type",
          "error"
        );
      }
    }
  };

  return (
    <div style={styles.pageContainer}>
      <Sidebar />
      <div style={styles.content}>
        <main style={styles.mainContainer}>
          <h1 style={styles.header}>Service Dashboard</h1>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              <h2 style={styles.subHeader}>
                Total Service Types:{" "}
                <CountUp end={serviceTypes.length} duration={2} />
              </h2>
              <ul style={styles.list}>
                {serviceTypes.map((service) => (
                  <li key={service.service_type_id} style={styles.listItem}>
                    <strong>{service.short_name}</strong> -{" "}
                    <span>{service.full_description}</span>
                    <div style={styles.itemActions}>
                      <button
                        style={styles.editButton}
                        onClick={() => openEditModal(service)}
                      >
                        Edit
                      </button>
                      <button
                        style={styles.deleteButton}
                        onClick={() =>
                          handleDelete(service.service_type_id)
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <button style={styles.addButton} onClick={openAddModal}>
                Add Service Type
              </button>
            </>
          )}
        </main>
      </div>

      {/* Modal */}
      {modalVisible && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2>
              {modalMode === "add"
                ? "Add Service Type"
                : "Edit Service Type"}
            </h2>
            <form onSubmit={handleSubmit} style={styles.form}>
              {modalMode === "edit" && (
                <div style={styles.formGroup}>
                  <label>Service Type ID:</label>
                  <input
                    type="text"
                    value={formData.service_type_id}
                    readOnly
                    style={styles.input}
                  />
                </div>
              )}
              <div style={styles.formGroup}>
                <label>Short Name:</label>
                <input
                  type="text"
                  value={formData.short_name}
                  onChange={(e) =>
                    setFormData({ ...formData, short_name: e.target.value })
                  }
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label>Full Description:</label>
                <textarea
                  value={formData.full_description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      full_description: e.target.value,
                    })
                  }
                  style={styles.textarea}
                  required
                />
              </div>
              <div style={styles.formActions}>
                <button type="submit" style={styles.submitButton}>
                  {modalMode === "add" ? "Add" : "Update"}
                </button>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={closeModal}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  pageContainer: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "#FFF",
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
  list: {
    listStyleType: "none",
    padding: 0,
  },
  listItem: {
    marginBottom: "10px",
    padding: "10px",
    borderBottom: "1px solid #ccc",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemActions: {
    display: "flex",
    gap: "10px",
  },
  editButton: {
    backgroundColor: "#FFC107",
    border: "none",
    padding: "5px 10px",
    borderRadius: "5px",
    cursor: "pointer",
    color: "#FFF",
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
  form: {
    display: "flex",
    flexDirection: "column",
  },
  formGroup: {
    marginBottom: "15px",
  },
  input: {
    width: "100%",
    padding: "8px",
    fontSize: "16px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: "8px",
    fontSize: "16px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    boxSizing: "border-box",
    resize: "vertical",
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
