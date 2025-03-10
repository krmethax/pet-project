import React, { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

export default function AddService() {
  const navigation = useNavigation();
  const [stats, setStats] = useState({
    jobsCreated: 0,
    totalIncome: 0,
  });
  const [jobs, setJobs] = useState([]); // เก็บรายงานงาน
  const [sitterId, setSitterId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Mapping สำหรับแปลงหน่วยการคิดราคา
  const pricingUnitMapping = {
    per_walk: "การเดิน",
    per_night: "คืน",
    per_session: "ครั้ง",
  };

  // State สำหรับเก็บข้อมูลประเภทบริการ
  const [serviceTypes, setServiceTypes] = useState([]);

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

  // ดึงสถิติและรายงานงานจาก API
  const fetchStats = useCallback(() => {
    if (sitterId) {
      setLoading(true);
      fetch(`http://192.168.1.10:5000/api/sitter/sitter-services/${sitterId}`)
        .then(async (response) => {
          if (!response.ok) {
            const text = await response.text();
            console.log("Response status:", response.status);
            console.log("Response text:", text);
            throw new Error("ไม่สามารถดึงสถิติได้");
          }
          return response.json();
        })
        .then((data) => {
          console.log("งานที่ดึงมาจาก API:", data);
          // สมมติว่า API ส่งกลับข้อมูลในรูปแบบ { jobs: [...] }
          const jobList = data.services ? data.services : [];
          setJobs(jobList);
          setStats({
            jobsCreated: jobList.length,
            totalIncome: 0, // หากมี totalIncome ให้คำนวณตามที่ต้องการ
          });
          setLoading(false);
          setRefreshing(false);
        })
        .catch((error) => {
          console.error("Error fetching stats:", error);
          setLoading(false);
          setRefreshing(false);
        });
    } else {
      setRefreshing(false);
    }
  }, [sitterId]);

  // ดึงสถิติเมื่อได้ sitterId
  useEffect(() => {
    if (sitterId) {
      fetchStats();
    }
  }, [sitterId, fetchStats]);

  // ดึงประเภทบริการจาก API เมื่อ component mount
  useEffect(() => {
    const fetchServiceTypes = async () => {
      try {
        const response = await fetch("http://192.168.1.10:5000/api/sitter/service-types");
        if (response.ok) {
          const data = await response.json();
          console.log("ข้อมูลประเภทบริการที่ได้จาก API:", data);
          if (data.serviceTypes && Array.isArray(data.serviceTypes)) {
            setServiceTypes(data.serviceTypes);
          } else {
            console.error("รูปแบบข้อมูลประเภทบริการไม่ถูกต้อง:", data);
          }
        } else {
          console.error("ไม่สามารถดึงประเภทบริการได้");
        }
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดึงประเภทบริการ:", error);
      }
    };

    fetchServiceTypes();
  }, []);

  // ฟังก์ชันรีเฟรชหน้าจอ
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, [fetchStats]);

  // ฟังก์ชันนำทางไปยังหน้าจอเพิ่มงาน
  const handleAddJob = () => {
    navigation.navigate("AddJob");
  };

  // ฟังก์ชันช่วยจัดรูปแบบราคา (ถ้าเป็นตัวเลขที่ลงท้ายด้วย .00 ให้แสดงเป็นจำนวนเต็ม)
  const formatPrice = (price) => {
    const num = parseFloat(price);
    return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Card แสดงสถิติ */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>งานของฉัน</Text>
          <Text style={styles.statsValue}>
            {loading ? "กำลังโหลด..." : stats.jobsCreated}
          </Text>
        </View>

        {/* รายการงาน */}
        <View style={styles.jobsContainer}>
          {jobs.map((job, index) => (
            <View key={job.sitter_service_id} style={styles.jobCard}>
              <View style={styles.jobInfo}>
                {/* แสดงชื่อประเภทบริการจาก serviceTypes mapping */}
                <Text style={styles.jobTitle}>
                  {(() => {
                    const serviceType = serviceTypes.find(
                      (st) => st.service_type_id === job.service_type_id
                    );
                    return serviceType ? serviceType.short_name : "ไม่มีข้อมูลประเภทบริการ";
                  })()}
                </Text>
                {/* แสดงรายละเอียดเพิ่มเติม */}
                <Text style={styles.jobDetail}>
                  {job.description ? job.description : "ไม่มีข้อมูลรายละเอียด"}
                </Text>
              </View>
              <View style={styles.jobAmount}>
                <Text style={styles.amountText}>
                  {formatPrice(job.price)} บาท /{" "}
                  {job.pricing_unit ? pricingUnitMapping[job.pricing_unit] : ""}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ปุ่มเพิ่มงาน */}
        <TouchableOpacity style={styles.addButton} onPress={handleAddJob}>
          <Text style={styles.addButtonText}>เพิ่มงาน</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    marginTop: 30,
  },
  container: {
    padding: 20,
    flexGrow: 1,
  },
  // Card สำหรับแสดงสถิติ
  statsCard: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 20,
    marginBottom:20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 20,
    fontFamily: "Prompt-Bold",
    color: "#000",
    marginBottom: 10,
  },
  statsValue: {
    fontSize: 28,
    fontFamily: "Prompt-Bold",
    color: "#000",
  },
  // Container สำหรับรายการงาน
  jobsContainer: {
    marginBottom: 20,
  },
  // Card ของงานแต่ละงาน
  jobCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    alignItems: "center",
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 15,
    fontFamily: "Prompt-Bold",
    color: "#333",
    marginBottom: 5,
  },
  jobDetail: {
    fontSize: 14,
    fontFamily: "Prompt-Regular",
    color: "#666",
  },
  jobAmount: {
    justifyContent: "center",
    alignItems: "flex-end",
    marginLeft: 10,
  },
  amountText: {
    fontSize: 14,
    fontFamily: "Prompt-Bold",
    color: "#1E90FF",
  },
  // ปุ่มเพิ่มงาน
  addButton: {
    backgroundColor: "#1E90FF",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignSelf: "center",
  },
  addButtonText: {
    fontSize: 18,
    fontFamily: "Prompt-Bold",
    color: "#FFF",
  },
});
