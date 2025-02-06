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

export default function Login() {
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

  // ฟังก์ชันเข้าสู่ระบบ (เชื่อม API)
  // ฟังก์ชันเข้าสู่ระบบ (เชื่อม API)
const handleLogin = async () => {
  let hasError = false;

  // รีเซ็ต error ทั้ง 2 ช่อง ก่อนตรวจสอบ
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
    const response = await fetch("http://192.168.133.111:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      // ถ้าการตอบกลับจากเซิร์ฟเวอร์ไม่โอเค (เช่น 400, 401, 500)
      // ให้แสดง error ที่ input อีกครั้ง
      setEmailError(true);
      setPasswordError(true);
      return;
    }

    // ตรวจสอบและดึง member_id จาก data.member
    const memberId = data.member && data.member.member_id;
    if (!memberId) {
      throw new Error("member_id is undefined in response");
    }

    // ถ้าสำเร็จ -> เก็บ member_id ใน AsyncStorage
    await AsyncStorage.setItem("member_id", memberId.toString());

    // นำทางไปที่หน้า Main หรือ Home
    navigation.reset({
      index: 0,
      routes: [{ name: "MemberNavigator" }],
    });
  } catch (error) {
    setLoading(false);
    console.error("Login error:", error);
    // ถ้าต้องการให้ช่องแสดงสีแดงเพราะเชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ก็ set error ได้เลย
    setEmailError(true);
    setPasswordError(true);
  }
};

  return (
    <LinearGradient colors={["#1E1E1E", "#111111"]} style={styles.container}>
      <StatusBar style="light" />

      {/* -----------------------------
          ส่วนหัว (Logo + Title)
          ----------------------------- */}
      <View style={styles.headerContainer}>
        {/* ปุ่มย้อนกลับ (Back Arrow) */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <AntDesign name="arrowleft" size={24} color="#fff" />
        </TouchableOpacity>

        <Image
          style={styles.logo}
          source={require("../../../assets/images/logo.png")}
        />
        <Text style={styles.title}>ยินดีต้อนรับกลับมา</Text>
        <Text style={styles.subtitle}>ลงชื่อเข้าใช้บัญชีของคุณ</Text>
      </View>

      {/* -----------------------------
          ส่วนฟอร์ม (เลื่อนได้)
          ----------------------------- */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.formContainer}
      >
        {/* กดที่พื้นที่ว่าง ซ่อนคีย์บอร์ด */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ช่องกรอก Email */}
            <View
              style={[
                styles.inputContainer,
                emailError && styles.inputContainerError,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="อีเมล"
                placeholderTextColor="#777"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />
              {emailError && (
                <AntDesign
                  name="exclamationcircle"
                  size={20}
                  color="red"
                  style={styles.errorIcon}
                />
              )}
            </View>

            {/* ช่องกรอก Password */}
            <View
              style={[
                styles.inputContainer,
                passwordError && styles.inputContainerError,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="รหัสผ่าน"
                placeholderTextColor="#777"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={hidePassword} // ใช้ state hidePassword
              />
              {/* ปุ่ม Toggle แสดง/ซ่อนรหัสผ่าน */}
              <TouchableOpacity onPress={togglePasswordVisibility}>
                <AntDesign
                  name={hidePassword ? "eyeo" : "eye"}
                  size={20}
                  color="#777"
                  style={styles.icon}
                />
              </TouchableOpacity>

              {passwordError && (
                <AntDesign
                  name="exclamationcircle"
                  size={20}
                  color="red"
                  style={styles.errorIcon}
                />
              )}
            </View>

            {/* ปุ่ม "เข้าสู่ระบบ" */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
            >
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
  /* -----------------------------------
     ส่วนฟอร์ม
     ----------------------------------- */
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
  errorIcon: {
    marginLeft: 8,
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
