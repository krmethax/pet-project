import React, { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { AntDesign } from "@expo/vector-icons";

// Helper: แปลงรายได้ให้แสดงโดยไม่แสดง .00 ถ้าเป็นจำนวนเต็ม
const formatIncome = (income) => {
  const num = parseFloat(income);
  return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
};

export default function Home() {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [sitterId, setSitterId] = useState(null);
  const [stats, setStats] = useState({
    jobsCompleted: 0,
    totalIncome: 0,
  });
  const [incomeStats, setIncomeStats] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

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

  // ดึงข้อมูลพี่เลี้ยงจาก API (รวมสถิติ)
  const fetchUser = useCallback(() => {
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

  // ดึงข้อมูลรายได้และงานที่รับไปแล้วจาก API
  const fetchIncomeStats = useCallback(() => {
    if (sitterId) {
      fetch(`http://192.168.1.12:5000/api/sitter/sitter/income-stats/${sitterId}`)
        .then(async (response) => {
          if (!response.ok) {
            const text = await response.text();
            console.error("Income stats response status:", response.status);
            console.error("Income stats response text:", text);
            throw new Error("ไม่สามารถดึงข้อมูลรายได้ได้");
          }
          return response.json();
        })
        .then((data) => {
          console.log("Income stats data:", data);
          const incomeData = data.incomeStats || [];
          let totalJobs = 0;
          let totalIncome = 0;
          incomeData.forEach((item) => {
            totalJobs += Number(item.job_count);
            totalIncome += parseFloat(item.total_income);
          });
          setStats({
            jobsCompleted: totalJobs,
            totalIncome: totalIncome,
          });
        })
        .catch((error) => {
          console.error("Error fetching income stats:", error);
        });
    }
  }, [sitterId]);

  // ดึงข้อมูลทั้งหมด (ไม่รวมพี่เลี้ยงแนะนำ)
  const fetchAllData = useCallback(() => {
    if (sitterId) {
      fetchUser();
      fetchIncomeStats();
    }
  }, [sitterId, fetchUser, fetchIncomeStats]);

  useEffect(() => {
    if (sitterId) {
      fetchAllData();
    }
  }, [sitterId, fetchAllData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAllData();
    setRefreshing(false);
  }, [fetchAllData]);

  // เมื่อจิ้มที่ Card สถิติ จะนำไปหน้า Graph เพื่อแสดงรายได้แบบละเอียด
  const handleStatsPress = () => {
    navigation.navigate("Graph", { stats, incomeStats });
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
          {/* Header: แสดง "สวัสดี" และ ชื่อ-นามสกุล พร้อมรูปโปรไฟล์ */}
          <View style={styles.header}>
            <View style={styles.profileSection}>
              {user && user.sitter && user.sitter.profile_image ? (
                <Image
                  source={{ uri: user.sitter.profile_image }}
                  style={styles.profileAvatar}
                />
              ) : (
                <View style={styles.profileAvatar}>
                  <AntDesign name="user" size={24} color="#FFF" />
                </View>
              )}
              <View style={styles.greeting}>
                <Text style={styles.greetingText}>สวัสดี</Text>
                {user && user.sitter && (
                  <Text style={styles.nameText}>
                    {user.sitter.first_name} {user.sitter.last_name}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Card สถิติ */}
          <TouchableOpacity style={styles.statsCard} onPress={handleStatsPress}>
            <Text style={styles.statsTitle}>สถิติของคุณ</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.jobsCompleted}</Text>
                <Text style={styles.statLabel}>รับงานไปแล้ว</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  ฿ {formatIncome(stats.totalIncome)}
                </Text>
                <Text style={styles.statLabel}>รายได้รวม</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* ส่วนของพี่เลี้ยงแนะนำถูกลบออกแล้ว */}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFF" },
  container: { flex: 1, backgroundColor: "#FFF" },
  scrollContainer: { padding: 20, paddingBottom: 40 },
  // Header
  header: {
    marginBottom: 25,
    alignItems: "flex-start",
    width: "100%",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
  nameText: {
    fontSize: 16,
    fontFamily: "Prompt-Regular",
    color: "#000",
  },
  // Card สถิติ
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
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  statItem: { alignItems: "center", flex: 1 },
  statValue: { fontSize: 22, fontFamily: "Prompt-Bold", color: "#000" },
  statLabel: { fontSize: 14, fontFamily: "Prompt-Regular", color: "#666" },
});
