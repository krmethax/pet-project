import React, { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { AntDesign } from "@expo/vector-icons";

export default function Home() {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [sitterId, setSitterId] = useState(null);
  const [latestJobs, setLatestJobs] = useState([]); // งานล่าสุด (completed & paid)
  const [stats, setStats] = useState({
    jobsCompleted: 0,
    totalIncome: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  // Helper function: แปลงราคาเป็นจำนวนเต็มถ้าไม่มีเศษ (.00)
  const formatPrice = (price) => {
    const num = parseFloat(price);
    return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
  };

  // ดึง sitter_id จาก AsyncStorage เมื่อ component mount
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

  // ดึงข้อมูลพี่เลี้ยงจาก API
  const fetchUser = useCallback(() => {
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
          console.log("User data:", data);
          setUser(data);
          if (data.stats) {
            setStats(data.stats);
          }
        })
        .catch((error) => {
          console.error("Error fetching sitter:", error);
        });
    }
  }, [sitterId]);

  // ดึงงานล่าสุดของพี่เลี้ยงจาก API
  const fetchLatestJobs = useCallback(() => {
    if (sitterId) {
      // เชื่อมกับ API /latest-completed-jobs โดยส่ง sitter_id เป็น query parameter
      fetch(`http://192.168.133.111:5000/api/sitter/latest-completed-jobs?sitter_id=${sitterId}`)
        .then(async (response) => {
          if (!response.ok) {
            const text = await response.text();
            console.error("Response status:", response.status);
            console.error("Response text:", text);
            throw new Error("ไม่สามารถดึงงานล่าสุดของพี่เลี้ยงได้");
          }
          return response.json();
        })
        .then((data) => {
          console.log("Fetched latest jobs:", data);
          // ตรวจสอบว่าข้อมูลที่ได้มี key "jobs" หรือไม่
          if (Array.isArray(data)) {
            setLatestJobs(data);
          } else {
            setLatestJobs(data.jobs || []);
          }
        })
        .catch((error) => {
          console.error("Error fetching latest jobs:", error);
        });
    }
  }, [sitterId]);

  // ดึงข้อมูลทั้งหมด
  const fetchAllData = useCallback(() => {
    if (sitterId) {
      fetchUser();
      fetchLatestJobs();
    }
  }, [sitterId, fetchUser, fetchLatestJobs]);

  useEffect(() => {
    if (sitterId) {
      fetchAllData();
    }
  }, [sitterId, fetchAllData]);

  // ฟังก์ชันรีเฟรชหน้าจอ
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAllData();
    setRefreshing(false);
  }, [fetchAllData]);

  // ฟังก์ชัน Logout
  const handleLogout = async () => {
    await AsyncStorage.removeItem("sitter_id");
    navigation.replace("Login");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.profileSection}>
              <View style={styles.avatar}>
                <AntDesign name="user" size={24} color="#FFF" />
              </View>
              <View style={styles.greeting}>
                <Text style={styles.greetingText}>
                  {user ? `สวัสดี ${user.sitter.first_name}` : ""}
                </Text>
                <Text style={styles.subGreeting}>ยินดีต้อนรับ</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <AntDesign name="logout" size={20} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Card สถิติ (ตัวอย่าง) */}
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>สถิติของคุณ</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.jobsCompleted}</Text>
                <Text style={styles.statLabel}>รับงานไปแล้ว</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>฿ {stats.totalIncome}</Text>
                <Text style={styles.statLabel}>รายได้</Text>
              </View>
            </View>
          </View>

          {/* Section Header สำหรับงานล่าสุด */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              งานล่าสุด
            </Text>
          </View>
          {latestJobs.length > 0 ? (
            <View style={styles.listContainer}>
              {latestJobs.map((job) => (
                <View key={job.sitter_service_id} style={styles.listItem}>
                  <View style={styles.listItemInfo}>
                    <Text style={styles.listItemTitle}>{job.short_name}</Text>
                    <Text style={styles.listItemDescription}>
                      {job.description || "ไม่มีรายละเอียด"}
                    </Text>
                  </View>
                  <View style={styles.listItemPrice}>
                    <Text style={styles.priceText}>
                      {formatPrice(job.price)} บาท /{" "}
                      {pricingUnitMapping[job.pricing_unit] || job.pricing_unit}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noServicesText}>ไม่มีงานล่าสุด</Text>
          )}
        </ScrollView>
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
    backgroundColor: "#FFF",
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  greeting: {},
  greetingText: {
    fontSize: 18,
    fontFamily: "Prompt-Bold",
    color: "#000",
  },
  subGreeting: {
    fontSize: 14,
    fontFamily: "Prompt-Regular",
    color: "#666",
  },
  logoutButton: {
    padding: 4,
  },
  statsCard: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 30,
    marginBottom: 25,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontFamily: "Prompt-Bold",
    color: "#000",
    marginBottom: 25,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Prompt-Bold",
    color: "#000",
  },
  statLabel: {
    fontSize: 14,
    fontFamily: "Prompt-Regular",
    color: "#666",
  },
  sectionHeader: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Prompt-Bold",
    color: "#000",
  },
  listContainer: {
    marginBottom: 25,
  },
  listItem: {
    flexDirection: "row",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  listItemInfo: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontFamily: "Prompt-Bold",
    color: "#000",
    marginBottom: 5,
  },
  listItemDescription: {
    fontSize: 14,
    fontFamily: "Prompt-Regular",
    color: "#666",
  },
  listItemPrice: {
    paddingLeft: 10,
  },
  priceText: {
    fontSize: 16,
    fontFamily: "Prompt-Bold",
    color: "#000",
  },
  noServicesText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },
});
