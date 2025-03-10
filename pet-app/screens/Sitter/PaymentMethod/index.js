import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AntDesign } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

export default function PaymentMethod() {
  const navigation = useNavigation();
  const [sitterId, setSitterId] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Form fields ใน modal
  const [promptpayNumber, setPromptpayNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");

  // ดึง sitter_id จาก AsyncStorage เมื่อ component mount
  useEffect(() => {
    const getSitterId = async () => {
      try {
        const storedSitterId = await AsyncStorage.getItem("sitter_id");
        if (storedSitterId) {
          setSitterId(storedSitterId);
        }
      } catch (error) {
        console.error("Failed to fetch sitter_id:", error);
      }
    };
    getSitterId();
  }, []);

  // ฟังก์ชันดึงข้อมูลวิธีการชำระเงินจาก API
  const fetchPaymentMethods = useCallback(() => {
    if (sitterId) {
      setLoading(true);
      fetch(`http://100.116.44.8:5000/api/sitter/payment-methods/${sitterId}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.paymentMethods) {
            setPaymentMethods(data.paymentMethods);
          } else {
            setPaymentMethods([]);
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching payment methods:", error);
          setLoading(false);
        });
    }
  }, [sitterId]);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  // Handler เปิด modal สำหรับเพิ่มวิธีการชำระเงิน
  const handleOpenModal = () => {
    setModalVisible(true);
  };

  // Handler ปิด modal และเคลียร์ฟอร์ม
  const handleCloseModal = () => {
    setModalVisible(false);
    setPromptpayNumber("");
    setAccountName("");
    setBankName("");
  };

  // Handler ส่งข้อมูลเพิ่มวิธีการชำระเงินไปยัง API
  const handleSubmitPaymentMethod = () => {
    if (!promptpayNumber || !accountName || !bankName) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    const payload = {
      sitter_id: sitterId,
      promptpay_number: promptpayNumber,
      account_name: accountName,
      bank_name: bankName,
    };

    fetch("http://100.116.44.8:5000/api/sitter/payment-methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.paymentMethod) {
          fetchPaymentMethods();
          handleCloseModal();
        } else {
          alert("เกิดข้อผิดพลาดในการเพิ่มวิธีการชำระเงิน");
        }
      })
      .catch((error) => {
        console.error("Error adding payment method:", error);
        alert("เกิดข้อผิดพลาดในการเพิ่มวิธีการชำระเงิน");
      });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#000" style={styles.loading} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.headerTitle}>ตั้งค่าการชำระเงิน</Text>
        {paymentMethods.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>ยังไม่มีวิธีการชำระเงิน</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleOpenModal}>
              <AntDesign name="pluscircleo" size={30} color="#6A1B9A" />
              <Text style={styles.addButtonText}>เพิ่มวิธีการชำระเงิน</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {paymentMethods.map((method) => (
              <View key={method.payment_method_id} style={styles.paymentCard}>
                <Text style={styles.paymentText}>
                  PromptPay: {method.promptpay_number}
                </Text>
                {/* ปุ่มแก้ไขและลบ */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() =>
                      navigation.navigate("EditPaymentMethod", {
                        paymentMethod: method,
                      })
                    }
                  >
                    <AntDesign name="edit" size={20} color="#6A1B9A" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() =>
                      navigation.navigate("DeletePaymentMethod", {
                        paymentMethod: method,
                      })
                    }
                  >
                    <AntDesign name="delete" size={20} color="#d32f2f" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.addButton} onPress={handleOpenModal}>
              <AntDesign name="pluscircleo" size={30} color="#6A1B9A" />
              <Text style={styles.addButtonText}>เพิ่มวิธีการชำระเงิน</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal สำหรับเพิ่มวิธีการชำระเงิน */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>เพิ่มวิธีการชำระเงิน</Text>
            <TextInput
              style={styles.input}
              placeholder="หมายเลข PromptPay (บัตรประชาชน/เบอร์โทร)"
              value={promptpayNumber}
              onChangeText={setPromptpayNumber}
              keyboardType="default"
            />
            <TextInput
              style={styles.input}
              placeholder="ชื่อบัญชี (ชื่อ/นามสกุล)"
              value={accountName}
              onChangeText={setAccountName}
            />
            <TextInput
              style={styles.input}
              placeholder="ธนาคาร"
              value={bankName}
              onChangeText={setBankName}
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleSubmitPaymentMethod}
              >
                <Text style={styles.modalButtonText}>บันทึก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={handleCloseModal}
              >
                <Text
                  style={[styles.modalButtonText, styles.modalCancelButtonText]}
                >
                  ยกเลิก
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

import { TextInput } from "react-native";

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  scrollContainer: {
    padding: 20,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Prompt-Bold",
    color: "#000",
    marginBottom: 20,
  },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { alignItems: "center", marginTop: 40 },
  emptyText: {
    fontSize: 18,
    fontFamily: "Prompt-Regular",
    color: "#000",
    marginBottom: 20,
  },
  addButton: { flexDirection: "row", alignItems: "center" },
  addButtonText: {
    fontSize: 16,
    fontFamily: "Prompt-Medium",
    color: "#6A1B9A",
    marginLeft: 8,
  },
  listContainer: { width: "100%" },
  paymentCard: {
    width: "100%",
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  paymentText: {
    fontSize: 16,
    fontFamily: "Prompt-Regular",
    color: "#000",
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  editButton: { marginRight: 15 },
  deleteButton: {},
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Prompt-Bold",
    color: "#000",
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    backgroundColor: "#000",
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
    marginHorizontal: 5,
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: "Prompt-Bold",
    color: "#fff",
  },
  modalCancelButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#000",
  },
  modalCancelButtonText: {
    color: "#000",
  },
});
