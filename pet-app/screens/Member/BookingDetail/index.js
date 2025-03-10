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
import {
  Feather,
  MaterialIcons,
  FontAwesome,
  Ionicons,
} from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import * as ImagePicker from "expo-image-picker";

export default function BookingDetail() {
  const navigation = useNavigation();
  const route = useRoute();
  // รับค่า job จาก route.params พร้อม fallback เป็น object ว่าง
  const { job } = route.params || {};

  if (!job) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.errorText}>ไม่พบข้อมูลงานที่ถูกเลือก</Text>
      </SafeAreaView>
    );
  }

  // State สำหรับเก็บข้อมูลต่างๆ
  const [sitter, setSitter] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  // slipImage จะเก็บค่าเป็น URI หรือ URL ของรูปที่อัปโหลดแล้ว
  const [slipImage, setSlipImage] = useState(null);
  // State สำหรับเก็บอัตราส่วนของรูป (width/height)
  const [imageAspectRatio, setImageAspectRatio] = useState(null);
  // State สำหรับเก็บความกว้างของ container ที่ใช้แสดงรูป
  const [containerWidth, setContainerWidth] = useState(0);
  const [memberId, setMemberId] = useState(null);

  // คำนวณจำนวนเงินจาก job.price
  const paymentAmount = Math.floor(parseFloat(job.price));

  // ดึง member_id จาก AsyncStorage
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

  // ฟังก์ชันดึงข้อมูลพี่เลี้ยง
  const fetchSitterDetails = useCallback(() => {
    if (job?.sitter_id) {
      return fetch(`http://192.168.1.10:5000/api/auth/sitter/${job.sitter_id}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.sitter) {
            setSitter(data.sitter);
          }
        })
        .catch((error) =>
          console.error("Error fetching sitter details:", error)
        );
    }
    return Promise.resolve();
  }, [job?.sitter_id]);

  // ฟังก์ชันดึงข้อมูลวิธีชำระเงิน
  const fetchPaymentMethod = useCallback(() => {
    if (job?.sitter_id) {
      return fetch(
        `http://192.168.1.10:5000/api/auth/payment-methods/${job.sitter_id}`
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

  // ฟังก์ชันดึงข้อมูลประเภทบริการ
  const fetchServiceTypes = useCallback(() => {
    return fetch("http://192.168.1.10:5000/api/auth/service-type")
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

  useEffect(() => {
    fetchSitterDetails();
    fetchPaymentMethod();
    fetchServiceTypes();
  }, [job?.sitter_id, fetchSitterDetails, fetchPaymentMethod, fetchServiceTypes]);

  // ฟังก์ชันรีเฟรชข้อมูล
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchSitterDetails(), fetchPaymentMethod(), fetchServiceTypes()]).finally(() =>
      setRefreshing(false)
    );
  }, [fetchSitterDetails, fetchPaymentMethod, fetchServiceTypes]);

  // ฟังก์ชันเลือกรูปสลิป (ไม่ครอบรูป)
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert("ขออภัย, แอปจำเป็นต้องใช้สิทธิ์เข้าถึงคลังรูปภาพ");
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

  // ฟังก์ชันสำหรับส่งสลิปการจองไปให้ Admin ตรวจสอบ
  const handleConfirmBooking = async () => {
    if (!slipImage) {
      alert("กรุณาอัปโหลดสลิปการชำระเงินก่อนยืนยันการจอง");
      return;
    }
    const formData = new FormData();
    formData.append("booking_id", job?.booking_id);
    let filename = slipImage.split("/").pop();
    let match = /\.(\w+)$/.exec(filename);
    let type = match ? `image/${match[1]}` : "image";
    formData.append("image", { uri: slipImage, name: filename, type });
    try {
      const response = await fetch(
        "http://192.168.1.10:5000/api/bookings/upload-payment-slip",
        {
          method: "POST",
          body: formData,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      const resData = await response.json();
      if (response.ok) {
        alert(resData.message);
        setSlipImage(resData.url);
        navigation.navigate("MemberNavigator", { booking_id: job.booking_id });
      } else {
        alert("เกิดข้อผิดพลาด: " + resData.message);
      }
    } catch (error) {
      console.error("Error submitting booking slip:", error);
      alert("เกิดข้อผิดพลาดในการส่งสลิป");
    }
  };

  if (!sitter) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.errorText}>ไม่พบข้อมูลพี่เลี้ยง</Text>
      </SafeAreaView>
    );
  }

  // กำหนดค่า QR Code สำหรับ PromptPay (หากมีการใช้งาน)
  const currentPromptpayNumber =
    paymentMethod && paymentMethod.promptpay_number
      ? paymentMethod.promptpay_number
      : "0812345678";
  const bankName =
    paymentMethod && paymentMethod.bank_name ? paymentMethod.bank_name : "ธนาคารไม่ระบุ";

  // ดึงชื่อประเภทบริการจาก job
  const serviceTypeName =
    serviceTypes.find((st) => st.service_type_id === job?.service_type_id)?.short_name ||
    "ไม่ระบุ";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>รายละเอียดการจอง</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Card 1: รายละเอียดงานและข้อมูลพี่เลี้ยง */}
        <View style={[styles.card, styles.cardTop]}>
          <Text style={[styles.jobTitle, styles.leftAlignedText]}>{job.description}</Text>
          <Text style={[styles.serviceTypeText, styles.leftAlignedText]}>
            ประเภทบริการ: {serviceTypeName}
          </Text>
          {sitter && (
            <View style={styles.sitterInfoContainer}>
              <Text style={[styles.sitterInfo, styles.leftAlignedText]}>
                ชื่อ: {sitter.first_name} {sitter.last_name}
              </Text>
              <Text style={[styles.sitterInfo, styles.leftAlignedText]}>
                เบอร์โทร: {sitter.phone}
              </Text>
            </View>
          )}
        </View>

        {/* Card 2: รายละเอียดการชำระเงิน */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>ชำระเงิน</Text>
          <Text style={styles.jobPrice}>ราคา: {paymentAmount} บาท</Text>
          <View style={styles.qrContainer}>
            <QRCode
              value={currentPromptpayNumber + paymentAmount}
              size={150}
              backgroundColor="#fff"
              color="#000"
            />
          </View>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentInfoText}>PromptPay: {currentPromptpayNumber}</Text>
            <Text style={styles.paymentInfoText}>ธนาคาร: {bankName}</Text>
          </View>
        </View>

        {/* Card 3: อัปโหลดสลิปการชำระเงิน */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>อัปโหลดสลิปการชำระเงิน</Text>
          <TouchableOpacity
            style={[
              styles.imageContainer,
              slipImage && imageAspectRatio && containerWidth
                ? { height: containerWidth / imageAspectRatio }
                : { height: 200 },
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
                <Text style={styles.placeholderText}>แตะเพื่อเลือกรูปภาพ</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ปุ่มยืนยันการจอง */}
        <TouchableOpacity
          style={[styles.confirmButton, (!slipImage) && styles.confirmButtonDisabled]}
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
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontFamily: "Prompt-Medium", color: "#000", marginLeft: 10 },
  container: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: { alignItems: "flex-start" },
  leftAlignedText: { textAlign: "left", width: "100%" },
  jobTitle: { fontSize: 22, fontFamily: "Prompt-Bold", color: "#000", marginBottom: 10 },
  jobPrice: { fontSize: 18, fontFamily: "Prompt-Bold", color: "#FF0000", textAlign: "center", marginBottom: 15 },
  serviceTypeText: { fontSize: 16, fontFamily: "Prompt-Regular", color: "#000", marginBottom: 10 },
  sitterInfoContainer: { marginTop: 10, alignItems: "flex-start" },
  sitterInfo: { fontSize: 16, fontFamily: "Prompt-Regular", color: "#000", marginBottom: 5 },
  sectionTitle: { fontSize: 18, fontFamily: "Prompt-Bold", color: "#000", textAlign: "center", marginBottom: 15 },
  qrContainer: { alignItems: "center", marginBottom: 15 },
  paymentInfo: { alignItems: "center" },
  paymentInfoText: { fontSize: 16, fontFamily: "Prompt-Regular", color: "#000", marginBottom: 5, textAlign: "center" },
  imageContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  slipImage: { flex: 1, width: "100%", height: "100%" },
  deleteIcon: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 15,
    padding: 5,
  },
  placeholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  placeholderText: { fontSize: 16, color: "#808080" },
  confirmButton: {
    backgroundColor: "#000",
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: "center",
    marginHorizontal: 20,
  },
  confirmButtonDisabled: { opacity: 0.5 },
  confirmButtonText: { fontSize: 16, fontFamily: "Prompt-Bold", color: "#fff" },
});
