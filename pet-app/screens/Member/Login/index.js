import React, { useState } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { AntDesign } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function MemberLogin() {
  const navigation = useNavigation();

  // State เก็บค่าฟอร์ม
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // State สำหรับแสดง error หากไม่ได้กรอก
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  // State สำหรับ loading (กดปุ่มแล้วกำลังเชื่อมต่อ API)
  const [loading, setLoading] = useState(false);

  // State สำหรับควบคุมการซ่อน/แสดงรหัสผ่าน
  const [hidePassword, setHidePassword] = useState(true);

  // State สำหรับแสดง custom alert
  const [customAlert, setCustomAlert] = useState({ visible: false, message: "" });

  // ฟังก์ชัน Toggle รหัสผ่าน
  const togglePasswordVisibility = () => {
    setHidePassword(!hidePassword);
  };

  // ฟังก์ชันแจ้งเตือนแบบ custom
  const showAlert = (message) => {
    setCustomAlert({ visible: true, message });
  };

  // ฟังก์ชันเข้าสู่ระบบ (เชื่อม API)
  const handleLogin = async () => {
    let hasError = false;
    setEmailError(false);
    setPasswordError(false);

    if (!email) {
      setEmailError(true);
      hasError = true;
    }
    if (!password) {
      setPasswordError(true);
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);
    try {
      const response = await fetch("http://192.168.1.12:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        // สมมุติว่า API ส่งกลับข้อความ error ใน data.message
        if (data.message === "ไม่พบอีเมลนี้") {
          setEmailError(true);
          showAlert("ไม่พบอีเมลนี้");
        } else if (data.message === "รหัสผ่านไม่ถูกต้อง") {
          setPasswordError(true);
          showAlert("รหัสผ่านไม่ถูกต้อง");
        } else {
          showAlert("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
        }
        return;
      }

      // ตรวจสอบและดึง member_id จาก data.member
      const memberId = data.member && data.member.member_id;
      if (!memberId) {
        throw new Error("member_id is undefined in response");
      }

      await AsyncStorage.setItem("member_id", memberId.toString());

      // นำทางไปที่หน้า Main หรือ Home
      navigation.reset({
        index: 0,
        routes: [{ name: "MemberNavigator" }],
      });
    } catch (error) {
      setLoading(false);
      console.error("Login error:", error);
      setEmailError(true);
      setPasswordError(true);
      showAlert("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* ปุ่มย้อนกลับ */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <AntDesign name="arrowleft" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            {/* โลโก้ (รูปวงกลมสีแดง + นก) */}
            <Image
              source={require("../../../assets/images/logo-x.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            {/* หัวข้อ */}
            <Text style={styles.title}>ล็อกอินเข้าสู่ระบบ</Text>

            {/* ช่องกรอก Email */}
            <View
              style={[
                styles.inputContainer,
                emailError && styles.inputContainerError,
              ]}
            >
              <AntDesign
                name="mail"
                size={20}
                color={emailError ? "red" : "#666"}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="อีเมล"
                placeholderTextColor="#aaa"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />
            </View>

            {/* ช่องกรอก Password */}
            <View
              style={[
                styles.inputContainer,
                passwordError && styles.inputContainerError,
              ]}
            >
              <AntDesign
                name="lock"
                size={20}
                color={passwordError ? "red" : "#666"}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="รหัสผ่าน"
                placeholderTextColor="#aaa"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={hidePassword}
              />
              <TouchableOpacity onPress={togglePasswordVisibility}>
                <AntDesign
                  name={hidePassword ? "eyeo" : "eye"}
                  size={20}
                  color="#666"
                  style={styles.icon}
                />
              </TouchableOpacity>
            </View>

            {/* ปุ่มเข้าสู่ระบบ */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </Text>
            </TouchableOpacity>

            {/* ลิงก์สมัครสมาชิก */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>ยังไม่มีบัญชี? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
                <Text style={styles.registerLink}>สมัคร</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Custom Alert */}
      {customAlert.visible && (
        <View style={styles.alertOverlay}>
          <View style={styles.alertContainer}>
            <Text style={styles.alertMessage}>{customAlert.message}</Text>
            <TouchableOpacity
              onPress={() => setCustomAlert({ visible: false, message: "" })}
              style={styles.alertButton}
            >
              <Text style={styles.alertButtonText}>ตกลง</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF", // พื้นหลังสีขาว
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 10,
  },
  // โลโก้ (รูปวงกลมสีแดง + นก)
  logo: {
    width: 200,
    height: 200,
    marginBottom: 10,
  },
  // ข้อความหัวข้อ
  title: {
    fontSize: 20,
    fontFamily: "Prompt-Bold",
    color: "#000",
    marginBottom: 20,
  },
  // กล่องกรอกข้อมูล
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
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#000",
    paddingVertical: 14,
    fontFamily: "Prompt-Medium",
  },
  icon: {
    marginLeft: 8,
  },
  inputContainerError: {
    borderColor: "red",
  },
  // ปุ่มเข้าสู่ระบบ
  loginButton: {
    backgroundColor: "#FF0000",
    borderRadius: 5,
    width: "100%",
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 10,
  },
  loginButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Prompt-Medium",
  },
  // ลิงก์สมัครสมาชิก
  registerContainer: {
    flexDirection: "row",
    marginTop: 20,
  },
  registerText: {
    fontSize: 15,
    color: "#000",
    fontFamily: "Prompt-Medium",
  },
  registerLink: {
    fontSize: 15,
    color: "#FF0000",
    fontFamily: "Prompt-Medium",
    textDecorationLine: "underline",
  },
  // Custom Alert Styles
  alertOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  alertContainer: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
    width: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  alertMessage: {
    fontSize: 16,
    color: "#000",
    fontFamily: "Prompt-Medium",
    marginBottom: 20,
    textAlign: "center",
  },
  alertButton: {
    backgroundColor: "#FF0000",
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  alertButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Prompt-Medium",
  },
});
