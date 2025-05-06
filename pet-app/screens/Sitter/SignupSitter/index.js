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
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

export default function SitterSignUp({ navigation }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // ===== Step 1 & 2: สมัคร / ยืนยัน OTP =====
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [sitterId, setSitterId] = useState(null);

  // สำหรับ OTP
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);

  // ===== Step 3: อัปเดตโปรไฟล์ (รวมที่อยู่แบบกรอกเอง) =====
  const [profileData, setProfileData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    profile_image: "",
    address: "",
    tambon: "",
    amphure: "",
    province: "",
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

  // ------------------------ Bouncing Dots Loader ------------------------
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
        <Animated.View style={[styles.loaderDot, { transform: [{ translateY: dot1 }] }]} />
        <Animated.View style={[styles.loaderDot, { transform: [{ translateY: dot2 }] }]} />
        <Animated.View style={[styles.loaderDot, { transform: [{ translateY: dot3 }] }]} />
        <Animated.View style={[styles.loaderDot, { transform: [{ translateY: dot4 }] }]} />
      </View>
    </View>
  );
  // ---------------------------------------------------------------------

  // ฟังก์ชัน validateRegistration
  const validateRegistration = () => {
    let newErrors = {};
    if (!formData.email) newErrors.email = "กรุณากรอกอีเมล";
    if (!formData.password) newErrors.password = "กรุณากรอกรหัสผ่าน";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ฟังก์ชัน handleSignup
  const handleSignup = async () => {
    if (!validateRegistration()) return;
    setLoading(true);
    try {
      const response = await fetch("http://192.168.1.12:5000/api/sitter/register-sitter", {
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
      setStep(2);
    } catch (error) {
      setLoading(false);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  // ฟังก์ชัน handleVerifyOTP
  const handleVerifyOTP = async () => {
    if (otp.join("").length < 6) {
      Alert.alert("ข้อผิดพลาด", "กรุณากรอก OTP ให้ครบ 6 หลัก");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("http://192.168.1.12:5000/api/sitter/verify-otp-sitter", {
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

  // ฟังก์ชัน validateProfile
  const validateProfile = () => {
    let newErrors = {};
    if (!profileData.first_name) newErrors.first_name = "กรุณากรอกชื่อ";
    if (!profileData.last_name) newErrors.last_name = "กรุณากรอกนามสกุล";
    if (!profileData.phone) newErrors.phone = "กรุณากรอกเบอร์โทรศัพท์";
    // ตรวจสอบข้อมูลที่อยู่ (address, tambon, amphure, province)
    if (!profileData.address) newErrors.address = "กรุณากรอกที่อยู่";
    if (!profileData.tambon) newErrors.tambon = "กรุณากรอกตำบล";
    if (!profileData.amphure) newErrors.amphure = "กรุณากรอกอำเภอ";
    if (!profileData.province) newErrors.province = "กรุณากรอกจังหวัด";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ฟังก์ชัน handleUpdateProfile
  const handleUpdateProfile = async () => {
    if (!validateProfile()) return;
    setLoading(true);
    try {
      const payload = {
        sitter_id: sitterId,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        phone: profileData.phone,
        profile_image: profileData.profile_image,
        address: profileData.address,
        tambon: profileData.tambon,
        amphure: profileData.amphure,
        province: profileData.province,
      };
      const response = await fetch("http://192.168.1.12:5000/api/sitter/update-profile-sitter", {
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

  // ฟังก์ชัน validateDocuments
  const validateDocuments = () => {
    let newErrors = {};
    if (!documentData.faceImage) newErrors.faceImage = "กรุณาเลือกรูปใบหน้า";
    if (!documentData.idCardImage) newErrors.idCardImage = "กรุณาเลือกรูปบัตรประชาชน";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ฟังก์ชัน handleUploadDocuments
  const handleUploadDocuments = async () => {
    if (!validateDocuments()) return;
    setLoading(true);
    try {
      const response = await fetch("http://192.168.1.12:5000/api/sitter/verify-account", {
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
      setStep(5);
    } catch (error) {
      setLoading(false);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  // ฟังก์ชัน pickImage สำหรับเลือกรูปภาพ
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
        const formData = new FormData();
        formData.append("sitter_id", sitterId);
        formData.append("image", {
          uri: localUri,
          name: "upload.jpg",
          type: "image/jpeg",
        });
        let endpoint = "";
        if (key === "profile_image") {
          endpoint = "http://192.168.1.12:5000/api/sitter/upload-profile-image";
        } else if (key === "faceImage") {
          endpoint = "http://192.168.1.12:5000/api/sitter/upload-face-image";
        } else if (key === "idCardImage") {
          endpoint = "http://192.168.1.12:5000/api/sitter/upload-idcard-image";
        } else {
          setLoading(false);
          Alert.alert("ข้อผิดพลาด", "ประเภทของรูปไม่ถูกต้อง");
          return;
        }
        const response = await fetch(endpoint, {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        setLoading(false);
        if (!response.ok) {
          Alert.alert("อัปโหลดล้มเหลว", data.message);
          return;
        }
        const downloadURL = data.url;
        if (downloadURL) {
          if (key === "profile_image") {
            setProfileData({ ...profileData, profile_image: downloadURL });
          } else {
            setDocumentData({ ...documentData, [key]: downloadURL });
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
        "คุณต้องการออกจากการสมัครพี่เลี้ยงหรือไม่? ข้อมูลที่สมัครในขั้นตอนที่ 1 จะถูกลบออกจากฐานข้อมูล",
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
      const response = await fetch("http://192.168.1.12:5000/api/sitter/delete-registration", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sitter_id: sitterId }),
      });
      setLoading(false);
      if (!response.ok) {
        Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถลบข้อมูลการสมัครได้");
        return;
      }
      setFormData({ email: "", password: "" });
      setSitterId(null);
      setStep(1);
    } catch (error) {
      setLoading(false);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

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
            <Text style={styles.title}>สมัครเป็นพี่เลี้ยง</Text>
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
            <Text style={styles.subtitle}>
              กรอก OTP 6 หลักที่ส่งไปยังอีเมลของคุณ
            </Text>
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
            <Text style={styles.title}>อัปเดตโปรไฟล์พี่เลี้ยง</Text>
            <Text style={styles.subtitle}>กรอกข้อมูลส่วนตัว</Text>
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
                placeholder="เบอร์โทร"
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
            {/* TextInputs สำหรับข้อมูลที่อยู่เพิ่มเติม */}
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
            <Text style={styles.title}>อัปโหลดเอกสารยืนยันตัวตน</Text>
            <Text style={styles.subtitle}>กรุณาอัปโหลดรูปใบหน้าและบัตรประชาชน</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage("faceImage")}>
              {documentData.faceImage ? (
                <Image source={{ uri: documentData.faceImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.defaultProfile}>
                  <AntDesign name="idcard" size={48} color="#666" />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.caption}>รูปใบหน้า</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage("idCardImage")}>
              {documentData.idCardImage ? (
                <Image source={{ uri: documentData.idCardImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.defaultProfile}>
                  <AntDesign name="idcard" size={48} color="#666" />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.caption}>รูปบัตรประชาชน</Text>
            <TouchableOpacity style={styles.button} onPress={handleUploadDocuments} disabled={loading}>
              <Text style={styles.buttonText}>
                {loading ? "กำลังส่งเอกสาร..." : "ส่งเอกสาร"}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContainer}>
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
      <StatusBar style="dark" />
      {loading && renderLoader()}
      {step !== 1 && (
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <AntDesign name="arrowleft" size={24} color="#000" />
        </TouchableOpacity>
      )}
      <ScrollView contentContainerStyle={styles.scrollContent}>{renderStep()}</ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
    paddingTop: 30,
    paddingHorizontal: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingVertical: 40,
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
  caption: {
    textAlign: "center",
    color: "#000",
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
});
