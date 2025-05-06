import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { AntDesign } from "@expo/vector-icons";

export default function Setting() {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [sitterId, setSitterId] = useState(null);

  // ดึง sitter_id จาก AsyncStorage เมื่อ component mount
  useEffect(() => {
    const getSitterId = async () => {
      try {
        const storedSitterId = await AsyncStorage.getItem("sitter_id");
        if (storedSitterId) {
          setSitterId(storedSitterId);
        } else {
          // ถ้าไม่มี sitter_id ให้กลับไปหน้า Login
          navigation.replace("Login");
        }
      } catch (error) {
        console.error("Failed to fetch sitter_id:", error);
      }
    };
    getSitterId();
  }, []);

  // ดึงข้อมูลพี่เลี้ยงเมื่อได้ sitterId
  useEffect(() => {
    if (sitterId) {
      fetch(`http://192.168.1.12:5000/api/sitter/sitter/${sitterId}`)
        .then(async (response) => {
          if (!response.ok) {
            const text = await response.text();
            console.log("Response status:", response.status);
            console.log("Response text:", text);
            throw new Error("ไม่สามารถดึงข้อมูลพี่เลี้ยงได้");
          }
          return response.json();
        })
        .then((data) => {
          console.log("Data from server:", data);
          setUser(data.sitter || data);
        })
        .catch((error) => {
          console.error("Error fetching sitter:", error);
        });
    }
  }, [sitterId]);

  // ฟังก์ชัน Logout
  const handleLogout = async () => {
    await AsyncStorage.removeItem("sitter_id");
    navigation.replace("Login");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        {/* ส่วนแสดงรายการเมนูและข้อมูลผู้ใช้ */}
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.headerTitle}>ตั้งค่า</Text>

          {/* ส่วนแสดงข้อมูลผู้ใช้ */}
          {user ? (
            <View style={styles.userInfoContainer}>
              <Image
                source={
                  user.profile_image
                    ? { uri: user.profile_image }
                    : require("../../../assets/images/avatar.png")
                }
                style={styles.avatar}
              />
              <View style={styles.userTextContainer}>
                <Text style={styles.userName}>
                  {user.first_name?.trim()} {user.last_name?.trim()}
                </Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.loadingText}>กำลังโหลดข้อมูลผู้ใช้...</Text>
          )}

          {/* รายการเมนู */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("EditProfile")}
          >
            <Text style={styles.menuText}>แก้ไขข้อมูลส่วนตัว</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>ข้อมูลแอปพลิเคชัน</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("PaymentMethod")}
          >
            <Text style={styles.menuText}>ตั้งค่าการชำระเงิน</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ปุ่ม Logout อยู่ด้านล่าง */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity style={styles.menuItemLogout} onPress={handleLogout}>
            <Text style={styles.menuTextLogout}>ออกจากระบบ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Prompt-Bold",
    color: "#000",
    marginBottom: 20,
  },
  userInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    resizeMode: "cover",
  },
  userTextContainer: {
    justifyContent: "center",
  },
  userName: {
    fontSize: 20,
    fontFamily: "Prompt-Bold",
    color: "#000",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 16,
    fontFamily: "Prompt-Regular",
    color: "#000",
  },
  loadingText: {
    fontSize: 16,
    fontFamily: "Prompt-Regular",
    color: "#333",
    marginBottom: 30,
  },
  menuItem: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    marginBottom: 15,
  },
  menuText: {
    fontSize: 16,
    fontFamily: "Prompt-Medium",
    color: "#000",
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  menuItemLogout: {
    backgroundColor: "#FF0000",
    borderRadius: 5,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTextLogout: {
    fontSize: 16,
    fontFamily: "Prompt-Bold",
    color: "#FFF",
  },
});
