import React, { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { AntDesign } from "@expo/vector-icons";

export default function AddService() {
  const navigation = useNavigation();
  const [jobs, setJobs] = useState([]); // เก็บรายงานงานที่เปิดอยู่
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

  // ดึงรายงานงานจาก API
  const fetchStats = useCallback(() => {
    if (sitterId) {
      setLoading(true);
      fetch(`http://192.168.1.8:5000/api/sitter/sitter-services/${sitterId}`)
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
          // สมมติว่า API ส่งกลับข้อมูลในรูปแบบ { services: [...] }
          const jobList = data.services ? data.services : [];
          setJobs(jobList);
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

  // ดึงรายงานงานเมื่อได้ sitterId
  useEffect(() => {
    if (sitterId) {
      fetchStats();
    }
  }, [sitterId, fetchStats]);

  // ดึงประเภทบริการจาก API เมื่อ component mount
  useEffect(() => {
    const fetchServiceTypes = async () => {
      try {
        const response = await fetch("http://192.168.1.8:5000/api/sitter/service-types");
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

  // ฟังก์ชันนำทางไปยังหน้าจอเพิ่มงานใหม่
  const handleAddJob = () => {
    navigation.navigate("AddJob");
  };

  // ฟังก์ชันช่วยจัดรูปแบบราคา (ถ้าเป็นตัวเลขที่ลงท้ายด้วย .00 ให้แสดงเป็นจำนวนเต็ม)
  const formatPrice = (price) => {
    const num = parseFloat(price);
    return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
  };

  // ฟังก์ชันลบงานเชื่อมกับ API สำหรับลบงานที่พี่เลี้ยงเพิ่ม
  const handleDeleteJob = (jobId) => {
    Alert.alert("ยืนยัน", "คุณต้องการลบงานนี้หรือไม่?", [
      {
        text: "ยกเลิก",
        style: "cancel",
      },
      {
        text: "ลบ",
        onPress: async () => {
          try {
            const response = await fetch(`http://192.168.1.8:5000/api/sitter/sitter-service/${jobId}`, {
              method: "DELETE",
            });
            const data = await response.json();
            if (response.ok) {
              Alert.alert("สำเร็จ", "ลบงานเรียบร้อยแล้ว");
              // รีเฟรชรายการงานหลังจากลบสำเร็จ
              fetchStats();
            } else {
              Alert.alert("ผิดพลาด", data.message || "ไม่สามารถลบงานได้");
            }
          } catch (error) {
            console.error("Delete job error:", error);
            Alert.alert("ผิดพลาด", "เกิดข้อผิดพลาดในการลบงาน");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header: มีปุ่ม back และหัวข้อ "งานของฉัน" รวมกันที่ฝั่งซ้าย,
            ส่วนปุ่ม + อยู่ฝั่งขวา */}
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>งานของฉัน</Text>
          </View>
          <TouchableOpacity style={styles.plusButton} onPress={handleAddJob}>
            <AntDesign name="pluscircleo" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* ถ้าไม่มีงานในระบบ จะแสดงข้อความแจ้ง */}
        {jobs.length === 0 ? (
          <Text style={styles.noJobsText}>ยังไม่มีงานของคุณ</Text>
        ) : (
          <View style={styles.jobsContainer}>
            {jobs.map((job) => (
              <View key={job.sitter_service_id} style={styles.card}>
                <View style={styles.cardContent}>
                  <Text style={styles.jobTitle}>
                    {(() => {
                      const serviceType = serviceTypes.find(
                        (st) => parseInt(st.service_type_id) === parseInt(job.service_type_id)
                      );
                      return serviceType
                        ? serviceType.short_name
                        : "ไม่มีข้อมูลประเภทบริการ";
                    })()}
                  </Text>
                  <Text style={styles.jobDetail}>
                    {job.description ? job.description : "ไม่มีข้อมูลรายละเอียด"}
                  </Text>
                </View>
                {/* Row สำหรับแสดงจำนวนเงินและไอคอนถังขยะ */}
                <View style={styles.priceRow}>
                  <Text style={styles.jobAmount}>
                    {formatPrice(job.price)} บาท /{" "}
                    {job.pricing_unit ? pricingUnitMapping[job.pricing_unit] : ""}
                  </Text>
                  <TouchableOpacity onPress={() => handleDeleteJob(job.sitter_service_id)}>
                    <AntDesign name="delete" size={24} color="#FF0000" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Prompt-Bold",
    color: "#000",
  },
  plusButton: {
    // ปุ่ม + อยู่ฝั่งขวา
  },
  noJobsText: {
    fontSize: 16,
    fontFamily: "Prompt-Regular",
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },
  jobsContainer: {
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    marginBottom: 15,
    padding: 15,
  },
  cardContent: {
    marginBottom: 10,
  },
  jobTitle: {
    fontSize: 18,
    fontFamily: "Prompt-Bold",
    color: "#333",
    marginBottom: 5,
  },
  jobDetail: {
    fontSize: 16,
    fontFamily: "Prompt-Regular",
    color: "#555",
    marginBottom: 5,
  },
  // Row สำหรับจำนวนเงินและไอคอนถังขยะ
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  jobAmount: {
    fontSize: 16,
    fontFamily: "Prompt-Bold",
    color: "#000",
  },
});
