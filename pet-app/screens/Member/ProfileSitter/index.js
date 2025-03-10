import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  MaterialIcons,
  Feather,
  FontAwesome,
  Ionicons,
  AntDesign,
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";

export default function ProfileSitter() {
  const route = useRoute();
  const navigation = useNavigation();
  const { sitter_id } = route.params; // รับ sitter_id จาก route params

  const [sitter, setSitter] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [liked, setLiked] = useState(false);
  const [activeTab, setActiveTab] = useState("jobs"); // "jobs" หรือ "about"
  const [refreshing, setRefreshing] = useState(false);
  const [memberId, setMemberId] = useState(null);

  // ดึง member_id จาก AsyncStorage
  useEffect(() => {
    const getMemberId = async () => {
      try {
        const storedMemberId = await AsyncStorage.getItem("member_id");
        if (storedMemberId) {
          setMemberId(storedMemberId);
        }
      } catch (error) {
        console.error("Failed to fetch member_id:", error);
      }
    };
    getMemberId();
  }, []);

  // ดึงข้อมูลโปรไฟล์พี่เลี้ยง
  const fetchProfile = useCallback(() => {
    fetch(`http://192.168.1.10:5000/api/auth/sitter/${sitter_id}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.sitter) {
          setSitter(data.sitter);
        }
      })
      .catch((error) => console.error("Error fetching sitter profile:", error));
  }, [sitter_id]);

  // ดึงข้อมูลงานของพี่เลี้ยง
  const fetchJobs = useCallback(() => {
    fetch("http://192.168.1.10:5000/api/auth/sitter-services")
      .then((response) => response.json())
      .then((data) => {
        if (data.services) {
          const sitterJobs = data.services.filter(
            (job) => job.sitter_id === Number(sitter_id)
          );
          setJobs(sitterJobs);
        }
      })
      .catch((error) => console.error("Error fetching jobs:", error));
  }, [sitter_id]);

  // ดึงข้อมูลประเภทบริการ
  useEffect(() => {
    fetch("http://192.168.1.10:5000/api/auth/service-type")
      .then((response) => response.json())
      .then((data) => {
        if (data.serviceTypes) {
          setServiceTypes(data.serviceTypes);
        } else {
          setServiceTypes(data);
        }
      })
      .catch((error) => console.error("Error fetching service types:", error));
  }, []);

  // ดึงสถานะถูกใจ (Favorite) ของพี่เลี้ยงสำหรับสมาชิกที่ล็อกอิน
  const fetchFavoriteStatus = useCallback(async () => {
    if (!memberId) return;
    try {
      const response = await fetch(`http://192.168.1.10:5000/api/auth/favorite/${memberId}`);
      const data = await response.json();
      if (response.ok && data.favorites) {
        const exists = data.favorites.some(
          (fav) => fav.sitter_id === Number(sitter_id)
        );
        setLiked(exists);
      }
    } catch (error) {
      console.error("Error fetching favorite status:", error);
    }
  }, [memberId, sitter_id]);

  // เรียก fetchProfile, fetchJobs และ fetchFavoriteStatus เมื่อ mount
  useEffect(() => {
    fetchProfile();
    fetchJobs();
    fetchFavoriteStatus();
  }, [fetchProfile, fetchJobs, fetchFavoriteStatus]);

  // ฟังก์ชันรีเฟรช
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfile();
    fetchJobs();
    fetchFavoriteStatus();
    setRefreshing(false);
  }, [fetchProfile, fetchJobs, fetchFavoriteStatus]);

  // ฟังก์ชันสำหรับสร้างการจอง (Booking)
  const createBooking = async () => {
    if (!selectedJob) {
      alert("กรุณาเลือกรายการงานที่ต้องการจอง");
      return null;
    }
    const bookingData = {
      member_id: memberId,
      sitter_id: sitter ? sitter.sitter_id : null,
      pet_type_id: selectedJob.pet_type_id || 1,
      pet_breed: "Unknown",
      sitter_service_id: selectedJob.sitter_service_id,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 86400000).toISOString(),
      total_price: selectedJob.price,
    };

    try {
      const response = await fetch("http://192.168.1.10:5000/api/auth/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });
      const textResponse = await response.text();
      console.log("Create Booking raw response:", textResponse);
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch (e) {
        console.error("Error parsing booking response JSON:", e);
        alert("ไม่สามารถแปลงข้อมูลการจองที่ได้จาก server ให้เป็น JSON");
        return null;
      }
      if (response.ok) {
        return data.booking_id;
      } else {
        alert("เกิดข้อผิดพลาดในการสร้างการจอง: " + data.message);
        return null;
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("เกิดข้อผิดพลาดในการสร้างการจอง");
      return null;
    }
  };

  // ฟังก์ชันสำหรับเพิ่มถูกใจพี่เลี้ยง
  const addFavorite = async () => {
    if (!memberId) return;
    try {
      const response = await fetch("http://192.168.1.10:5000/api/auth/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId, sitter_id }),
      });
      const data = await response.json();
      if (response.ok) {
        setLiked(true);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Error adding favorite:", error);
      alert("ไม่สามารถเพิ่มถูกใจได้");
    }
  };

  // ฟังก์ชันสำหรับลบถูกใจพี่เลี้ยง
  const removeFavorite = async () => {
    if (!memberId) return;
    try {
      const response = await fetch(
        `http://192.168.1.10:5000/api/auth/favorite/${memberId}/${sitter_id}`,
        { method: "DELETE" }
      );
      const data = await response.json();
      if (response.ok) {
        setLiked(false);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Error removing favorite:", error);
      alert("ไม่สามารถลบถูกใจได้");
    }
  };

  // ถ้าไม่พบข้อมูลพี่เลี้ยง
  if (!sitter) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>ไม่พบข้อมูลพี่เลี้ยง</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>โปรไฟล์</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Profile Section */}
        <View style={styles.profileContainer}>
          <View style={styles.profileImageWrapper}>
            <Image
              source={
                sitter.profile_image
                  ? { uri: sitter.profile_image }
                  : require("../../../assets/images/avatar.png")
              }
              style={styles.profileImageSmall}
            />
            {sitter.verification_status === "approved" && (
              <MaterialIcons
                name="verified"
                size={20}
                color="#4CAF50"
                style={styles.verifiedIconInline}
              />
            )}
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.nameSmall}>
              {sitter.first_name} {sitter.last_name}
            </Text>
            <View style={styles.infoRowSmall}>
              <FontAwesome name="star" size={18} color="#FFD700" style={styles.starIcon} />
              <Text style={styles.ratingTextSmall}>
                {sitter.rating ? sitter.rating.toFixed(1) : "0.0"}
              </Text>
              <MaterialIcons name="location-on" size={18} color="#000" style={styles.locationIcon} />
              <Text style={styles.locationSmall}>
                {sitter.province || "ไม่ระบุจังหวัด"}
              </Text>
            </View>
          </View>
        </View>

        {/* Tab Header */}
        <View style={styles.tabHeader}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "jobs" && styles.tabButtonActive]}
            onPress={() => setActiveTab("jobs")}
          >
            <Text style={[styles.tabButtonText, activeTab === "jobs" && styles.tabButtonTextActive]}>
              งานที่เปิดรับ
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "about" && styles.tabButtonActive]}
            onPress={() => setActiveTab("about")}
          >
            <Text style={[styles.tabButtonText, activeTab === "about" && styles.tabButtonTextActive]}>
              เกี่ยวกับพี่เลี้ยง
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === "jobs" ? (
          <>
            {jobs.length > 0 ? (
              jobs.map((jobItem) => (
                <TouchableOpacity
                  key={jobItem.sitter_service_id}
                  style={[
                    styles.jobCard,
                    selectedJob &&
                      selectedJob.sitter_service_id === jobItem.sitter_service_id &&
                      styles.jobCardSelected,
                  ]}
                  onPress={() =>
                    setSelectedJob((prev) =>
                      prev && prev.sitter_service_id === jobItem.sitter_service_id ? null : jobItem
                    )
                  }
                >
                  <Text style={styles.jobTitle}>{jobItem.short_name || "ไม่ระบุ"}</Text>
                  <Text style={styles.jobDescription}>
                    {jobItem.description || "ไม่มีรายละเอียด"}
                  </Text>
                  <Text style={styles.jobPrice}>{jobItem.price} บาท</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noJobsText}>ไม่มีงานที่เปิดรับ</Text>
            )}
          </>
        ) : (
          <>
            <View style={styles.aboutContainer}>
              <MaterialIcons name="email" size={20} color="#000" style={styles.aboutIcon} />
              <Text style={styles.aboutValue}>{sitter.email}</Text>
            </View>
            <View style={styles.aboutContainer}>
              <Ionicons name="call" size={20} color="#000" style={styles.aboutIcon} />
              <Text style={styles.aboutValue}>{sitter.phone}</Text>
            </View>
            <View style={styles.aboutContainer}>
              <MaterialIcons name="location-on" size={20} color="#000" style={styles.aboutIcon} />
              <Text style={styles.aboutValue}>
                {sitter.address || "ไม่ระบุ"} ตำบล{sitter.tambon || "ไม่ระบุ"} อำเภอ
                {sitter.amphure || "ไม่ระบุ"} จังหวัด{sitter.province || "ไม่ระบุ"}
              </Text>
            </View>
            <View style={styles.aboutContainer}>
              <FontAwesome name="briefcase" size={20} color="#000" style={styles.aboutIcon} />
              <Text style={styles.aboutValue}>{sitter.experience || "ไม่ระบุ"}</Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Footer Buttons: ปุ่มถูกใจอยู่ด้านซ้าย, ปุ่มจองอยู่ด้านขวา (ปุ่มจองยาว) */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.favoriteButtonFooter}
          onPress={() => (liked ? removeFavorite() : addFavorite())}
        >
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={28}
            color={liked ? "red" : "#4D5DFB"}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bookButton, !selectedJob && styles.bookButtonDisabled]}
          onPress={async () => {
            if (selectedJob) {
              const booking_id = await createBooking();
              if (booking_id) {
                navigation.navigate("BookingDetail", {
                  job: { ...selectedJob, booking_id },
                });
              } else {
                console.error("Booking creation failed, booking_id is null");
              }
            }
          }}
          disabled={!selectedJob}
        >
          <Text style={styles.bookButtonText}>จอง</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16, color: "#000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    marginBottom: 10,
  },
  backButton: { padding: 5 },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Prompt-Medium",
    color: "#000",
    marginLeft: 10,
  },
  scrollContainer: { padding: 20, backgroundColor: "#fff" },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 15,
  },
  profileImageWrapper: { position: "relative", marginRight: 15 },
  profileImageSmall: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#000",
  },
  verifiedIconInline: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 2,
  },
  profileDetails: { flex: 1, justifyContent: "center" },
  nameSmall: { fontSize: 18, fontFamily: "Prompt-Bold", color: "#000" },
  infoRowSmall: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  starIcon: { marginRight: 5 },
  ratingTextSmall: { fontSize: 16, fontFamily: "Prompt-Regular", color: "#000", marginRight: 10 },
  locationIcon: { marginRight: 5 },
  locationSmall: { fontSize: 16, fontFamily: "Prompt-Regular", color: "#000" },
  tabHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    marginVertical: 15,
  },
  tabButton: { paddingVertical: 10 },
  tabButtonActive: { borderBottomWidth: 2, borderBottomColor: "#000" },
  tabButtonText: { fontSize: 16, color: "#000", fontFamily: "Prompt-Regular" },
  tabButtonTextActive: { fontWeight: "bold", fontFamily: "Prompt-Bold" },
  jobCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  jobCardSelected: { borderColor: "#000" },
  jobTitle: { fontSize: 16, fontFamily: "Prompt-Bold", color: "#000", marginBottom: 5 },
  jobDescription: { fontSize: 14, fontFamily: "Prompt-Regular", color: "#333", marginBottom: 5 },
  jobPrice: { fontSize: 14, fontFamily: "Prompt-Bold", color: "#000" },
  noJobsText: { fontSize: 16, fontFamily: "Prompt-Regular", color: "#000", marginTop: 10 },
  aboutContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingVertical: 8,
  },
  aboutIcon: { marginRight: 10 },
  aboutValue: { fontSize: 16, fontFamily: "Prompt-Regular", color: "#000" },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    backgroundColor: "#fff",
  },
  favoriteButtonFooter: {
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 25,
  },
  bookButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#000",
    borderRadius: 25,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 20,
  },
  bookButtonDisabled: { opacity: 0.5 },
  bookButtonText: { fontSize: 16, color: "#fff", fontFamily: "Prompt-Bold" },
});
