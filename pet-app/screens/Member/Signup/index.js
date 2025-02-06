import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";

export default function Signup() {
  const navigation = useNavigation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);
  const [errors, setErrors] = useState({});

  // state สำหรับเก็บข้อมูลที่ส่งให้ API
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  // เปลี่ยนชื่อตัวแปรเป็น memberId ให้สอดคล้องกับ API
  const [memberId, setMemberId] = useState(null);

  // state สำหรับข้อมูลโปรไฟล์ (Step 3)
  const [profileData, setProfileData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    profile_image: "", // เก็บ uri ของรูปที่เลือก
  });

  // Request permission สำหรับ ImagePicker เมื่อคอมโพเนนต์ mount
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "ข้อผิดพลาด",
          "ขออภัย, เราต้องการสิทธิ์เข้าถึงห้องภาพเพื่อเลือกภาพโปรไฟล์"
        );
      }
    })();
  }, []);

  // นับถอยหลังสำหรับ resend OTP
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // ฟังก์ชัน validate สำหรับ Step 1 (สมัครสมาชิก)
  const validateRegistration = () => {
    let newErrors = {};
    if (!formData.email) newErrors.email = "กรุณากรอกอีเมล";
    if (!formData.password) newErrors.password = "กรุณากรอกรหัสผ่าน";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ฟังก์ชันสมัครสมาชิก (เชื่อมกับ API)
  const handleSignup = async () => {
    if (!validateRegistration()) return;
    setLoading(true);
    try {
      const response = await fetch("http://192.168.133.111:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        Alert.alert("เกิดข้อผิดพลาด", data.message || "สมัครสมาชิกไม่สำเร็จ");
        return;
      }
      // เก็บ memberId ที่ได้จาก API (ตรวจสอบให้แน่ใจว่า API ส่ง member_id กลับมา)
      setMemberId(data.member_id);
      Alert.alert(
        "สำเร็จ",
        "สมัครสมาชิกสำเร็จ! โปรดยืนยัน OTP ที่ส่งไปที่อีเมลของคุณ"
      );
      setStep(2);
    } catch (error) {
      setLoading(false);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  // ฟังก์ชันตรวจสอบ OTP (เชื่อม API)
  const handleVerifyOTP = async () => {
    if (otp.join("").length < 6) {
      Alert.alert("ข้อผิดพลาด", "กรุณากรอก OTP ให้ครบ 6 หลัก");
      return;
    }
    setLoading(true);
    try {
      // ส่ง member_id แทน user_id
      const response = await fetch("http://192.168.133.111:5000/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId, otp_code: otp.join("") }),
      });
      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        Alert.alert("OTP ไม่ถูกต้อง", data.message || "กรุณาลองใหม่อีกครั้ง");
        return;
      }
      Alert.alert("สำเร็จ", "OTP ถูกต้อง!");
      setStep(3);
    } catch (error) {
      setLoading(false);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  // ฟังก์ชันขอ OTP ใหม่ (เชื่อม API)
  const resendOtp = async () => {
    if (resendTimer > 0) return;
    setResendTimer(10);
    try {
      const response = await fetch("http://192.168.133.111:5000/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });
      if (response.ok) {
        Alert.alert("OTP ใหม่ถูกส่งแล้ว", "กรุณาตรวจสอบอีเมลของคุณ");
      }
    } catch (error) {
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถขอ OTP ใหม่ได้");
    }
  };

  // ฟังก์ชันนับถอยหลัง 3 วินาที (ใน Step 4 หลังจากเปิดบัญชีสำเร็จ)
  const startCountdown = () => {
    let timeLeft = 3;
    const timer = setInterval(() => {
      timeLeft -= 1;
      setCountdown(timeLeft);
      if (timeLeft === 0) {
        clearInterval(timer);
        // หลังจากนับถอยหลังเสร็จ ให้เปลี่ยนไปหน้า Login
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      }
    }, 1000);
  };

  // ฟังก์ชัน validate สำหรับ Step 3 (อัปเดตโปรไฟล์)
  const validateProfile = () => {
    let newErrors = {};
    if (!profileData.first_name) newErrors.first_name = "กรุณากรอกชื่อ";
    if (!profileData.last_name) newErrors.last_name = "กรุณากรอกนามสกุล";
    if (!profileData.phone) newErrors.phone = "กรุณากรอกเบอร์โทรศัพท์";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ฟังก์ชันอัปเดตโปรไฟล์ (เชื่อม API)
  const handleUpdateProfile = async () => {
    if (!validateProfile()) return;
    setLoading(true);
    try {
      const requestBody = {
        member_id: memberId,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        phone: profileData.phone,
        profile_image: profileData.profile_image,
      };
      console.log("Request body:", requestBody);
  
      const response = await fetch("http://192.168.133.111:5000/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
  
      // แทนที่จะเรียก response.json() ทันที ให้ลองแปลงเป็น text ก่อน
      const responseText = await response.text();
      console.log("Response Text:", responseText);
  
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON Parse error:", parseError);
        throw new Error("Response is not valid JSON");
      }
  
      setLoading(false);
  
      if (!response.ok) {
        console.log("API response error:", data);
        Alert.alert("เกิดข้อผิดพลาด", data.message || "ไม่สามารถอัปเดตโปรไฟล์ได้");
        return;
      }
      Alert.alert("สำเร็จ", "โปรไฟล์ของคุณได้รับการอัปเดตเรียบร้อยแล้ว");
      setStep(4);
      startCountdown();
    } catch (error) {
      console.error("Update Profile API error:", error);
      setLoading(false);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  // ฟังก์ชันเปิด ImagePicker เพื่อเลือกรูปโปรไฟล์
  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!result.canceled) {
        // result.assets เป็นอาร์เรย์ที่มี object ของภาพที่เลือก (Expo SDK v48+)
        const selectedImageUri = result.assets[0].uri;
        setProfileData({ ...profileData, profile_image: selectedImageUri });
      }
    } catch (error) {
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเลือกภาพได้");
    }
  };

  return (
    <LinearGradient colors={["#1E1E1E", "#111111"]} style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
        {/* Loader Overlay */}
        {loading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#FFF" />
          </View>
        )}

        {/* ปุ่มย้อนกลับ (แสดงเฉพาะใน Step 1, Step 3 และ Step 4) */}
        {(step === 1 || step === 3 || step === 4) && (
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <AntDesign name="arrowleft" size={24} color="#FFF" />
          </TouchableOpacity>
        )}

        {/* Step 1: สมัครสมาชิก */}
        {step === 1 && (
          <View>
            <Text style={styles.title}>สร้างบัญชี</Text>
            <Text style={styles.subtitle}>กรอกอีเมลและรหัสผ่าน</Text>
            {/* Email Input */}
            <View style={[styles.inputContainer, errors.email && styles.inputError]}>
              <TextInput
                style={styles.input}
                placeholder="อีเมล"
                placeholderTextColor="#777"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
              />
              {errors.email && <MaterialIcons name="error-outline" size={20} color="red" />}
            </View>
            {/* Password Input */}
            <View style={[styles.inputContainer, errors.password && styles.inputError]}>
              <TextInput
                style={styles.input}
                placeholder="รหัสผ่าน"
                placeholderTextColor="#777"
                secureTextEntry
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
              />
              {errors.password && <MaterialIcons name="error-outline" size={20} color="red" />}
            </View>
            <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
              <Text style={styles.buttonText}>
                {loading ? "กำลังสร้างบัญชี..." : "ถัดไป"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: ยืนยัน OTP */}
        {step === 2 && (
          <View>
            <Text style={styles.title}>ยืนยัน OTP</Text>
            <Text style={styles.subtitle}>กรอก OTP 6 หลักที่ส่งไปยังอีเมลของคุณ</Text>
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  style={styles.otpInput}
                  keyboardType="numeric"
                  maxLength={1}
                  value={digit}
                  onChangeText={(text) => {
                    const newOtp = [...otp];
                    newOtp[index] = text;
                    setOtp(newOtp);
                    if (text && index < otp.length - 1) {
                      otpRefs.current[index + 1].focus();
                    }
                  }}
                  ref={(ref) => (otpRefs.current[index] = ref)}
                />
              ))}
            </View>
            <TouchableOpacity style={styles.button} onPress={handleVerifyOTP} disabled={loading}>
              <Text style={styles.buttonText}>
                {loading ? "กำลังตรวจสอบ OTP..." : "ยืนยัน OTP"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={resendOtp} disabled={resendTimer > 0} style={{ marginTop: 10 }}>
              <Text style={{ color: "#FFF", textAlign: "center", fontFamily: "Prompt-Medium" }}>
                {resendTimer > 0 ? `ขอ OTP ใหม่ใน ${resendTimer} วินาที` : "ขอ OTP ใหม่"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: อัปเดตโปรไฟล์ */}
        {step === 3 && (
          <View>
            <Text style={styles.title}>อัปเดตโปรไฟล์</Text>
            <Text style={styles.subtitle}>กรอกข้อมูลส่วนตัวของคุณ</Text>
            {/* รูปโปรไฟล์ (ImagePicker) */}
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {profileData.profile_image ? (
                <Image
                  source={{ uri: profileData.profile_image }}
                  style={styles.profileImage}
                />
              ) : (
                <AntDesign name="user" size={50} color="#FFF" />
              )}
            </TouchableOpacity>
            {/* First Name */}
            <View style={[styles.inputContainer, errors.first_name && styles.inputError]}>
              <TextInput
                style={styles.input}
                placeholder="ชื่อ"
                placeholderTextColor="#777"
                value={profileData.first_name}
                onChangeText={(text) => setProfileData({ ...profileData, first_name: text })}
              />
              {errors.first_name && <MaterialIcons name="error-outline" size={20} color="red" />}
            </View>
            {/* Last Name */}
            <View style={[styles.inputContainer, errors.last_name && styles.inputError]}>
              <TextInput
                style={styles.input}
                placeholder="นามสกุล"
                placeholderTextColor="#777"
                value={profileData.last_name}
                onChangeText={(text) => setProfileData({ ...profileData, last_name: text })}
              />
              {errors.last_name && <MaterialIcons name="error-outline" size={20} color="red" />}
            </View>
            {/* Phone */}
            <View style={[styles.inputContainer, errors.phone && styles.inputError]}>
              <TextInput
                style={styles.input}
                placeholder="เบอร์โทรศัพท์"
                placeholderTextColor="#777"
                keyboardType="phone-pad"
                value={profileData.phone}
                onChangeText={(text) => setProfileData({ ...profileData, phone: text })}
              />
              {errors.phone && <MaterialIcons name="error-outline" size={20} color="red" />}
            </View>
            <TouchableOpacity style={styles.button} onPress={handleUpdateProfile} disabled={loading}>
              <Text style={styles.buttonText}>
                {loading ? "กำลังอัปเดต..." : "บันทึกโปรไฟล์"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 4: เปิดบัญชีสำเร็จ */}
        {step === 4 && (
          <View>
            <Text style={styles.title}>เปิดบัญชีสำเร็จ</Text>
            <Text style={styles.subtitle}>กรุณาเข้าสู่ระบบ</Text>
            <Text style={{ color: "#FFF", textAlign: "center", marginTop: 10 }}>
              กำลังเปลี่ยนหน้าใน {countdown} วินาที...
            </Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 10,
    backgroundColor: "#111111",
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: "Prompt-Bold",
    color: "#FFF",
    marginBottom: 5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    fontFamily: "Prompt-Regular",
    color: "#AAA",
    marginBottom: 30,
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222",
    borderRadius: 50,
    padding: 10,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#FFF",
    fontFamily: "Prompt-Regular",
  },
  inputError: {
    borderWidth: 1,
    borderColor: "red",
  },
  button: {
    backgroundColor: "#FFF",
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#000",
    fontFamily: "Prompt-Bold",
    fontSize: 16,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 20,
  },
  otpInput: {
    backgroundColor: "#222",
    color: "#FFF",
    fontSize: 20,
    textAlign: "center",
    padding: 10,
    borderRadius: 8,
    width: 40,
    fontFamily: "Prompt-Regular",
  },
  imagePicker: {
    alignSelf: "center",
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  loaderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
});
