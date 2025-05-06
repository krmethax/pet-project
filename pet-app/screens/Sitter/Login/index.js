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
import { AntDesign } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";

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

    if (hasError) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        "http://192.168.1.12:5000/api/sitter/login-sitter",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );
      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        setEmailError(true);
        setPasswordError(true);
        return;
      }

      const sitterId = data.sitter && data.sitter.sitter_id;
      if (!sitterId) {
        throw new Error("sitter_id is undefined in response");
      }

      if (data.sitter.verification_status !== "approved") {
        setEmailError(true);
        setPasswordError(true);
        throw new Error("บัญชีของคุณยังไม่ได้รับการอนุมัติ");
      }

      await AsyncStorage.setItem("sitter_id", sitterId.toString());

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
            showsVerticalScrollIndicator={false}
          >
            {/* โลโก้ */}
            <Image
              style={styles.logo}
              source={require("../../../assets/images/logo-x.png")}
              resizeMode="contain"
            />

            {/* หัวข้อ */}
            <Text style={styles.title}>ล็อกอินเข้าสู่ระบบ</Text>
            <Text style={styles.subtitle}>ลงชื่อเข้าใช้บัญชีพี่เลี้ยงของคุณ</Text>

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
                secureTextEntry={hidePassword}
                value={password}
                onChangeText={setPassword}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF",
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
  logo: {
    width: 200,
    height: 200,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontFamily: "Prompt-Bold",
    color: "#000",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Prompt-Regular",
    color: "#000",
    marginBottom: 20,
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
});
