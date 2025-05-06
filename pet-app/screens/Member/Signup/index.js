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
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";

export default function MemberSignup() {
  const navigation = useNavigation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Loader Animated Dots
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  const dot4 = useRef(new Animated.Value(0)).current;

  const createAnimation = (animatedValue, delay) => {
    return Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: -10,
          duration: 300,
          useNativeDriver: true,
          delay: delay,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ])
    );
  };

  const dotAnims = useRef([]);
  useEffect(() => {
    if (loading) {
      dotAnims.current = [
        createAnimation(dot1, 0),
        createAnimation(dot2, 150),
        createAnimation(dot3, 300),
        createAnimation(dot4, 450),
      ];
      dotAnims.current.forEach((anim) => anim.start());
    } else {
      dotAnims.current.forEach((anim) => anim.stop());
      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);
      dot4.setValue(0);
    }
  }, [loading, dot1, dot2, dot3, dot4]);

  const renderLoader = () => (
    <View style={styles.loaderContainer}>
      <View style={styles.loaderRow}>
        <Animated.View
          style={[styles.loaderDot, { transform: [{ translateY: dot1 }] }]}
        />
        <Animated.View
          style={[styles.loaderDot, { transform: [{ translateY: dot2 }] }]}
        />
        <Animated.View
          style={[styles.loaderDot, { transform: [{ translateY: dot3 }] }]}
        />
        <Animated.View
          style={[styles.loaderDot, { transform: [{ translateY: dot4 }] }]}
        />
      </View>
    </View>
  );

  // Step 1: สมัครสมาชิก (Email, Password)
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [memberId, setMemberId] = useState(null);

  // Step 2: ยืนยัน OTP
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);

  // Step 3: อัปเดตโปรไฟล์ (ชื่อ, นามสกุล, เบอร์, ที่อยู่, ตำบล, อำเภอ, จังหวัด, รูปโปรไฟล์)
  const [profileData, setProfileData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
    tambon: "",
    amphure: "",
    province: "",
    profile_image: "",
  });
  const [errors, setErrors] = useState({});

  // ขอสิทธิ์เข้าถึงรูปภาพ
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "ขออภัย",
          "แอปต้องการสิทธิ์เข้าถึงรูปภาพในเครื่องเพื่อเลือกรูปโปรไฟล์"
        );
      }
    })();
  }, []);

  // Validate สำหรับสมัครสมาชิก
  const validateRegistration = () => {
    let newErrors = {};
    if (!formData.email) newErrors.email = "กรุณากรอกอีเมล";
    if (!formData.password) newErrors.password = "กรุณากรอกรหัสผ่าน";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ฟังก์ชันสมัครสมาชิก
  const handleSignup = async () => {
    if (!validateRegistration()) return;
    setLoading(true);
    try {
      const response = await fetch("http://192.168.1.12:5000/api/auth/register", {
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
      setMemberId(data.member_id);
      Alert.alert("สำเร็จ", "OTP ได้ถูกส่งไปยังอีเมลของคุณ");
      setStep(2);
    } catch (error) {
      setLoading(false);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  // Validate สำหรับ OTP
  const validateOTP = () => {
    if (otp.join("").length < 6) {
      Alert.alert("ข้อผิดพลาด", "กรุณากรอก OTP ให้ครบ 6 หลัก");
      return false;
    }
    return true;
  };

  // ฟังก์ชันยืนยัน OTP
  const handleVerifyOTP = async () => {
    if (!validateOTP()) return;
    setLoading(true);
    try {
      const response = await fetch("http://192.168.1.12:5000/api/auth/verify-otp", {
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
      setStep(3);
    } catch (error) {
      setLoading(false);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  // Validate สำหรับโปรไฟล์
  const validateProfile = () => {
    let newErrors = {};
    if (!profileData.first_name) newErrors.first_name = "กรุณากรอกชื่อ";
    if (!profileData.last_name) newErrors.last_name = "กรุณากรอกนามสกุล";
    if (!profileData.phone) newErrors.phone = "กรุณากรอกเบอร์โทรศัพท์";
    if (!profileData.address) newErrors.address = "กรุณากรอกที่อยู่";
    if (!profileData.tambon) newErrors.tambon = "กรุณากรอกตำบล";
    if (!profileData.amphure) newErrors.amphure = "กรุณากรอกอำเภอ";
    if (!profileData.province) newErrors.province = "กรุณากรอกจังหวัด";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ฟังก์ชันอัปเดตโปรไฟล์
  const handleUpdateProfile = async () => {
    if (!validateProfile()) return;
    setLoading(true);
    try {
      const payload = {
        member_id: memberId,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        phone: profileData.phone,
        address: profileData.address,
        profile_image: profileData.profile_image,
        tambon: profileData.tambon,
        amphure: profileData.amphure,
        province: profileData.province,
      };

      const response = await fetch("http://192.168.1.12:5000/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      setLoading(false);
      if (!response.ok) {
        Alert.alert("เกิดข้อผิดพลาด", data.message || "ไม่สามารถอัปเดตโปรไฟล์ได้");
        return;
      }
      setStep(4);
    } catch (error) {
      setLoading(false);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  // เปิด ImagePicker เพื่อเลือกรูปโปรไฟล์และอัปโหลด
  const pickImage = async (key) => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        base64: false,
      });
      if (!result.canceled) {
        const localUri = result.assets[0].uri;
        setLoading(true);
        const data = new FormData();
        // ใช้ memberId ในการอัปโหลด (หรือปรับเปลี่ยนให้เหมาะสมกับ API ของคุณ)
        data.append("member_id", memberId || "");
        data.append("image", {
          uri: localUri,
          name: "upload.jpg",
          type: "image/jpeg",
        });
        let endpoint = "";
        if (key === "profile_image") {
          endpoint = "http://192.168.1.12:5000/api/member/upload-profile-image";
        } else {
          setLoading(false);
          Alert.alert("ข้อผิดพลาด", "ประเภทของรูปไม่ถูกต้อง");
          return;
        }
        const response = await fetch(endpoint, {
          method: "POST",
          body: data,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        const respData = await response.json();
        setLoading(false);
        if (!response.ok) {
          Alert.alert("อัปโหลดล้มเหลว", respData.message);
          return;
        }
        const downloadURL = respData.url;
        if (downloadURL) {
          if (key === "profile_image") {
            setProfileData({ ...profileData, profile_image: downloadURL });
          }
        } else {
          Alert.alert("อัปโหลดล้มเหลว", "ไม่สามารถอัปโหลดรูปภาพได้");
        }
      }
    } catch (error) {
      setLoading(false);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเลือกภาพได้");
    }
  };

  // ฟังก์ชันจัดการปุ่มย้อนกลับ (Back Button)
  const handleBackPress = () => {
    if (step === 4) {
      Alert.alert(
        "ยืนยันออก",
        "คุณต้องการออกจากการสมัครสมาชิกหรือไม่? ข้อมูลที่สมัครในขั้นตอนที่ 1 จะถูกลบออกจากฐานข้อมูล",
        [
          { text: "ยกเลิก", style: "cancel" },
          { text: "ออก", onPress: handleCancelRegistration, style: "destructive" },
        ]
      );
    } else {
      setStep(step - 1);
    }
  };

  // ฟังก์ชันสำหรับยกเลิกการสมัคร (Step 4)
  const handleCancelRegistration = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://192.168.1.12:5000/api/auth/delete-registration", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId }),
      });
      setLoading(false);
      if (!response.ok) {
        Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถลบข้อมูลการสมัครได้");
        return;
      }
      setFormData({ email: "", password: "" });
      setMemberId(null);
      setStep(1);
    } catch (error) {
      setLoading(false);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  // ฟังก์ชันสำหรับขอ OTP ใหม่
  const resendOtp = async () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert("สำเร็จ", "OTP ใหม่ถูกส่งแล้ว");
      setOtp(["", "", "", "", "", ""]);
    }, 2000);
  };

  // ฟังก์ชัน renderStep สำหรับแต่ละขั้นตอน
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>สมัครสมาชิก</Text>
            <Text style={styles.subtitle}>กรอกอีเมลและรหัสผ่าน</Text>
            <View style={[styles.inputContainer, errors.email && styles.errorBorder]}>
              <TextInput
                style={styles.input}
                placeholder="อีเมล"
                placeholderTextColor="#aaa"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
              />
              {errors.email && <MaterialIcons name="error-outline" size={20} color="red" />}
            </View>
            <View style={[styles.inputContainer, errors.password && styles.errorBorder]}>
              <TextInput
                style={styles.input}
                placeholder="รหัสผ่าน"
                placeholderTextColor="#aaa"
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
          <View style={styles.stepContainer}>
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
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === "Backspace" && otp[index] === "" && index > 0) {
                      otpRefs.current[index - 1].focus();
                      let newOtp = [...otp];
                      newOtp[index - 1] = "";
                      setOtp(newOtp);
                    }
                  }}
                  ref={(ref) => (otpRefs.current[index] = ref)}
                />
              ))}
            </View>
            <TouchableOpacity style={styles.button} onPress={handleVerifyOTP} disabled={loading}>
              <Text style={styles.buttonText}>
                {loading ? "กำลังตรวจสอบ..." : "ยืนยัน OTP"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={resendOtp} style={styles.linkContainer}>
              <Text style={styles.linkText}>ขอ OTP ใหม่</Text>
            </TouchableOpacity>
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>อัปเดตโปรไฟล์</Text>
            <Text style={styles.subtitle}>กรอกข้อมูลส่วนตัวของคุณ</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage("profile_image")}>
              {profileData.profile_image ? (
                <Image source={{ uri: profileData.profile_image }} style={styles.profileImage} />
              ) : (
                <View style={styles.defaultProfile}>
                  <AntDesign name="user" size={48} color="#666" />
                </View>
              )}
            </TouchableOpacity>
            <View style={[styles.inputContainer, errors.first_name && styles.errorBorder]}>
              <TextInput
                style={styles.input}
                placeholder="ชื่อ"
                placeholderTextColor="#aaa"
                value={profileData.first_name}
                onChangeText={(text) => setProfileData({ ...profileData, first_name: text })}
              />
              {errors.first_name && <MaterialIcons name="error-outline" size={20} color="red" />}
            </View>
            <View style={[styles.inputContainer, errors.last_name && styles.errorBorder]}>
              <TextInput
                style={styles.input}
                placeholder="นามสกุล"
                placeholderTextColor="#aaa"
                value={profileData.last_name}
                onChangeText={(text) => setProfileData({ ...profileData, last_name: text })}
              />
              {errors.last_name && <MaterialIcons name="error-outline" size={20} color="red" />}
            </View>
            <View style={[styles.inputContainer, errors.phone && styles.errorBorder]}>
              <TextInput
                style={styles.input}
                placeholder="เบอร์โทรศัพท์"
                placeholderTextColor="#aaa"
                keyboardType="phone-pad"
                value={profileData.phone}
                onChangeText={(text) => setProfileData({ ...profileData, phone: text })}
              />
              {errors.phone && <MaterialIcons name="error-outline" size={20} color="red" />}
            </View>
            <View style={[styles.inputContainer, errors.address && styles.errorBorder]}>
              <TextInput
                style={styles.input}
                placeholder="ที่อยู่"
                placeholderTextColor="#aaa"
                value={profileData.address}
                onChangeText={(text) => setProfileData({ ...profileData, address: text })}
              />
              {errors.address && <MaterialIcons name="error-outline" size={20} color="red" />}
            </View>
            <View style={[styles.inputContainer, errors.tambon && styles.errorBorder]}>
              <TextInput
                style={styles.input}
                placeholder="ตำบล"
                placeholderTextColor="#aaa"
                value={profileData.tambon}
                onChangeText={(text) => setProfileData({ ...profileData, tambon: text })}
              />
              {errors.tambon && <MaterialIcons name="error-outline" size={20} color="red" />}
            </View>
            <View style={[styles.inputContainer, errors.amphure && styles.errorBorder]}>
              <TextInput
                style={styles.input}
                placeholder="อำเภอ"
                placeholderTextColor="#aaa"
                value={profileData.amphure}
                onChangeText={(text) => setProfileData({ ...profileData, amphure: text })}
              />
              {errors.amphure && <MaterialIcons name="error-outline" size={20} color="red" />}
            </View>
            <View style={[styles.inputContainer, errors.province && styles.errorBorder]}>
              <TextInput
                style={styles.input}
                placeholder="จังหวัด"
                placeholderTextColor="#aaa"
                value={profileData.province}
                onChangeText={(text) => setProfileData({ ...profileData, province: text })}
              />
              {errors.province && <MaterialIcons name="error-outline" size={20} color="red" />}
            </View>
            <TouchableOpacity style={styles.button} onPress={handleUpdateProfile} disabled={loading}>
              <Text style={styles.buttonText}>
                {loading ? "กำลังอัปเดต..." : "บันทึกโปรไฟล์"}
              </Text>
            </TouchableOpacity>
          </View>
        );
      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>สมัครสมาชิกสำเร็จ</Text>
            <Text style={styles.subtitle}>กรุณาเข้าสู่ระบบ</Text>
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
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="dark" />
      {loading && renderLoader()}
      {step !== 1 && (
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <AntDesign name="arrowleft" size={24} color="#000" />
        </TouchableOpacity>
      )}
      <ScrollView contentContainerStyle={styles.scrollContent}>{renderStep()}</ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingVertical: 20,
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 10,
  },
  stepContainer: {
    width: "100%",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontFamily: "Prompt-Bold",
    color: "#000",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Prompt-Regular",
    color: "#000",
    marginBottom: 20,
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 14,
    marginBottom: 15,
    width: "100%",
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Prompt-Medium",
    color: "#000",
    paddingVertical: 14,
  },
  errorBorder: {
    borderColor: "red",
    borderWidth: 1,
  },
  button: {
    backgroundColor: "#FF0000",
    borderRadius: 5,
    width: "100%",
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 10,
  },
  buttonText: {
    color: "#FFF",
    fontFamily: "Prompt-Medium",
    fontSize: 16,
  },
  linkContainer: {
    marginTop: 10,
    alignItems: "center",
  },
  linkText: {
    fontSize: 14,
    fontFamily: "Prompt-Medium",
    color: "#FF0000",
    textDecorationLine: "underline",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginBottom: 20,
    width: "100%",
  },
  otpInput: {
    backgroundColor: "#FFF",
    borderColor: "#ddd",
    borderWidth: 1,
    textAlign: "center",
    fontSize: 20,
    width: 40,
    borderRadius: 5,
    fontFamily: "Prompt-Regular",
    color: "#000",
    paddingVertical: 10,
    marginHorizontal: 2,
  },
  imagePicker: {
    alignSelf: "center",
    marginBottom: 10,
  },
  defaultProfile: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    resizeMode: "cover",
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
  loaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loaderDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FF0000",
    marginHorizontal: 6,
  },
  // Job Types Grid
  jobTypesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  jobTypeCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E52020",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  jobTypeCircleSelected: {
    backgroundColor: "#E52020",
  },
  jobTypeText: {
    fontSize: 14,
    fontFamily: "Prompt-Regular",
    color: "#E52020",
    textAlign: "center",
  },
  jobTypeTextSelected: {
    color: "#FFF",
  },
  moreCircle: {
    backgroundColor: "#E52020",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: "Prompt-Bold",
    color: "#000",
    marginBottom: 15,
    textAlign: "center",
  },
  modalGrid: {
    paddingVertical: 10,
  },
  modalGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  modalCloseButton: {
    backgroundColor: "#E52020",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontFamily: "Prompt-Bold",
    color: "#FFF",
  },
  // Sitters (Horizontal Avatar List)
  sitterAvatarRow: { marginBottom: 20 },
  sitterAvatarContainer: { width: 80, alignItems: "center", marginRight: 20 },
  sitterAvatarWrapper: {
    width: 70,
    height: 70,
    borderRadius: 15,
    backgroundColor: "#ccc",
    overflow: "hidden",
    marginBottom: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  sitterAvatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  sitterPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#999",
    justifyContent: "center",
    alignItems: "center",
  },
  sitterAvatarName: { fontSize: 16, fontFamily: "Prompt-Regular", color: "#000" },
  ratingContainer: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  starIcon: { marginRight: 3 },
  ratingText: { fontSize: 14, fontFamily: "Prompt-Regular", color: "#000" },
  // Sitters Fallback Text
  noServicesText: {
    textAlign: "center",
    fontSize: 18,
    fontFamily: "Prompt-Regular",
    color: "#000",
    marginTop: 20,
  },
});
