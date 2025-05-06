import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Platform,
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
  // ใช้ state นี้สำหรับแสดงส่วนเพิ่มวิธีการชำระเงินแบบ inline
  const [isAdding, setIsAdding] = useState(false);
  // state สำหรับเลือกประเภทการชำระเงิน (มีแค่ "promptpay")
  const [selectedPaymentType, setSelectedPaymentType] = useState(null);
  // สำหรับกรอกหมายเลข PromptPay
  const [promptpayNumber, setPromptpayNumber] = useState("");

  // ดึง sitter_id จาก AsyncStorage เมื่อ component mount
  useEffect(() => {
    const getSitterId = async () => {
      try {
        const storedSitterId = await AsyncStorage.getItem("sitter_id");
        if (storedSitterId) {
          setSitterId(storedSitterId);
        } else {
          navigation.replace("Login");
        }
      } catch (error) {
        console.error("Failed to fetch sitter_id:", error);
      }
    };
    getSitterId();
  }, [navigation]);

  // ฟังก์ชันดึงข้อมูลวิธีการชำระเงินจาก API
  const fetchPaymentMethods = useCallback(() => {
    if (sitterId) {
      setLoading(true);
      fetch(`http://192.168.1.12:5000/api/sitter/payment-methods/${sitterId}`)
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

  // Handler สำหรับเริ่มเพิ่มวิธีการชำระเงิน (เมื่อกดปุ่ม + ใน header)
  const handleStartAdd = () => {
    setIsAdding(true);
    // รีเซ็ตค่าเลือกประเภทการชำระเงินและหมายเลข PromptPay
    setSelectedPaymentType(null);
    setPromptpayNumber("");
  };

  // Handler สำหรับยกเลิกการเพิ่มข้อมูล
  const handleCancelAdd = () => {
    setIsAdding(false);
    setSelectedPaymentType(null);
    setPromptpayNumber("");
  };

  // Handler ส่งข้อมูลเพิ่มวิธีการชำระเงินไปยัง API (สำหรับ PromptPay)
  const handleSubmitPaymentMethod = () => {
    if (selectedPaymentType !== "promptpay") {
      alert("กรุณาเลือกประเภทการชำระเงิน");
      return;
    }
    if (!promptpayNumber) {
      alert("กรุณากรอกหมายเลข PromptPay");
      return;
    }

    const payload = {
      sitter_id: sitterId,
      promptpay_number: promptpayNumber,
      // ส่ง account_name และ bank_name เป็นค่าว่าง
      account_name: "",
      bank_name: "",
    };

    fetch("http://192.168.1.12:5000/api/sitter/payment-methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.paymentMethod) {
          fetchPaymentMethods();
          handleCancelAdd();
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
      <View style={styles.container}>
        {/* Header: ซ้ายมี back arrow กับ "ตั้งค่าการชำระเงิน", ขวามีปุ่ม + */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <AntDesign name="arrowleft" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>ตั้งค่าการชำระเงิน</Text>
          </View>
          <TouchableOpacity style={styles.plusButton} onPress={handleStartAdd}>
            <AntDesign name="pluscircleo" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* ถ้าไม่มีข้อมูลและยังไม่อยู่ในโหมดเพิ่มข้อมูล ให้แสดงข้อความ */}
          {paymentMethods.length === 0 && !isAdding ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>ยังไม่มีวิธีการชำระเงิน</Text>
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
                      style={styles.actionButton}
                      onPress={() =>
                        navigation.navigate("EditPaymentMethod", {
                          paymentMethod: method,
                        })
                      }
                    >
                      <AntDesign name="edit" size={20} color="#FF0000" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
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
            </View>
          )}

          {/* Inline Card สำหรับเลือกประเภทและกรอกหมายเลข PromptPay */}
          {isAdding && (
            <View style={styles.inlineCard}>
              <Text style={styles.cardTitle}>เลือกประเภทการชำระเงิน</Text>
              {/* ตัวเลือก radio button (มีแค่ PromptPay) */}
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setSelectedPaymentType("promptpay")}
              >
                <View style={styles.radioCircle}>
                  {selectedPaymentType === "promptpay" && (
                    <View style={styles.selectedRb} />
                  )}
                </View>
                <Text style={styles.radioLabel}>PromptPay</Text>
              </TouchableOpacity>

              {/* ถ้าเลือก PromptPay ให้แสดงแบบฟอร์มกรอกหมายเลข */}
              {selectedPaymentType === "promptpay" && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="กรอกหมายเลข PromptPay"
                    value={promptpayNumber}
                    onChangeText={setPromptpayNumber}
                    keyboardType={Platform.OS === "ios" ? "default" : "numeric"}
                    placeholderTextColor="#999"
                  />
                  <View style={styles.formButtonContainer}>
                    <TouchableOpacity
                      style={styles.formButton}
                      onPress={handleSubmitPaymentMethod}
                    >
                      <Text style={styles.formButtonText}>บันทึก</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.formButton, styles.cancelButton]}
                      onPress={handleCancelAdd}
                    >
                      <Text
                        style={[
                          styles.formButtonText,
                          styles.cancelButtonText,
                        ]}
                      >
                        ยกเลิก
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  backButton: { marginRight: 10 },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Prompt-Bold",
    color: "#000",
  },
  plusButton: {
    // ปุ่ม + ใช้สีดำโดยอัตโนมัติจากไอคอน
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyContainer: { alignItems: "center", marginTop: 40 },
  emptyText: {
    fontSize: 18,
    fontFamily: "Prompt-Regular",
    color: "#000",
    marginBottom: 20,
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
  actionButton: { marginLeft: 15 },
  // Inline Card สำหรับเพิ่มวิธีการชำระเงิน
  inlineCard: {
    marginTop: 30,
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: "Prompt-Bold",
    color: "#000",
    marginBottom: 15,
    textAlign: "center",
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedRb: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#000",
  },
  radioLabel: {
    marginLeft: 10,
    fontSize: 16,
    fontFamily: "Prompt-Regular",
    color: "#000",
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
    fontFamily: "Prompt-Regular",
    color: "#000",
  },
  formButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  formButton: {
    flex: 1,
    backgroundColor: "#000",
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
    marginHorizontal: 5,
  },
  formButtonText: {
    fontSize: 16,
    fontFamily: "Prompt-Bold",
    color: "#fff",
  },
  cancelButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#000",
  },
  cancelButtonText: {
    color: "#000",
  },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
});
