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

// ฟังก์ชันเพื่อเปรียบเทียบเวลา
const isOverlapping = (start1, end1, start2, end2) => {
  return (start1 < end2 && end1 > start2); // เช็คว่าเวลา 1 และ 2 ทับซ้อนกันหรือไม่
};

export default function Jobs() {
  const navigation = useNavigation();
  const [jobs, setJobs] = useState([]);
  const [sitterId, setSitterId] = useState(null);
  const [serviceTypes, setServiceTypes] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("new"); // "new", "approved", "cancelled"
  const [acceptedJobs, setAcceptedJobs] = useState([]); // เก็บงานที่รับแล้ว

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

  const fetchServiceTypes = useCallback(async () => {
    try {
      const response = await fetch("http://192.168.1.12:5000/api/sitter/service-types");
      if (!response.ok) {
        throw new Error("ไม่สามารถดึงข้อมูลประเภทงานได้");
      }
      const data = await response.json();
      const mapping = {};
      data.serviceTypes.forEach((type) => {
        mapping[type.service_type_id] = type.short_name;
      });
      setServiceTypes(mapping);
    } catch (error) {
      console.error("Error fetching service types:", error);
    }
  }, []);

  useEffect(() => {
    fetchServiceTypes();
  }, [fetchServiceTypes]);

  const fetchJobs = useCallback(async () => {
    if (sitterId) {
      setLoading(true);
      try {
        const response = await fetch(`http://192.168.1.12:5000/api/sitter/jobs/${sitterId}`);
        if (!response.ok) {
          throw new Error("ไม่สามารถดึงข้อมูลงานได้");
        }
        const data = await response.json();
        const transformedJobs = await Promise.all(
          data.jobs.map(async (job) => {
            const serviceType = serviceTypes[job.service_type_id] || "ไม่ระบุ";
            return {
              jobName: job.job_name,
              serviceType,
              memberName: `${job.first_name} ${job.last_name}`,
              phone: job.phone,
              bookingDate: new Date(job.created_at).toLocaleDateString("th-TH"),
              startTime: new Date(job.start_time).toLocaleTimeString("th-TH"),
              endTime: new Date(job.end_time).toLocaleTimeString("th-TH"),
              status: job.status, // เพิ่มสถานะ
              jobId: job.booking_id, // เพิ่ม jobId
            };
          })
        );
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
  }, [sitterId, fetchJobs]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchJobs().then(() => setRefreshing(false));
  }, [fetchJobs]);

  // ฟังก์ชันสำหรับเปลี่ยนแท็บ
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

  // ฟังก์ชันรับงาน
  const handleAcceptJob = async (job) => {
    if (!job || !sitterId) return;
    if (job.status === "confirmed") {
      Alert.alert("แจ้งเตือน", "งานนี้ถูกรับงานแล้ว");
      return;
    }

    // ตรวจสอบการชนของเวลา
    const overlappingJob = acceptedJobs.find((acceptedJob) =>
      isOverlapping(job.startTime, job.endTime, acceptedJob.startTime, acceptedJob.endTime)
    );

    if (overlappingJob) {
      Alert.alert("ไม่สามารถรับงานได้", "งานนี้ชนกับงานที่รับอยู่แล้ว");
      return;
    }

    try {
      const response = await fetch("http://192.168.1.12:5000/api/sitter/jobs/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: job.jobId, sitter_id: sitterId }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "ไม่สามารถรับงานได้");
      }
      setAcceptedJobs((prevJobs) => [...prevJobs, job]); // เพิ่มงานที่รับแล้ว
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
      const response = await fetch("http://192.168.1.12:5000/api/sitter/jobs/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: job.jobId, sitter_id: sitterId }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "ไม่สามารถยกเลิกงานได้");
      }
      setAcceptedJobs((prevJobs) =>
        prevJobs.filter((acceptedJob) => acceptedJob.jobId !== job.jobId) // ลบงานที่ยกเลิกออกจาก list
      );
      Alert.alert("สำเร็จ", "ยกเลิกงานเรียบร้อยแล้ว");
      fetchJobs();
    } catch (error) {
      console.error("Cancel Job error:", error);
      Alert.alert("ผิดพลาด", error.message);
    }
  };

  const renderJobCard = (job) => (
    <View key={job.jobId} style={styles.card}>
      <Text style={styles.jobTitle}>ชื่องาน: {job.jobName}</Text>
      <Text style={styles.jobDescription}>ประเภทบริการ: {job.serviceType}</Text>
      <Text style={styles.memberName}>จองโดย: {job.memberName}</Text>
      <Text style={styles.phone}>เบอร์โทร: {job.phone}</Text>
      <Text style={styles.bookingDate}>วันที่จอง: {job.bookingDate}</Text>
      <Text style={styles.time}>
        เวลาที่จอง: {job.startTime} - {job.endTime}
      </Text>

      {activeTab === "new" && job.status !== "confirmed" && job.status !== "cancelled" && (
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.acceptButton} onPress={() => handleAcceptJob(job)}>
            <Text style={styles.acceptButtonText}>รับงาน</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancelJob(job)}>
            <Text style={styles.cancelButtonText}>ยกเลิก</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

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
            filteredJobs.map((job) => renderJobCard(job))
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
  jobTitle: {
    fontSize: 18,
    fontFamily: "Prompt-Bold",
    color: "#333",
    marginBottom: 5,
  },
  jobDescription: {
    fontSize: 16,
    fontFamily: "Prompt-Regular",
    color: "#555",
    marginBottom: 5,
  },
  memberName: {
    fontSize: 14,
    fontFamily: "Prompt-Regular",
    color: "#666",
    marginBottom: 5,
  },
  phone: {
    fontSize: 14,
    fontFamily: "Prompt-Regular",
    color: "#666",
    marginBottom: 5,
  },
  bookingDate: {
    fontSize: 14,
    fontFamily: "Prompt-Regular",
    color: "#666",
    marginBottom: 5,
  },
  time: {
    fontSize: 14,
    fontFamily: "Prompt-Regular",
    color: "#666",
    marginBottom: 5,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
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
