import React, { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Jobs() {
  const navigation = useNavigation();
  const [jobs, setJobs] = useState([]);
  const [sitterId, setSitterId] = useState(null);
  const [serviceTypes, setServiceTypes] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("new"); // "new", "approved", "cancelled"

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

  // ดึงข้อมูล service types จาก API แล้วเก็บ mapping โดย key เป็น service_type_id และ value เป็น short_name
  const fetchServiceTypes = useCallback(async () => {
    try {
      const response = await fetch("http://192.168.1.10:5000/api/sitter/service-types");
      if (!response.ok) {
        throw new Error("ไม่สามารถดึงข้อมูลประเภทงานได้");
      }
      const data = await response.json();
      // สมมติว่า API ส่งกลับเป็นอาเรย์ใน field serviceTypes
      const mapping = {};
      data.serviceTypes.forEach((type) => {
        // ใช้ field sitter_service_type จากตาราง service_types เป็น key
        mapping[type.sitter_service_type] = type.short_name;
      });
      console.log("Service types mapping:", mapping);
      setServiceTypes(mapping);
    } catch (error) {
      console.error("Error fetching service types:", error);
    }
  }, []);
  
  // ดึงข้อมูล service types ครั้งแรกเมื่อ component mount
  useEffect(() => {
    fetchServiceTypes();
  }, [fetchServiceTypes]);

  // ดึงข้อมูลสมาชิกจาก API สำหรับ memberId
  const fetchMember = async (memberId) => {
    try {
      const response = await fetch(`http://192.168.1.10:5000/api/auth/member/${memberId}`);
      if (!response.ok) {
        throw new Error("ไม่สามารถดึงข้อมูลสมาชิกได้");
      }
      const data = await response.json();
      // สมมติว่า API ส่งกลับข้อมูลสมาชิกใน field member
      return data.member;
    } catch (error) {
      console.error(`Error fetching member ${memberId}:`, error);
      return null;
    }
  };

  // ดึงข้อมูลงานจาก API 
  const fetchJobs = useCallback(async () => {
    if (sitterId) {
      setLoading(true);
      try {
        const response = await fetch(`http://192.168.1.10:5000/api/sitter/jobs/${sitterId}`);
        if (!response.ok) {
          const text = await response.text();
          console.log("Response status:", response.status);
          console.log("Response text:", text);
          throw new Error("ไม่สามารถดึงข้อมูลงานได้");
        }
        const data = await response.json();
        const transformedJobs = await Promise.all(
          data.jobs.map(async (job) => {
            const memberData = await fetchMember(job.member_id);
            const memberName = memberData
              ? (memberData.member_name ||
                  `${memberData.first_name || ""} ${memberData.last_name || ""}`.trim())
              : "";
            const serviceTypeName = serviceTypes[job.sitter_service_id] || "";
            return {
              jobId: job.booking_id,
              jobTitle: serviceTypeName,
              memberName,
              bookingDate: job.start_date,
              price: job.total_price,
              status: job.status,
            };
          })
        );
        // สามารถตรวจสอบข้อมูล transformedJobs ได้ภายในฟังก์ชันนี้
        console.log("Transformed jobs:", transformedJobs);
        setJobs(transformedJobs);
      } catch (error) {
        console.error("Error fetching jobs:", error);
      } finally {
        setLoading(false);
      }
    }
  }, [sitterId, serviceTypes]);

  useEffect(() => {
    if (sitterId) {
      fetchJobs();
    }
  }, [sitterId, serviceTypes, fetchJobs]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchJobs().then(() => setRefreshing(false));
  }, [fetchJobs]);

  // ฟังก์ชันสำหรับเปลี่ยนแท็บ (Segmented Control)
  const renderTabButtons = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === "new" && styles.tabButtonActive]}
        onPress={() => setActiveTab("new")}
      >
        <Text style={[styles.tabButtonText, activeTab === "new" && styles.tabButtonTextActive]}>
          คำขอใหม่
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === "approved" && styles.tabButtonActive]}
        onPress={() => setActiveTab("approved")}
      >
        <Text style={[styles.tabButtonText, activeTab === "approved" && styles.tabButtonTextActive]}>
          อนุมัติคำขอ
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === "cancelled" && styles.tabButtonActive]}
        onPress={() => setActiveTab("cancelled")}
      >
        <Text style={[styles.tabButtonText, activeTab === "cancelled" && styles.tabButtonTextActive]}>
          ยกเลิกคำขอ
        </Text>
      </TouchableOpacity>
    </View>
  );

  // กรองงานตาม activeTab
  const filteredJobs = jobs.filter((job) => {
    if (activeTab === "new") {
      return job.status !== "confirmed" && job.status !== "cancelled";
    } else if (activeTab === "approved") {
      return job.status === "confirmed";
    } else if (activeTab === "cancelled") {
      return job.status === "cancelled";
    }
    return true;
  });

  // Card สำหรับคำขอใหม่
  const renderJobCard = (job) => (
    <View key={job.jobId} style={styles.card}>
      <View style={styles.cardContent}>
        <Text style={styles.jobTitle}>{job.jobTitle}</Text>
        <Text style={styles.memberName}>จองโดย: {job.memberName}</Text>
        <Text style={styles.priceText}>฿ {job.price}</Text>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.acceptButton} onPress={() => handleAcceptJob(job)}>
          <Text style={styles.acceptButtonText}>รับงาน</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancelJob(job)}>
          <Text style={styles.cancelButtonText}>ยกเลิก</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Card สำหรับงานที่อนุมัติและยกเลิก (แสดงแบบง่าย)
  const renderSimpleCard = (job) => (
    <View key={job.jobId} style={styles.card}>
      <View style={styles.cardContent}>
        <Text style={styles.jobTitle}>{job.jobTitle}</Text>
        <Text style={styles.memberName}>จองโดย: {job.memberName}</Text>
        <Text style={styles.priceText}>฿ {job.price}</Text>
        {activeTab === "approved" && <Text style={styles.approvedStatus}>รับงานแล้ว</Text>}
        {activeTab === "cancelled" && <Text style={styles.cancelledStatus}>ยกเลิกคำขอ</Text>}
      </View>
    </View>
  );

  // ฟังก์ชันรับงาน
  const handleAcceptJob = async (job) => {
    if (!job || !sitterId) return;
    if (job.status === "confirmed") {
      Alert.alert("แจ้งเตือน", "งานนี้ถูกรับงานแล้ว");
      return;
    }
    try {
      const response = await fetch("http://192.168.1.10:5000/api/sitter/jobs/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: job.jobId, sitter_id: sitterId }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "ไม่สามารถรับงานได้");
      }
      Alert.alert("สำเร็จ", "รับงานเรียบร้อยแล้ว");
      fetchJobs();
    } catch (error) {
      console.error("Accept Job error:", error);
      Alert.alert("ผิดพลาด", error.message);
    }
  };

  // ฟังก์ชันยกเลิกงาน
  const handleCancelJob = async (job) => {
    if (!job || !sitterId) return;
    try {
      const response = await fetch("http://192.168.1.10:5000/api/sitter/jobs/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: job.jobId, sitter_id: sitterId }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "ไม่สามารถยกเลิกงานได้");
      }
      Alert.alert("สำเร็จ", "ยกเลิกงานเรียบร้อยแล้ว");
      fetchJobs();
    } catch (error) {
      console.error("Cancel Job error:", error);
      Alert.alert("ผิดพลาด", error.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={styles.headerTitle}>คำขอ</Text>
          {renderTabButtons()}
          {filteredJobs.length > 0 ? (
            filteredJobs.map((job) =>
              activeTab === "new" ? renderJobCard(job) : renderSimpleCard(job)
            )
          ) : (
            <Text style={styles.noJobsText}>ยังไม่มีคำขอ</Text>
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
    padding: 20,
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Prompt-Bold",
    color: "#000",
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#f2f2f2",
  },
  tabButtonActive: {
    backgroundColor: "#E52020",
  },
  tabButtonText: {
    fontSize: 14,
    fontFamily: "Prompt-Medium",
    color: "#000",
  },
  tabButtonTextActive: {
    color: "#FFF",
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
  memberName: {
    fontSize: 14,
    fontFamily: "Prompt-Regular",
    color: "#666",
    marginBottom: 5,
  },
  priceText: {
    fontSize: 16,
    fontFamily: "Prompt-Bold",
    color: "#000",
  },
  approvedStatus: {
    marginTop: 5,
    fontSize: 14,
    fontFamily: "Prompt-Bold",
    color: "#4CAF50",
  },
  cancelledStatus: {
    marginTop: 5,
    fontSize: 14,
    fontFamily: "Prompt-Bold",
    color: "#999",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  acceptButton: {
    flex: 1,
    backgroundColor: "#FF0000",
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: "center",
    marginRight: 5,
  },
  acceptButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Prompt-Bold",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    marginLeft: 5,
  },
  cancelButtonText: {
    color: "#000",
    fontSize: 16,
    fontFamily: "Prompt-Bold",
  },
  noJobsText: {
    fontSize: 16,
    fontFamily: "Prompt-Regular",
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },
});
