// pages/petTypes.js

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import swal from "sweetalert";
import CountUp from "react-countup";
import Sidebar from "../components/Sidebar";
import { useRouter } from "next/router";

export default function PetTypes() {
  const router = useRouter();
  const [petTypes, setPetTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" หรือ "edit"
  const [formData, setFormData] = useState({
    pet_type_id: "",
    type_name: "",
    description: "",
  });

  // ดึงข้อมูล pet types จาก API
  const fetchPetTypes = useCallback(() => {
    setLoading(true);
    axios
      .get("http://192.168.1.8:5000/api/admin/pet-types")
      .then((response) => {
        setPetTypes(response.data.petTypes || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching pet types:", error);
        swal("Error", "Failed to fetch pet types", "error");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchPetTypes();
  }, [fetchPetTypes]);

  // เปิด modal สำหรับเพิ่ม pet type ใหม่
  const openAddModal = () => {
    setModalMode("add");
    setFormData({
      pet_type_id: "",
      type_name: "",
      description: "",
    });
    setModalVisible(true);
  };

  // เปิด modal สำหรับแก้ไข pet type
  const openEditModal = (petType) => {
    setModalMode("edit");
    setFormData({
      pet_type_id: petType.pet_type_id,
      type_name: petType.type_name,
      description: petType.description || "",
    });
    setModalVisible(true);
  };

  // ปิด modal
  const closeModal = () => {
    setModalVisible(false);
  };

  // ส่งข้อมูลฟอร์ม (เพิ่มหรือแก้ไข)
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting form data:", formData);
    try {
      if (modalMode === "add") {
        const response = await axios.post(
          "http://192.168.1.8:5000/api/admin/pet-types",
          {
            type_name: formData.type_name,
            description: formData.description,
          }
        );
        swal("Success", response.data.message, "success");
      } else if (modalMode === "edit") {
        const response = await axios.put(
          "http://192.168.1.8:5000/api/admin/pet-types",
          {
            pet_type_id: formData.pet_type_id,
            type_name: formData.type_name,
            description: formData.description,
          }
        );
        swal("Success", response.data.message, "success");
      }
      closeModal();
      fetchPetTypes();
    } catch (error) {
      console.error("Error saving pet type:", error);
      if (error.response) {
        console.error("Response data:", error.response.data);
        swal(
          "Error",
          error.response.data.message || "Failed to save pet type",
          "error"
        );
      } else {
        swal("Error", "Failed to save pet type", "error");
      }
    }
  };

  // ลบ pet type
  const handleDelete = async (pet_type_id) => {
    if (confirm("Are you sure you want to delete this pet type?")) {
      try {
        const response = await axios.delete(
          `http://192.168.1.8:5000/api/admin/pet-types/${pet_type_id}`
        );
        swal("Success", response.data.message, "success");
        fetchPetTypes();
      } catch (error) {
        console.error("Error deleting pet type:", error);
        swal(
          "Error",
          error.response?.data?.message || "Failed to delete pet type",
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
          <h1 style={styles.header}>Pet Types Dashboard</h1>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              <h2 style={styles.subHeader}>
                Total Pet Types:{" "}
                <CountUp end={petTypes.length} duration={2} />
              </h2>
              <ul style={styles.list}>
                {petTypes.map((pet) => (
                  <li key={pet.pet_type_id} style={styles.listItem}>
                    <strong>{pet.type_name}</strong> -{" "}
                    <span>{pet.description}</span>
                    <div style={styles.itemActions}>
                      <button
                        style={styles.editButton}
                        onClick={() => openEditModal(pet)}
                      >
                        Edit
                      </button>
                      <button
                        style={styles.deleteButton}
                        onClick={() => handleDelete(pet.pet_type_id)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <button style={styles.addButton} onClick={openAddModal}>
                Add Pet Type
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
              {modalMode === "add" ? "Add Pet Type" : "Edit Pet Type"}
            </h2>
            <form onSubmit={handleSubmit} style={styles.form}>
              {modalMode === "edit" && (
                <div style={styles.formGroup}>
                  <label>Pet Type ID:</label>
                  <input
                    type="text"
                    value={formData.pet_type_id}
                    readOnly
                    style={styles.input}
                  />
                </div>
              )}
              <div style={styles.formGroup}>
                <label>Type Name:</label>
                <input
                  type="text"
                  value={formData.type_name}
                  onChange={(e) =>
                    setFormData({ ...formData, type_name: e.target.value })
                  }
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label>Description:</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
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
