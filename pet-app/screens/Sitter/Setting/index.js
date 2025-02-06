import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { AntDesign } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

export default function Setting() {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [sitterId, setSitterId] = useState(null);

  // Retrieve sitter_id from AsyncStorage on mount
  useEffect(() => {
    const getSitterId = async () => {
      try {
        const storedSitterId = await AsyncStorage.getItem("sitter_id");
        if (storedSitterId) {
          setSitterId(storedSitterId);
        }
      } catch (error) {
        console.error("Failed to fetch sitter_id:", error);
      }
    };
    getSitterId();
  }, []);

  // Fetch sitter data when sitterId is available
  useEffect(() => {
    if (sitterId) {
      fetch(`http://192.168.133.111:5000/api/sitter/sitter/${sitterId}`)
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
          setUser(data);
        })
        .catch((error) => {
          console.error("Error fetching sitter:", error);
        });
    }
  }, [sitterId]);

  // Logout handler
  const handleLogout = async () => {
    await AsyncStorage.removeItem("sitter_id");
    navigation.replace("Login");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Using a gradient background for a modern look */}
      <LinearGradient
        colors={["#fff", "#fff"]}
        style={styles.gradientBackground}
      >
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>การตั้งค่า</Text>
            <TouchableOpacity onPress={handleLogout}>
              <AntDesign name="logout" size={24} color="#6A1B9A" />
            </TouchableOpacity>
          </View>

          {/* Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <Image
                source={require("../../../assets/images/avatar.png")}
                style={styles.avatar}
              />
              <View style={styles.verificationBadge}>
                <Image
                  source={require("../../../assets/images/verified.png")}
                  style={styles.verificationIcon}
                />
              </View>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {user ? `${user.sitter.first_name} ${user.sitter.last_name}` : "ชื่อผู้ใช้"}
              </Text>
              <Text style={styles.userEmail}>
                {user ? user.sitter.email : "อีเมล"}
              </Text>
            </View>
          </View>

          {/* Additional settings options (if needed) */}
          <View style={styles.optionsContainer}>
            <TouchableOpacity style={styles.optionItem}>
              <AntDesign name="setting" size={20} color="#6A1B9A" />
              <Text style={styles.optionText}>แก้ไขข้อมูลส่วนตัว</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionItem}>
              <AntDesign name="infocirlceo" size={20} color="#6A1B9A" />
              <Text style={styles.optionText}>ข้อมูลแอปพลิเคชัน</Text>
            </TouchableOpacity>
            {/* Add more options as needed */}
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
    alignItems: "center",
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Prompt-Bold",
    color: "#000",
  },
  profileSection: {
    width: "100%",
    alignItems: "center",
    marginBottom: 30,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 55,
    backgroundColor: "#ccc",
  },
  verificationBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 4,
  },
  verificationIcon: {
    width: 20,
    height: 20,
    resizeMode: "contain",
  },
  userInfo: {
    alignItems: "center",
    marginTop: 15,
  },
  userName: {
    fontSize: 16,
    fontFamily: "Prompt-Medium",
    color: "#000",
  },
  userEmail: {
    fontSize: 13,
    fontFamily: "Prompt-Regular",
    color: "#000",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 12,
    backgroundColor: "#E8F5E9",
    marginBottom: 30,
  },
  statusIcon: {
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontFamily: "Prompt-Bold",
    color: "#388E3C",
  },
  optionsContainer: {
    width: "100%",
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  optionText: {
    fontSize: 16,
    fontFamily: "Prompt-Regular",
    color: "#4A148C",
    marginLeft: 15,
  },
});

