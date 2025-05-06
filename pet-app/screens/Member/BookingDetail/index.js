import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
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
import DateTimePicker from "@react-native-community/datetimepicker";

export default function BookingDetail() {
  const navigation = useNavigation();
  const route = useRoute();
  const { bookingData = {} } = route.params || {};
  const job = bookingData;

  const [memberId, setMemberId] = useState(null);
  const [slipImage, setSlipImage] = useState(null);
  const [imageAspectRatio, setImageAspectRatio] = useState(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [petCategories, setPetCategories] = useState([]);
  const [bookingDate, setBookingDate] = useState(new Date());  // Default to current date
  const [startTime, setStartTime] = useState("");  // Default to empty string
  const [endTime, setEndTime] = useState("");  // Default to empty string
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [quantity, setQuantity] = useState(''); // Quantity of pets

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

  // Fetch service types
  useEffect(() => {
    fetch("http://192.168.1.12:5000/api/auth/service-type")
      .then((response) => response.json())
      .then((data) => {
        if (data.serviceTypes) {
          setServiceTypes(data.serviceTypes);
        }
      })
      .catch((error) => console.error("Error fetching service types:", error));
  }, []);

  // Fetch pet categories
  useEffect(() => {
    fetch("http://192.168.1.12:5000/api/auth/pet-categories")
      .then((response) => response.json())
      .then((data) => {
        if (data.petCategories) {
          setPetCategories(data.petCategories);
        }
      })
      .catch((error) => console.error("Error fetching pet categories:", error));
  }, []);

  const getServiceTypeShortName = (service_type_id) => {
    const type = serviceTypes.find(
      (typeItem) => typeItem.service_type_id === service_type_id
    );
    return type ? type.short_name : "ไม่ระบุ";
  };

  const getPetCategoryName = (pet_type_id) => {
    const category = petCategories.find((cat) => cat.pet_type_id === pet_type_id);
    return category ? category.type_name : "ไม่ระบุ";
  };

  const fetchPaymentMethod = useCallback(() => {
    if (job?.sitter_id) {
      return fetch(
        `http://192.168.1.12:5000/api/auth/payment-methods/${job.sitter_id}`
      )
        .then((response) => response.json())
        .then((data) => {
          if (data.paymentMethods && data.paymentMethods.length > 0) {
            setPaymentMethod(data.paymentMethods[0]);
          }
        })
        .catch((error) => console.error("Error fetching payment method:", error));
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
    // ตรวจสอบว่า start_time และ end_time ถูกกำหนดหรือไม่
    if (!startTime || !endTime) {
      Alert.alert("แจ้งเตือน", "กรุณาระบุเวลาเริ่มต้นและเวลาสิ้นสุด");
      return;
    }

    const createPayload = {
      member_id: memberId,
      sitter_id: job.sitter_id,
      pet_type_id: job.pet_type_id,
      sitter_service_id: job.sitter_service_id,
      service_type_id: job.service_type_id,
      start_time: moment(bookingDate).format("YYYY-MM-DD") + " " + moment(startTime, "HH:mm").format("HH:mm:ss"),
      end_time: moment(bookingDate).format("YYYY-MM-DD") + " " + moment(endTime, "HH:mm").format("HH:mm:ss"),
      total_price: job.total_price,
      pet_quantity: quantity, // Add pet quantity here
    };

    console.log("Payload for booking:", createPayload); // Log payload to check data

    const response = await fetch("http://192.168.1.12:5000/api/auth/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createPayload),
    });
    const data = await response.json();

    console.log("API response:", data); // Log response from API

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
      "http://192.168.1.12:5000/api/bookings/upload-payment-slip",
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
    // เช็คว่า slipImage มีข้อมูลหรือไม่
    if (!slipImage) {
      Alert.alert(
        "แจ้งเตือน",
        "กรุณาอัปโหลดสลิปการชำระเงินก่อนยืนยันการจอง"
      );
      return;
    }
    try {
      // สร้างการจอง
      const newBookingId = await createBooking();
      if (!newBookingId) {
        Alert.alert("เกิดข้อผิดพลาด", "ไม่พบ booking_id จากการสร้าง booking");
        return;
      }
      // อัปโหลดสลิป
      const slipResult = await uploadSlip(newBookingId);
      Alert.alert("สำเร็จ", slipResult.message || "จองและอัปโหลดสลิปเรียบร้อย");
      // นำทางไปยังหน้าต่างต่อไป
      navigation.navigate("MemberNavigator", { booking_id: newBookingId });
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("เกิดข้อผิดพลาด", error.message || "ไม่สามารถทำรายการได้");
    }
  };
  const handleDateChange = (event, selectedDate) => {
    if (selectedDate) {
      setBookingDate(selectedDate);
    }
    setShowDatePicker(false);
  };

  const handleStartTimeChange = (event, selectedTime) => {
    if (selectedTime) {
      setStartTime(moment(selectedTime).format("HH:mm"));
    }
    setShowStartTimePicker(false);
  };

  const handleEndTimeChange = (event, selectedTime) => {
    if (selectedTime) {
      setEndTime(moment(selectedTime).format("HH:mm"));
    }
    setShowEndTimePicker(false);
  };

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
        {/* Booking Details Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>รายละเอียดบริการที่เลือก</Text>
          <Text style={styles.subTitle}>
            ประเภทบริการ: {job.service_type_name || getServiceTypeShortName(job.service_type_id) || "ไม่ระบุ"}
          </Text>
          <Text style={styles.subTitle}>
            ประเภทสัตว์เลี้ยง: {job.pet_type || getPetCategoryName(job.pet_type_id) || "ไม่ระบุ"}
          </Text>
          <Text style={styles.subTitle}>
            ชื่อพี่เลี้ยง: {job.sitter_first_name || "ไม่ระบุ"} {job.sitter_last_name || ""}
          </Text>
          <Text style={styles.subTitle}>
            เบอร์โทร: {job.sitter_phone || "ไม่ระบุ"}
          </Text>
        </View>

        {/* Date and Time Selection Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>กรอกรายละเอียด</Text>

          {/* Date Picker */}
          <View style={styles.datePicker}>
            <Text style={styles.label}>วันที่จอง:</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.pickerButton}>
              <Text style={styles.datePickerText}>
                {bookingDate ? `${moment(bookingDate).format('YYYY-MM-DD')}` : "เลือกวันที่"}
              </Text>
              <Feather name="chevron-right" size={16} color="#000" />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={bookingDate}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}
          </View>

          {/* Start Time Picker */}
          <View style={styles.datePicker}>
            <Text style={styles.label}>เวลาเริ่มต้น:</Text>
            <TouchableOpacity onPress={() => setShowStartTimePicker(true)} style={styles.pickerButton}>
              <Text style={styles.datePickerText}>
                {startTime ? startTime : "เลือกเวลาเริ่มต้น"}
              </Text>
              <Feather name="chevron-right" size={16} color="#000" />
            </TouchableOpacity>
            {showStartTimePicker && (
              <DateTimePicker
                value={startTime ? moment(startTime, "HH:mm").toDate() : new Date()}
                mode="time"
                display="default"
                onChange={handleStartTimeChange}
              />
            )}
          </View>

          {/* End Time Picker */}
          <View style={styles.datePicker}>
            <Text style={styles.label}>เวลาสิ้นสุด:</Text>
            <TouchableOpacity onPress={() => setShowEndTimePicker(true)} style={styles.pickerButton}>
              <Text style={styles.datePickerText}>
                {endTime ? endTime : "เลือกเวลาสิ้นสุด"}
              </Text>
              <Feather name="chevron-right" size={16} color="#000" />
            </TouchableOpacity>
            {showEndTimePicker && (
              <DateTimePicker
                value={endTime ? moment(endTime, "HH:mm").toDate() : new Date()}
                mode="time"
                display="default"
                onChange={handleEndTimeChange}
              />
            )}
          </View>

          {/* Pet Quantity Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>จำนวนสัตว์เลี้ยง:</Text>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* QR Code and Payment Slip Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>ชำระเงิน</Text>
          <Text style={styles.priceText}>฿ {paymentAmount}</Text>
          {paymentMethod && paymentMethod.promptpay_number ? (
            <View style={styles.qrContainer}>
              <QRCode value={promptpay(paymentMethod.promptpay_number, paymentAmount)} size={180} backgroundColor="#fff" color="#000" />
            </View>
          ) : (
            <Text style={[styles.errorText, { textAlign: "center", marginTop: 10 }]}>
              พบปัญหาในการชำระเงิน (ไม่มีข้อมูล PromptPay)
            </Text>
          )}
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentInfoText}>PromptPay: {paymentMethod?.promptpay_number || "ไม่ระบุ"}</Text>
            <Text style={styles.paymentInfoText}>พี่เลี้ยง: {job.sitter_first_name} {job.sitter_last_name}</Text>
          </View>
        </View>

        {/* Upload Payment Slip */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>อัปโหลดสลิปการชำระเงิน</Text>
          <TouchableOpacity
            style={[styles.imageContainer, slipImage && imageAspectRatio && containerWidth ? { height: containerWidth / imageAspectRatio } : { height: 220 }]}
            onPress={pickImage}  // เรียก pickImage เพื่อให้สามารถเลือกภาพได้
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
          onPress={handleConfirmBooking}  // เรียกใช้งาน handleConfirmBooking
          disabled={!slipImage}  // ปิดใช้งานปุ่มหากยังไม่ได้เลือกสลิป
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
  sectionTitle: { fontSize: 16, fontFamily: "Prompt-Bold", color: "#000", textAlign: "center", marginBottom: 10 },
  subTitle: { fontSize: 14, fontFamily: "Prompt-Medium", color: "#333", marginBottom: 4 },
  label: { fontSize: 14, fontFamily: "Prompt-Medium", color: "#333", flex: 1, textAlign: "left" },
  datePicker: { flexDirection: "row", alignItems: "center", marginVertical: 10 },
  datePickerText: { fontSize: 16, fontFamily: "Prompt-Bold", color: "#000" },
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
  pickerButton: { flexDirection: "row", alignItems: "center" },
  inputContainer: {
    marginVertical: 10,
    flexDirection: "row",  // Align the input container to the right
    justifyContent: "flex-end", // Align the input to the right
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 6, // Adjust vertical padding to make it smaller
    paddingHorizontal: 10, // Adjust horizontal padding to make it more compact
    fontSize: 14, // You can keep the font size the same or adjust slightly
    fontFamily: "Prompt-Regular",
    width: 80,  // Adjust the width to a more compact size
    height: 35, // Set a smaller height for the input field
  },
});
