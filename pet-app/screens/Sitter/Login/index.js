import React, { useState } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { AntDesign } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SitterLogin() {
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

  // ฟังก์ชัน Toggle รหัสผ่าน
  const togglePasswordVisibility = () => {
    setHidePassword(!hidePassword);
  };

  // ฟังก์ชันเข้าสู่ระบบ (Login Sitter)
  const handleLogin = async () => {
    let hasError = false;

    // รีเซ็ต error ทั้งสองช่องก่อนตรวจสอบ
    setEmailError(false);
    setPasswordError(false);

    // ตรวจสอบอีเมล
    if (!email) {
      setEmailError(true);
      hasError = true;
    }
    // ตรวจสอบรหัสผ่าน
    if (!password) {
      setPasswordError(true);
      hasError = true;
    }

    // ถ้ามี error ให้หยุดทำงาน (ไม่เรียก API)
    if (hasError) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://192.168.133.111:5000/api/sitter/login-sitter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        // ถ้าการตอบกลับจากเซิร์ฟเวอร์ไม่โอเค (เช่น 400, 401, 500)
        setEmailError(true);
        setPasswordError(true);
        return;
      }

      // ตรวจสอบว่าข้อมูลพี่เลี้ยงถูกส่งกลับมา (ใช้ property "sitter")
      const sitterId = data.sitter && data.sitter.sitter_id;
      if (!sitterId) {
        throw new Error("sitter_id is undefined in response");
      }

      // ตรวจสอบสถานะการยืนยันตัวตน
      // หากสถานะไม่ใช่ "approved" ให้ส่ง error กลับ
      if (data.sitter.verification_status !== "approved") {
        setEmailError(true);
        setPasswordError(true);
        // แจ้งว่าบัญชียังไม่ได้รับการอนุมัติ
        throw new Error("บัญชีของคุณยังไม่ได้รับการอนุมัติ");
      }

      // ถ้าสำเร็จ -> เก็บ sitter_id ใน AsyncStorage
      await AsyncStorage.setItem("sitter_id", sitterId.toString());

      // นำทางไปที่หน้า SitterNavigator (หรือหน้า Home สำหรับพี่เลี้ยง)
      navigation.reset({
        index: 0,
        routes: [{ name: "SitterNavigator" }],
      });
    } catch (error) {
      setLoading(false);
      console.error("Login error:", error);
      setEmailError(true);
      setPasswordError(true);
    }
  };

  return (
    <LinearGradient colors={["#1E1E1E", "#111111"]} style={styles.container}>
      <StatusBar style="light" />

      {/* ส่วนหัว (Logo + Title) */}
      <View style={styles.headerContainer}>
        {/* ปุ่มย้อนกลับ */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <AntDesign name="arrowleft" size={24} color="#fff" />
        </TouchableOpacity>

        <Image
          style={styles.logo}
          source={require("../../../assets/images/logo.png")}
        />
        <Text style={styles.title}>ยินดีต้อนรับกลับมา</Text>
        <Text style={styles.subtitle}>ลงชื่อเข้าใช้บัญชีพี่เลี้ยงของคุณ</Text>
      </View>

      {/* ส่วนฟอร์ม (เลื่อนได้) */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.formContainer}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ช่องกรอก Email */}
            <View style={[styles.inputContainer, emailError && styles.inputContainerError]}>
              <TextInput
                style={styles.input}
                placeholder="อีเมล"
                placeholderTextColor="#777"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />
            </View>

            {/* ช่องกรอก Password */}
            <View style={[styles.inputContainer, passwordError && styles.inputContainerError]}>
              <TextInput
                style={styles.input}
                placeholder="รหัสผ่าน"
                placeholderTextColor="#777"
                secureTextEntry={hidePassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={togglePasswordVisibility}>
                <AntDesign name={hidePassword ? "eyeo" : "eye"} size={20} color="#777" style={styles.icon} />
              </TouchableOpacity>
            </View>

            {/* ปุ่มเข้าสู่ระบบ */}
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
              <Text style={styles.loginText}>
                {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </Text>
            </TouchableOpacity>
            {/* ลิงก์ "สร้างบัญชี" */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>คุณยังไม่มีบัญชี ?</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
                <Text style={styles.registerLink}> สร้างบัญชี</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "transparent",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    padding: 10,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: "contain",
    marginBottom: 15,
    marginTop: 50,
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
    textAlign: "center",
  },
  formContainer: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222",
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 50,
  },
  inputContainerError: {
    borderColor: "red",
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Prompt-Regular",
    color: "#FFF",
  },
  icon: {
    marginLeft: 10,
  },
  loginButton: {
    backgroundColor: "#FFF",
    paddingVertical: 18,
    paddingHorizontal: 10,
    borderRadius: 50,
    alignItems: "center",
    marginTop: 10,
  },
  loginText: {
    color: "#000",
    fontFamily: "Prompt-Bold",
    fontSize: 16,
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  registerText: {
    fontFamily: "Prompt-Regular",
    fontSize: 16,
    color: "#AAA",
  },
  registerLink: {
    fontFamily: "Prompt-Bold",
    fontSize: 16,
    color: "#FFF",
  },
});

