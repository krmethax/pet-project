import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
  Modal,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { AntDesign, FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const scale = SCREEN_WIDTH / 375;

export default function Home() {
  const navigation = useNavigation();

  // States
  const [user, setUser] = useState(null);
  const [memberId, setMemberId] = useState(null);
  const [sitters, setSitters] = useState([]); // ข้อมูลพี่เลี้ยงทั้งหมด
  const [serviceTypes, setServiceTypes] = useState([]); // ประเภทงาน
  const [refreshing, setRefreshing] = useState(false);

  // Multi‑Select filter states (เลือกประเภทงาน)
  const [selectedServiceTypes, setSelectedServiceTypes] = useState([]);

  // Modal visibility สำหรับเลือกประเภทงานเพิ่มเติม
  const [modalVisible, setModalVisible] = useState(false);

  // ดึง memberId จาก AsyncStorage เมื่อ component mount
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

  // ดึงข้อมูลผู้ใช้ (Header)
  const fetchUser = useCallback(() => {
    if (!memberId) return;
    fetch(`http://192.168.1.10:5000/api/auth/member/${memberId}`)
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch((err) => console.error("Error fetching user:", err));
  }, [memberId]);

  // ดึงข้อมูลพี่เลี้ยงทั้งหมด
  const fetchSitters = useCallback(() => {
    fetch("http://192.168.1.10:5000/api/auth/sitters")
      .then((res) => res.json())
      .then((data) => setSitters(data.sitters || []))
      .catch((err) => console.error("Error fetching sitters:", err));
  }, []);

  // ดึงข้อมูลประเภทงาน (serviceTypes)
  const fetchServiceTypes = useCallback(() => {
    fetch("http://192.168.1.10:5000/api/auth/service-type")
      .then((res) => res.json())
      .then((data) => setServiceTypes(data.serviceTypes || []))
      .catch((err) => console.error("Error fetching service types:", err));
  }, []);

  // ดึงข้อมูลทั้งหมด
  const fetchAllData = useCallback(() => {
    if (memberId) fetchUser();
    fetchSitters();
    fetchServiceTypes();
  }, [memberId, fetchUser, fetchSitters, fetchServiceTypes]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ฟังก์ชัน Refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAllData();
    setRefreshing(false);
  }, [fetchAllData]);

  // กรองพี่เลี้ยงตามประเภทงานและจังหวัดของสมาชิก (ถ้ามีข้อมูล)
  const filteredSitters = useMemo(() => {
    return sitters.filter((s) => {
      const serviceMatch =
        selectedServiceTypes.length === 0 ||
        selectedServiceTypes.includes(s.service_type_id);
      const provinceMatch =
        user &&
        user.member &&
        user.member.province &&
        s.province &&
        s.province.toLowerCase().trim() === user.member.province.toLowerCase().trim();
      return serviceMatch && provinceMatch;
    });
  }, [sitters, selectedServiceTypes, user]);

  // คำนวณ jobTypesToShow สำหรับกริดหน้าจอ
  const jobTypesToShow = useMemo(() => {
    // คัดลอกข้อมูลประเภทงานทั้งหมด
    let arr = [...serviceTypes];
    // หากมีมากกว่า 7 รายการ ให้นำรายการที่ 6 (index 5) มาแทนที่ด้วย object ที่ระบุว่าเป็น "more"
    if (arr.length > 7) {
      arr.splice(5, 0, { more: true });
    }
    return arr;
  }, [serviceTypes]);

  // Navigation to sitter profile
  const handleNavigateToProfileSitter = (sitterId) => {
    navigation.navigate("ProfileSitter", { sitter_id: sitterId });
  };

  // Toggle Service Type (ประเภทงาน)
  const toggleServiceType = (serviceTypeId) => {
    setSelectedServiceTypes((prev) =>
      prev.includes(serviceTypeId)
        ? prev.filter((id) => id !== serviceTypeId)
        : [...prev, serviceTypeId]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              {user && user.member && user.member.profile_image ? (
                <Image source={{ uri: user.member.profile_image }} style={styles.avatarImage} />
              ) : (
                <AntDesign name="user" size={24 * scale} color="#000" />
              )}
            </View>
            <View style={styles.greeting}>
              <Text style={styles.greetingText}>สวัสดี</Text>
              <Text style={styles.subGreeting}>
                {user ? `${user.member.first_name} ${user.member.last_name}` : "ผู้เยี่ยมชม"}
              </Text>
            </View>
          </View>
        </View>

        {/* แสดงประเภทงานในรูปแบบกริด 2 แถว 4 วงกลมต่อแถว */}
        <View style={styles.jobTypesContainer}>
          {jobTypesToShow.map((job, index) => {
            if (job.more) {
              return (
                <TouchableOpacity
                  key="more"
                  style={[styles.jobTypeCircle, styles.moreCircle]}
                  onPress={() => setModalVisible(true)}
                >
                  <AntDesign name="ellipsis1" size={24 * scale} color="#FFF" />
                </TouchableOpacity>
              );
            } else {
              return (
                <TouchableOpacity
                  key={job.service_type_id}
                  style={[
                    styles.jobTypeCircle,
                    selectedServiceTypes.includes(job.service_type_id) &&
                      styles.jobTypeCircleSelected,
                  ]}
                  onPress={() => toggleServiceType(job.service_type_id)}
                >
                  <Text
                    style={[
                      styles.jobTypeText,
                      selectedServiceTypes.includes(job.service_type_id) &&
                        styles.jobTypeTextSelected,
                    ]}
                  >
                    {job.short_name}
                  </Text>
                </TouchableOpacity>
              );
            }
          })}
        </View>

        {/* Display Selected Filters */}
        {selectedServiceTypes.length > 0 && (
          <View style={styles.selectedFiltersContainer}>
            {selectedServiceTypes.map((id) => {
              const svc = serviceTypes.find((s) => s.service_type_id === id);
              return svc ? (
                <View key={id} style={styles.selectedFilterCapsule}>
                  <Text style={styles.selectedFilterText}>{svc.short_name}</Text>
                </View>
              ) : null;
            })}
          </View>
        )}

        {/* Section: พี่เลี้ยง (เฉพาะพี่เลี้ยงในจังหวัดเดียวกับสมาชิกที่เลือกประเภทงาน) */}
        <Text style={styles.sectionTitle}>พี่เลี้ยงใกล้ฉัน</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sitterAvatarRow}>
          {filteredSitters.length > 0 ? (
            filteredSitters.map((sitter) => (
              <TouchableOpacity
                key={sitter.sitter_id}
                style={styles.sitterAvatarContainer}
                onPress={() => handleNavigateToProfileSitter(sitter.sitter_id)}
              >
                <View style={styles.sitterAvatarWrapper}>
                  {sitter.profile_image ? (
                    <Image source={{ uri: sitter.profile_image }} style={styles.sitterAvatarImage} />
                  ) : (
                    <View style={styles.sitterPlaceholder}>
                      <AntDesign name="user" size={28 * scale} color="#FFF" />
                    </View>
                  )}
                </View>
                <Text style={styles.sitterAvatarName}>{sitter.first_name}</Text>
                <View style={styles.ratingContainer}>
                  <FontAwesome name="star" size={14 * scale} color="#FFD700" style={styles.starIcon} />
                  <Text style={styles.ratingText}>{sitter.rating ? sitter.rating.toFixed(1) : "0.0"}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.noServicesText}>ไม่พบพี่เลี้ยงบริเวณนี้</Text>
          )}
        </ScrollView>

        {/* Modal สำหรับเลือกประเภทงานเพิ่มเติม */}
        <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>เลือกประเภทงาน</Text>
              <ScrollView contentContainerStyle={styles.modalGrid}>
                <View style={styles.modalGridContainer}>
                  {serviceTypes.map((job) => (
                    <TouchableOpacity
                      key={job.service_type_id}
                      style={[
                        styles.jobTypeCircle,
                        selectedServiceTypes.includes(job.service_type_id) &&
                          styles.jobTypeCircleSelected,
                      ]}
                      onPress={() => toggleServiceType(job.service_type_id)}
                    >
                      <Text
                        style={[
                          styles.jobTypeText,
                          selectedServiceTypes.includes(job.service_type_id) &&
                            styles.jobTypeTextSelected,
                        ]}
                      >
                        {job.short_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCloseButtonText}>ปิด</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFF" },
  scrollContent: { padding: 20 },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25 * scale,
  },
  profileSection: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 50 * scale,
    height: 50 * scale,
    borderRadius: (50 * scale) / 2,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12 * scale,
    borderWidth: 1,
    borderColor: "#E52020",
  },
  avatarImage: { width: "100%", height: "100%", borderRadius: (50 * scale) / 2 },
  greeting: {},
  greetingText: { fontSize: 20 * scale, fontFamily: "Prompt-Bold", color: "#000" },
  subGreeting: { fontSize: 16 * scale, fontFamily: "Prompt-Regular", color: "#555" },
  // Job Types Grid
  jobTypesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20 * scale,
  },
  jobTypeCircle: {
    width: 70 * scale,
    height: 70 * scale,
    borderRadius: (70 * scale) / 2,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E52020",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15 * scale,
  },
  jobTypeCircleSelected: {
    backgroundColor: "#E52020",
  },
  jobTypeText: {
    fontSize: 14 * scale,
    fontFamily: "Prompt-Regular",
    color: "#E52020",
    textAlign: "center",
  },
  jobTypeTextSelected: {
    color: "#FFF",
  },
  moreCircle: {
    backgroundColor: "#E52020",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 20 * scale,
    padding: 20 * scale,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 22 * scale,
    fontFamily: "Prompt-Bold",
    color: "#000",
    marginBottom: 15 * scale,
    textAlign: "center",
  },
  modalGrid: {
    paddingVertical: 10 * scale,
  },
  modalGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  modalCloseButton: {
    backgroundColor: "#E52020",
    paddingVertical: 10 * scale,
    borderRadius: 10 * scale,
    alignItems: "center",
    marginTop: 10 * scale,
  },
  modalCloseButtonText: {
    fontSize: 16 * scale,
    fontFamily: "Prompt-Bold",
    color: "#FFF",
  },
  // Sitters (Horizontal Avatar List)
  sitterAvatarRow: { marginBottom: 20 * scale },
  sitterAvatarContainer: { width: 80 * scale, alignItems: "center", marginRight: 20 * scale },
  sitterAvatarWrapper: {
    width: 70 * scale,
    height: 70 * scale,
    borderRadius: 15 * scale,
    backgroundColor: "#ccc",
    overflow: "hidden",
    marginBottom: 8 * scale,
    justifyContent: "center",
    alignItems: "center",
  },
  sitterAvatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  sitterPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#999",
    justifyContent: "center",
    alignItems: "center",
  },
  sitterAvatarName: { fontSize: 16 * scale, fontFamily: "Prompt-Regular", color: "#000" },
  ratingContainer: { flexDirection: "row", alignItems: "center", marginTop: 2 * scale },
  starIcon: { marginRight: 3 * scale },
  ratingText: { fontSize: 14 * scale, fontFamily: "Prompt-Regular", color: "#000" },
  // Sitters Fallback Text
  noServicesText: {
    textAlign: "center",
    fontSize: 18 * scale,
    fontFamily: "Prompt-Regular",
    color: "#000",
    marginTop: 20 * scale,
  },
  // Selected Filters Display
  selectedFiltersContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20 * scale,
  },
  selectedFilterCapsule: {
    paddingVertical: 5 * scale,
    paddingHorizontal: 10 * scale,
    borderRadius: 15 * scale,
    backgroundColor: "#E52020",
    marginRight: 5 * scale,
    marginBottom: 5 * scale,
  },
  selectedFilterText: {
    fontSize: 12 * scale,
    fontFamily: "Prompt-Regular",
    color: "#FFF",
  },
});
