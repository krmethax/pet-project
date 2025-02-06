import React, { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

export default function Jobs() {
  const navigation = useNavigation();
  const [jobs, setJobs] = useState([]);
  const [user, setUser] = useState(null);
  const [sitterId, setSitterId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    jobsCompleted: 0,
    totalIncome: 0,
  });

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

  // ฟังก์ชันดึงข้อมูลงานจาก API
  const fetchJobs = useCallback(() => {
    if (sitterId) {
      setLoading(true);
      // เปลี่ยน URL ให้ตรงกับ endpoint ที่ backend ของคุณกำหนดไว้
      fetch(`http://192.168.133.111:5000/api/sitter/jobs/${sitterId}`)
        .then(async (response) => {
          if (!response.ok) {
            const text = await response.text();
            console.log("Response status:", response.status);
            console.log("Response text:", text);
            throw new Error("ไม่สามารถดึงข้อมูลงานได้");
          }
          return response.json();
        })
        .then((data) => {
          // สมมติว่าโครงสร้าง JSON ที่ได้รับเป็น:
          // { jobs: [ { jobId, jobTitle, memberName, bookingDate, price, ... }, ... ] }
          setJobs(data.jobs || []);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching jobs:", error);
          setLoading(false);
        });
    }
  }, [sitterId]);

  // ฟังก์ชันดึงข้อมูลพี่เลี้ยงจาก API
  const fetchUserData = useCallback(() => {
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
          // สมมติว่าโครงสร้าง JSON ที่ได้รับเป็น:
          // { sitter: { sitter_id, first_name, ... }, stats: { jobsCompleted, totalIncome } }
          console.log("Data from server:", data);
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

  // ดึงข้อมูลทั้งหมดเมื่อได้ sitterId
  useEffect(() => {
    if (sitterId) {
      fetchJobs();
      fetchUserData();
    }
  }, [sitterId, fetchJobs, fetchUserData]);

  // ฟังก์ชันรีเฟรชหน้าจอ
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // เรียกดึงข้อมูลงานและข้อมูลพี่เลี้ยงใหม่
    Promise.all([fetchJobs(), fetchUserData()]).then(() => {
      setRefreshing(false);
    });
  }, [fetchJobs, fetchUserData]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <Text style={styles.headerTitle}>คำขอ</Text>

          {loading ? (
            <Text style={styles.loadingText}>กำลังโหลดงาน...</Text>
          ) : jobs.length > 0 ? (
            jobs.map((job) => (
              <View key={job.jobId} style={styles.jobItem}>
                <View style={styles.jobDetails}>
                  <Text style={styles.jobTitle}>{job.jobTitle}</Text>
                  <Text style={styles.memberName}>จองโดย: {job.memberName}</Text>
                  <Text style={styles.bookingDate}>วันที่: {job.bookingDate}</Text>
                </View>
                <View style={styles.jobPrice}>
                  <Text style={styles.priceText}>฿ {job.price}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noJobsText}>ยังไม่มีคำขอใหม่</Text>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    marginTop: 30,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Prompt-Bold",
    color: "#000",
    marginBottom: 20,
    textAlign: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },
  noJobsText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },
  jobItem: {
    flexDirection: "row",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  jobDetails: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 18,
    fontFamily: "Prompt-Bold",
    color: "#000",
  },
  memberName: {
    fontSize: 14,
    fontFamily: "Prompt-Regular",
    color: "#666",
    marginTop: 5,
  },
  bookingDate: {
    fontSize: 14,
    fontFamily: "Prompt-Regular",
    color: "#666",
    marginTop: 5,
  },
  jobPrice: {
    paddingLeft: 10,
  },
  priceText: {
    fontSize: 16,
    fontFamily: "Prompt-Bold",
    color: "#000",
  },
});
