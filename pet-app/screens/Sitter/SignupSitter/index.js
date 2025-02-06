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
import { StatusBar } from "expo-status-bar";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

export default function CombinedSignUp({ navigation }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // ===== Step 1 & 2 (สมัคร / ยืนยัน OTP) =====
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [sitterId, setSitterId] = useState(null); // เก็บค่า sitter_id จาก /register-sitter

  // สำหรับ OTP
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);

  // ===== Step 3: อัปเดตโปรไฟล์ (รวมที่อยู่) =====
  const [profileData, setProfileData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    profile_image: "", // URI ของรูปโปรไฟล์
    address: "",       // ที่อยู่
    province: "",      // จังหวัด
    amphure: "",       // อำเภอ
    tambon: "",        // ตำบล
  });

  // ===== Step 4: อัปโหลดเอกสาร (ใบหน้า และบัตรประชาชน) =====
  const [documentData, setDocumentData] = useState({
    faceImage: "",
    idCardImage: "",
  });

  // Errors
  const [errors, setErrors] = useState({});

  // ขอ permission สำหรับ ImagePicker
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("ขออภัย", "แอปต้องการสิทธิ์เข้าถึงรูปภาพในเครื่อง");
      }
    })();
  }, []);

  // ฟังก์ชันแสดง loader overlay เมื่อ loading เป็น true
  const renderLoader = () => (
    <View style={styles.loaderContainer}>
      <ActivityIndicator size="large" color="#FFF" />
    </View>
  );

  // ฟังก์ชันขอ OTP ใหม่ (ตัวอย่างจำลอง API)
  const resendOtp = async () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert("สำเร็จ", "OTP ใหม่ถูกส่งแล้ว");
      // ล้าง OTP fields
      setOtp(["", "", "", "", "", ""]);
    }, 2000);
  };

  // ---------------------------------------------
  // Step 1: POST /register-sitter
  // ---------------------------------------------
  const validateRegistration = () => {
    let newErrors = {};
    if (!formData.email) newErrors.email = "กรุณากรอกอีเมล";
    if (!formData.password) newErrors.password = "กรุณากรอกรหัสผ่าน";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateRegistration()) return;
    setLoading(true);
    try {
      const response = await fetch("http://192.168.133.111:5000/api/sitter/register-sitter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });
      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        Alert.alert("เกิดข้อผิดพลาด", data.message || "สมัครพี่เลี้ยงไม่สำเร็จ");
        return;
      }
      setSitterId(data.sitter_id);
      // เปลี่ยนขั้นตอนไปยัง Step 2
      setStep(2);
    } catch (error) {
      setLoading(false);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  // ---------------------------------------------
  // Step 2: POST /verify-otp-sitter
  // ---------------------------------------------
  const handleVerifyOTP = async () => {
    if (otp.join("").length < 6) {
      Alert.alert("ข้อผิดพลาด", "กรุณากรอก OTP ให้ครบ 6 หลัก");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("http://192.168.133.111:5000/api/sitter/verify-otp-sitter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sitter_id: sitterId,
          otp_code: otp.join(""),
        }),
      });
      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        Alert.alert("OTP ไม่ถูกต้อง", data.message || "กรุณาลองใหม่");
        return;
      }
      setStep(3);
    } catch (error) {
      setLoading(false);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  // ---------------------------------------------
  // Step 3: POST /update-profile-sitter
  // ---------------------------------------------
  const validateProfile = () => {
    let newErrors = {};
    if (!profileData.first_name) newErrors.first_name = "กรุณากรอกชื่อ";
    if (!profileData.last_name) newErrors.last_name = "กรุณากรอกนามสกุล";
    if (!profileData.phone) newErrors.phone = "กรุณากรอกเบอร์โทรศัพท์";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateProfile = async () => {
    if (!validateProfile()) return;
    setLoading(true);
    try {
      const response = await fetch("http://192.168.133.111:5000/api/sitter/update-profile-sitter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sitter_id: sitterId,
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          phone: profileData.phone,
          profile_image: profileData.profile_image,
          address: profileData.address,
          province: profileData.province,
          amphure: profileData.amphure,
          tambon: profileData.tambon,
        }),
      });
      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        Alert.alert("เกิดข้อผิดพลาด", data.message || "ไม่สามารถอัปเดตโปรไฟล์ได้");
        return;
      }
      // เปลี่ยนขั้นตอนไปยัง Step 4
      setStep(4);
    } catch (error) {
      setLoading(false);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  // ---------------------------------------------
  // Step 4: POST /verify-account (อัปโหลดเอกสารยืนยันตัวตน)
  // ---------------------------------------------
  const validateDocuments = () => {
    let newErrors = {};
    if (!documentData.faceImage) newErrors.faceImage = "กรุณาเลือกรูปใบหน้า";
    if (!documentData.idCardImage) newErrors.idCardImage = "กรุณาเลือกรูปบัตรประชาชน";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUploadDocuments = async () => {
    if (!validateDocuments()) return;
    setLoading(true);
    try {
      const response = await fetch("http://192.168.133.111:5000/api/sitter/verify-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sitter_id: sitterId,
          face_image: documentData.faceImage,
          id_card_image: documentData.idCardImage,
        }),
      });
      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        Alert.alert("เกิดข้อผิดพลาด", data.message || "ไม่สามารถส่งเอกสารได้");
        return;
      }
      // เปลี่ยนขั้นตอนไปยัง Step 5
      setStep(5);
    } catch (error) {
      setLoading(false);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  // ฟังก์ชันเลือกภาพ (สำหรับ profile และเอกสาร)
  const pickImage = async (key) => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!result.canceled) {
        const selectedImageUri = result.assets[0].uri;
        if (key === "profile_image") {
          setProfileData({ ...profileData, profile_image: selectedImageUri });
        } else {
          setDocumentData({ ...documentData, [key]: selectedImageUri });
        }
      }
    } catch (error) {
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเลือกภาพได้");
    }
  };

  // ---------------------------------------------
  // renderStep: แสดง UI ตามขั้นตอน
  // ---------------------------------------------
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View>
            <Text style={styles.title}>สมัครเป็นพี่เลี้ยง</Text>
            <Text style={styles.subtitle}>กรอกอีเมลและรหัสผ่าน</Text>

            <View style={[styles.inputContainer, errors.email && styles.errorBorder]}>
              <TextInput
                style={styles.input}
                placeholder="อีเมล"
                placeholderTextColor="#CCC"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
              />
              {errors.email && <MaterialIcons name="error-outline" size={20} color="red" />}
            </View>

            <View style={[styles.inputContainer, errors.password && styles.errorBorder]}>
              <TextInput
                style={styles.input}
                placeholder="รหัสผ่าน"
                placeholderTextColor="#CCC"
                secureTextEntry
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
              />
              {errors.password && <MaterialIcons name="error-outline" size={20} color="red" />}
            </View>

            <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? "กำลังสมัคร..." : "ถัดไป"}</Text>
            </TouchableOpacity>
          </View>
        );

      case 2:
        return (
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
              <Text style={styles.buttonText}>{loading ? "กำลังตรวจสอบ..." : "ยืนยัน OTP"}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={resendOtp} style={styles.linkContainer}>
              <Text style={styles.linkText}>ขอ OTP ใหม่</Text>
            </TouchableOpacity>
          </View>
        );

      case 3:
        return (
          <View>
            <Text style={styles.title}>อัปเดตโปรไฟล์พี่เลี้ยง</Text>
            <Text style={styles.subtitle}>กรอกข้อมูลส่วนตัว</Text>

            <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage("profile_image")}>
              {profileData.profile_image ? (
                <Image source={{ uri: profileData.profile_image }} style={styles.profileImage} />
              ) : (
                <View style={styles.defaultProfile}>
                  <AntDesign name="user" size={48} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="ชื่อ"
                placeholderTextColor="#CCC"
                value={profileData.first_name}
                onChangeText={(text) => setProfileData({ ...profileData, first_name: text })}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="นามสกุล"
                placeholderTextColor="#CCC"
                value={profileData.last_name}
                onChangeText={(text) => setProfileData({ ...profileData, last_name: text })}
              />
            </View>

            <View style={[styles.inputContainer, errors.phone && styles.errorBorder]}>
              <TextInput
                style={styles.input}
                placeholder="เบอร์โทร"
                placeholderTextColor="#CCC"
                keyboardType="phone-pad"
                value={profileData.phone}
                onChangeText={(text) => setProfileData({ ...profileData, phone: text })}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="ที่อยู่"
                placeholderTextColor="#CCC"
                value={profileData.address}
                onChangeText={(text) => setProfileData({ ...profileData, address: text })}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="จังหวัด"
                placeholderTextColor="#CCC"
                value={profileData.province}
                onChangeText={(text) => setProfileData({ ...profileData, province: text })}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="อำเภอ"
                placeholderTextColor="#CCC"
                value={profileData.amphure}
                onChangeText={(text) => setProfileData({ ...profileData, amphure: text })}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="ตำบล"
                placeholderTextColor="#CCC"
                value={profileData.tambon}
                onChangeText={(text) => setProfileData({ ...profileData, tambon: text })}
              />
            </View>

            <TouchableOpacity style={styles.button} onPress={handleUpdateProfile} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? "กำลังอัปเดต..." : "บันทึกโปรไฟล์"}</Text>
            </TouchableOpacity>
          </View>
        );

      case 4:
        return (
          <View>
            <Text style={styles.title}>อัปโหลดเอกสารยืนยันตัวตน</Text>
            <Text style={styles.subtitle}>กรุณาอัปโหลดรูปใบหน้าและบัตรประชาชน</Text>

            <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage("faceImage")}>
              {documentData.faceImage ? (
                <Image source={{ uri: documentData.faceImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.defaultProfile}>
                  <AntDesign name="idcard" size={48} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.caption}>รูปใบหน้า</Text>

            <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage("idCardImage")}>
              {documentData.idCardImage ? (
                <Image source={{ uri: documentData.idCardImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.defaultProfile}>
                  <AntDesign name="idcard" size={48} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.caption}>รูปบัตรประชาชน</Text>

            <TouchableOpacity style={styles.button} onPress={handleUploadDocuments} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? "กำลังส่งเอกสาร..." : "ส่งเอกสาร"}</Text>
            </TouchableOpacity>
          </View>
        );

      case 5:
        return (
          <View>
            <Text style={styles.title}>รอตรวจสอบเอกสาร</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.reset({ index: 0, routes: [{ name: "Login" }] })}
            >
              <Text style={styles.buttonText}>ไปหน้าเข้าสู่ระบบ</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {loading && renderLoader()}
      {step !== 1 && (
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(step - 1)}>
          <AntDesign name="arrowleft" size={24} color="#FFF" />
        </TouchableOpacity>
      )}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderStep()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000", // พื้นหลังดำ
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 10,
  },
  title: {
    fontSize: 24,
    fontFamily: "Prompt-Bold",
    color: "#FFF", // ตัวหนังสือสีขาว
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Prompt-Regular",
    color: "#CCC", // สีเทาอ่อน
    marginBottom: 20,
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#333", // พื้นหลังเข้ม
    borderRadius: 50,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Prompt-Regular",
    color: "#FFF",
    paddingVertical: 10,
  },
  errorBorder: {
    borderWidth: 1,
    borderColor: "red",
  },
  button: {
    backgroundColor: "#FFF", // ปุ่มสีขาว
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#000", // ตัวอักษรสีดำในปุ่มสีขาว
    fontFamily: "Prompt-Bold",
    fontSize: 16,
  },
  linkText: {
    fontSize: 14,
    fontFamily: "Prompt-Medium",
    color: "#FFF",
    textAlign: "center",
    textDecorationLine: "underline",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginBottom: 20,
  },
  otpInput: {
    backgroundColor: "#333", // พื้นหลังเข้ม
    textAlign: "center",
    fontSize: 20,
    width: 40,
    borderRadius: 8,
    fontFamily: "Prompt-Regular",
    color: "#FFF",
  },
  imagePicker: {
    alignSelf: "center",
    marginBottom: 10,
  },
  defaultProfile: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#666", // สีเทาเข้ม
    justifyContent: "center",
    alignItems: "center",
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    resizeMode: "cover",
  },
  caption: {
    textAlign: "center",
    color: "#FFF",
    marginBottom: 10,
    fontFamily: "Prompt-Regular",
  },
  loaderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
});


