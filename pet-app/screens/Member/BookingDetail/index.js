import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import promptpay from "promptpay-qr";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import moment from "moment";

export default function BookingDetail() {
  const navigation = useNavigation();
  const route = useRoute();
  // รับ bookingData ที่ส่งมาจากหน้าก่อน (ในตัวอย่างนี้ job คือ bookingData)
  const { bookingData = {} } = route.params || {};
  const job = bookingData;

  const [memberId, setMemberId] = useState(null);
  const [slipImage, setSlipImage] = useState(null);
  const [imageAspectRatio, setImageAspectRatio] = useState(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [serviceTypes, setServiceTypes] = useState([]); // สำหรับข้อมูลประเภทบริการ
  const [petCategories, setPetCategories] = useState([]); // สำหรับข้อมูลประเภทสัตว์เลี้ยง

  const paymentAmount =
    job && job.total_price ? Math.floor(parseFloat(job.total_price)) : 0;

  useEffect(() => {
    const getMemberId = async () => {
      try {
        const storedMemberId = await AsyncStorage.getItem("member_id");
        if (storedMemberId) {
          setMemberId(storedMemberId);
        }
      } catch (error) {
        console.error("Failed to fetch member_id:", error);
      }
    };
    getMemberId();
  }, []);

  // ดึงข้อมูลประเภทบริการ
  useEffect(() => {
    fetch("http://192.168.1.8:5000/api/auth/service-type")
      .then((response) => response.json())
      .then((data) => {
        if (data.serviceTypes) {
          setServiceTypes(data.serviceTypes);
        } else {
          setServiceTypes(data);
        }
      })
      .catch((error) =>
        console.error("Error fetching service types:", error)
      );
  }, []);

  // ดึงข้อมูลประเภทสัตว์เลี้ยง
  useEffect(() => {
    fetch("http://192.168.1.8:5000/api/auth/pet-categories")
      .then((response) => response.json())
      .then((data) => {
        if (data.petCategories) {
          setPetCategories(data.petCategories);
        }
      })
      .catch((error) =>
        console.error("Error fetching pet categories:", error)
      );
  }, []);

  const getServiceTypeShortName = (service_type_id) => {
    const type = serviceTypes.find(
      (typeItem) => typeItem.service_type_id === service_type_id
    );
    return type ? type.short_name : "";
  };

  // ฟังก์ชันช่วยค้นหาชื่อประเภทสัตว์เลี้ยง (type_name) จาก petCategories
  const getPetCategoryName = (pet_type_id) => {
    const category = petCategories.find((cat) => cat.pet_type_id === pet_type_id);
    return category ? category.type_name : "";
  };

  const fetchPaymentMethod = useCallback(() => {
    if (job?.sitter_id) {
      return fetch(
        `http://192.168.1.8:5000/api/auth/payment-methods/${job.sitter_id}`
      )
        .then((response) => response.json())
        .then((data) => {
          if (data.paymentMethods && data.paymentMethods.length > 0) {
            setPaymentMethod(data.paymentMethods[0]);
          }
        })
        .catch((error) =>
          console.error("Error fetching payment method:", error)
        );
    }
    return Promise.resolve();
  }, [job?.sitter_id]);

  useEffect(() => {
    fetchPaymentMethod();
  }, [job?.sitter_id, fetchPaymentMethod]);

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("แจ้งเตือน", "แอปจำเป็นต้องใช้สิทธิ์เข้าถึงคลังรูปภาพ");
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled) {
      const asset = result.assets ? result.assets[0] : result;
      setSlipImage(asset.uri);
      if (asset.width && asset.height) {
        setImageAspectRatio(asset.width / asset.height);
      }
    }
  };

  const removeSlipImage = () => {
    setSlipImage(null);
    setImageAspectRatio(null);
  };

  const createBooking = async () => {
    const createPayload = {
      member_id: memberId,
      sitter_id: job.sitter_id,
      pet_type_id: job.pet_type_id,
      sitter_service_id: job.sitter_service_id,
      service_type_id: job.service_type_id,
      start_date: moment(job.start_date).format("YYYY-MM-DD HH:mm:ss"),
      end_date: moment(job.end_date).format("YYYY-MM-DD HH:mm:ss"),
      total_price: job.total_price,
    };

    const response = await fetch("http://192.168.1.8:5000/api/auth/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createPayload),
    });
    const data = await response.json();
    if (response.ok) {
      return data.booking_id;
    } else {
      throw new Error(data.message || "ไม่สามารถสร้าง Booking ได้");
    }
  };

  const uploadSlip = async (bookingId) => {
    const formData = new FormData();
    formData.append("booking_id", bookingId);
    let filename = slipImage.split("/").pop();
    let match = /\.(\w+)$/.exec(filename);
    let type = match ? `image/${match[1]}` : "image";
    formData.append("image", { uri: slipImage, name: filename, type });

    const response = await fetch(
      "http://192.168.1.8:5000/api/bookings/upload-payment-slip",
      {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      throw new Error(data.message || "อัปโหลดสลิปไม่สำเร็จ");
    }
  };

  const handleConfirmBooking = async () => {
    if (!slipImage) {
      Alert.alert(
        "แจ้งเตือน",
        "กรุณาอัปโหลดสลิปการชำระเงินก่อนยืนยันการจอง"
      );
      return;
    }
    try {
      const newBookingId = await createBooking();
      if (!newBookingId) {
        Alert.alert("เกิดข้อผิดพลาด", "ไม่พบ booking_id จากการสร้าง booking");
        return;
      }
      const slipResult = await uploadSlip(newBookingId);
      Alert.alert("สำเร็จ", slipResult.message || "จองและอัปโหลดสลิปเรียบร้อย");
      navigation.navigate("MemberNavigator", { booking_id: newBookingId });
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("เกิดข้อผิดพลาด", error.message || "ไม่สามารถทำรายการได้");
    }
  };

  if (!job || Object.keys(job).length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.errorText}>ไม่พบข้อมูลงานที่ถูกเลือก</Text>
      </SafeAreaView>
    );
  }

  const currentPromptpayNumber =
    paymentMethod && paymentMethod.promptpay_number
      ? paymentMethod.promptpay_number
      : null;

  const bankDisplay =
    job.sitter_first_name && job.sitter_last_name
      ? `${job.sitter_first_name} ${job.sitter_last_name}`
      : "ไม่ระบุ";

  const promptPayQR = currentPromptpayNumber
    ? promptpay(currentPromptpayNumber, paymentAmount)
    : "";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>รายละเอียดการจอง</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.card, styles.cardTop]}>
          <Text style={styles.titleText}>
            {job.description || "ไม่มีรายละเอียดเพิ่มเติม"}
          </Text>
          <Text style={styles.subTitle}>
            {/* หาก job.service_type_name ว่าง ใช้ getServiceTypeShortName */}
            ประเภทบริการ:{" "}
            {job.service_type_name ||
              getServiceTypeShortName(job.service_type_id) ||
              "ไม่ระบุ"}
          </Text>
          {/* เพิ่มการแสดงประเภทสัตว์เลี้ยง โดยใช้ property pet_type หากมี หรือใช้ getPetCategoryName กับ pet_type_id */}
          <Text style={styles.subTitle}>
            ประเภทสัตว์เลี้ยง:{" "}
            {job.pet_type || getPetCategoryName(job.pet_type_id) || "ไม่ระบุ"}
          </Text>
          <Text style={styles.subTitle}>
            ชื่อ: {job.sitter_first_name || "ไม่ระบุ"} {job.sitter_last_name || ""}
          </Text>
          <Text style={styles.subTitle}>
            เบอร์โทร: {job.sitter_phone || "ไม่ระบุ"}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>ชำระเงิน</Text>
          <Text style={styles.priceText}>฿ {paymentAmount}</Text>
          {currentPromptpayNumber ? (
            <View style={styles.qrContainer}>
              <QRCode value={promptPayQR} size={180} backgroundColor="#fff" color="#000" />
            </View>
          ) : (
            <Text style={[styles.errorText, { textAlign: "center", marginTop: 10 }]}>
              พบปัญหาในการชำระเงิน (ไม่มีข้อมูล PromptPay)
            </Text>
          )}
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentInfoText}>
              PromptPay: {currentPromptpayNumber || "ไม่ระบุ"}
            </Text>
            <Text style={styles.paymentInfoText}>พี่เลี้ยง: {bankDisplay}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>อัปโหลดสลิปการชำระเงิน</Text>
          <TouchableOpacity
            style={[
              styles.imageContainer,
              slipImage && imageAspectRatio && containerWidth
                ? { height: containerWidth / imageAspectRatio }
                : { height: 220 },
            ]}
            onPress={pickImage}
            activeOpacity={0.8}
            onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
          >
            {slipImage ? (
              <>
                <Image source={{ uri: slipImage }} style={styles.slipImage} />
                <TouchableOpacity style={styles.deleteIcon} onPress={removeSlipImage}>
                  <Feather name="x" size={24} color="#fff" />
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.placeholder}>
                <Ionicons name="images" size={36} color="#ccc" style={{ marginBottom: 8 }} />
                <Text style={styles.placeholderText}>แตะเพื่อเลือกรูปภาพ</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.confirmButton, !slipImage && styles.confirmButtonDisabled]}
          onPress={handleConfirmBooking}
          disabled={!slipImage}
        >
          <Text style={styles.confirmButtonText}>ยืนยันการจอง</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    backgroundColor: "#fff",
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontFamily: "Prompt-Bold", color: "#000", marginLeft: 10 },
  container: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: { marginTop: 10 },
  titleText: { fontSize: 18, fontFamily: "Prompt-Bold", color: "#000", marginBottom: 6 },
  subTitle: { fontSize: 14, fontFamily: "Prompt-Medium", color: "#333", marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontFamily: "Prompt-Bold", color: "#000", textAlign: "center", marginBottom: 10 },
  priceText: { fontSize: 22, fontFamily: "Prompt-Bold", color: "#FF0000", textAlign: "center", marginBottom: 12 },
  qrContainer: { alignItems: "center", marginBottom: 12 },
  paymentInfo: { alignItems: "center", marginTop: 4 },
  paymentInfoText: { fontSize: 14, fontFamily: "Prompt-Medium", color: "#000", marginBottom: 4, textAlign: "center" },
  imageContainer: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, overflow: "hidden", justifyContent: "center", alignItems: "center" },
  slipImage: { flex: 1, width: "100%", height: "100%" },
  deleteIcon: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 16, padding: 4 },
  placeholder: { justifyContent: "center", alignItems: "center" },
  placeholderText: { fontSize: 14, color: "#808080", fontFamily: "Prompt-Regular" },
  confirmButton: { backgroundColor: "#000", borderRadius: 25, paddingVertical: 14, alignItems: "center", marginHorizontal: 20 },
  confirmButtonDisabled: { opacity: 0.5 },
  confirmButtonText: { fontSize: 16, fontFamily: "Prompt-Bold", color: "#fff" },
  errorText: { fontSize: 14, fontFamily: "Prompt-Regular", color: "#f00" },
});
