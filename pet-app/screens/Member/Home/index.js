import React, { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
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

  // State สำหรับข้อมูลผู้ใช้ (สมาชิก), พี่เลี้ยง, ประเภทสัตว์เลี้ยง และ rating ของพี่เลี้ยง
  const [user, setUser] = useState(null);
  const [memberId, setMemberId] = useState(null);
  const [sitters, setSitters] = useState([]);
  const [petCategories, setPetCategories] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  // state สำหรับเก็บ rating ของพี่เลี้ยง (mapping: sitter_id -> averageRating)
  const [ratings, setRatings] = useState({});

  // ดึง memberId จาก AsyncStorage
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

  // ดึงข้อมูลผู้ใช้ (สมาชิก)
  const fetchUser = useCallback(() => {
    if (!memberId) return;
    fetch(`http://192.168.1.12:5000/api/auth/member/${memberId}`)
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch((err) => console.error("Error fetching user:", err));
  }, [memberId]);

  // ดึงข้อมูลพี่เลี้ยงทั้งหมด
  const fetchSitters = useCallback(() => {
    fetch("http://192.168.1.12:5000/api/auth/sitters")
      .then((res) => res.json())
      .then((data) => {
        setSitters(data.sitters || []);
      })
      .catch((err) => console.error("Error fetching sitters:", err));
  }, []);

  // ดึงข้อมูลประเภทสัตว์เลี้ยงจาก API
  const fetchPetCategories = useCallback(() => {
    fetch("http://192.168.1.12:5000/api/auth/pet-categories")
      .then((res) => res.json())
      .then((data) => setPetCategories(data.petCategories || []))
      .catch((err) => console.error("Error fetching pet categories:", err));
  }, []);

  // ฟังก์ชันดึงข้อมูลทั้งหมด
  const fetchAllData = useCallback(() => {
    if (memberId) {
      fetchUser();
    }
    fetchSitters();
    fetchPetCategories();
  }, [memberId, fetchUser, fetchSitters, fetchPetCategories]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ดึงค่าเฉลี่ย rating ของพี่เลี้ยงแต่ละคนจาก API reviews
  useEffect(() => {
    const fetchRatings = async () => {
      let newRatings = {};
      for (let sitter of sitters) {
        try {
          const response = await fetch(
            `http://192.168.1.12:5000/api/auth/reviews/sitter/${sitter.sitter_id}`
          );
          const data = await response.json();
          newRatings[sitter.sitter_id] = data.averageRating || 0;
        } catch (error) {
          console.error("Error fetching rating for sitter", sitter.sitter_id, error);
          newRatings[sitter.sitter_id] = 0;
        }
      }
      setRatings(newRatings);
    };
    if (sitters.length > 0) {
      fetchRatings();
    }
  }, [sitters]);

  // ฟังก์ชัน Refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAllData();
    setRefreshing(false);
  }, [fetchAllData]);

  // เมื่อกดที่ Sitter ให้ไปหน้า ProfileSitter พร้อมส่ง sitter_id
  const handleNavigateToProfileSitter = (sitterId) => {
    navigation.navigate("ProfileSitter", { sitter_id: sitterId });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header: แสดงรูปโปรไฟล์และชื่อ-นามสกุล (แบบ HomeSitter) */}
        <View style={styles.headerContainer}>
          <View style={styles.profileSection}>
            {user && user.member && user.member.profile_image ? (
              <Image
                source={{ uri: user.member.profile_image }}
                style={styles.profileAvatar}
              />
            ) : (
              <View style={styles.profileAvatar}>
                <AntDesign name="user" size={24 * scale} color="#FFF" />
              </View>
            )}
            <View style={styles.greeting}>
              <Text style={styles.greetingText}>สวัสดี</Text>
              {user && user.member && (
                <Text style={styles.headerText}>
                  {user.member.first_name} {user.member.last_name}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Banner Image */}
        <View style={styles.bannerContainer}>
          <Image
            source={require("../../../assets/images/allpet.jpg")}
            style={styles.bannerImage}
          />
        </View>

        {/* ประเภทสัตว์เลี้ยง */}
        <View style={styles.petTypeContainer}>
          <Text style={styles.sectionTitle}>ประเภทสัตว์เลี้ยง</Text>
          <TouchableOpacity style={styles.showMoreButton}>
            <Text style={styles.showMoreText}>แสดงเพิ่มเติม</Text>
          </TouchableOpacity>
        </View>

        {/* แสดงประเภทสัตว์เลี้ยงเป็นแนวนอน */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.petTypeScroll}
        >
          {petCategories.length > 0 ? (
            petCategories.map((item) => (
              <View key={item.pet_type_id} style={styles.petTypeItem}>
                <Text style={styles.petTypeItemText}>{item.type_name}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noServicesText}>ไม่พบประเภทสัตว์เลี้ยง</Text>
          )}
        </ScrollView>

        {/* พี่เลี้ยง: แสดงแบบแนวนอน */}
        <Text style={styles.sectionTitle}>พี่เลี้ยง</Text>
        {sitters.filter((sitter) => sitter.verification_status === "approved")
          .length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {sitters
              .filter((sitter) => sitter.verification_status === "approved")
              .map((sitter) => (
                <TouchableOpacity
                  key={sitter.sitter_id}
                  style={styles.sitterAvatarContainer}
                  onPress={() => handleNavigateToProfileSitter(sitter.sitter_id)}
                >
                  <View style={styles.sitterAvatarWrapper}>
                    {sitter.profile_image ? (
                      <Image
                        source={{ uri: sitter.profile_image }}
                        style={styles.sitterAvatarImage}
                      />
                    ) : (
                      <View style={styles.sitterPlaceholder}>
                        <AntDesign name="user" size={28 * scale} color="#FFF" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.sitterAvatarName}>{sitter.first_name}</Text>
                  <View style={styles.ratingContainer}>
                    <FontAwesome
                      name="star"
                      size={14 * scale}
                      color="#FFD700"
                      style={styles.starIcon}
                    />
                    <Text style={styles.ratingText}>
                      {ratings[sitter.sitter_id]
                        ? ratings[sitter.sitter_id].toFixed(1)
                        : "0.0"}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
          </ScrollView>
        ) : (
          <Text style={styles.noServicesText}>ไม่พบพี่เลี้ยง</Text>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  // Header
  headerContainer: {
    marginTop: 10 * scale,
    marginBottom: 20 * scale,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileAvatar: {
    width: 60 * scale,
    height: 60 * scale,
    borderRadius: 30 * scale,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12 * scale,
  },
  greeting: {
    flexDirection: "column",
  },
  greetingText: {
    fontSize: 18 * scale,
    fontFamily: "Prompt-Bold",
    color: "#000",
  },
  headerText: {
    fontSize: 16 * scale,
    fontFamily: "Prompt-Regular",
    color: "#000",
    marginTop: 5 * scale,
  },
  // Banner Image Styles
  bannerContainer: {
    marginBottom: 20 * scale,
  },
  bannerImage: {
    width: "100%",
    height: 200 * scale,
    resizeMode: "cover",
    borderRadius: 10 * scale,
  },
  // Pet Types
  petTypeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10 * scale,
  },
  showMoreButton: {
    padding: 5 * scale,
  },
  showMoreText: {
    fontSize: 14 * scale,
    color: "#E52020",
    fontFamily: "Prompt-Regular",
  },
  petTypeScroll: {
    marginBottom: 20 * scale,
  },
  petTypeItem: {
    backgroundColor: "#FFF",
    borderColor: "#E52020",
    borderWidth: 1,
    borderRadius: 20 * scale,
    paddingVertical: 5 * scale,
    paddingHorizontal: 15 * scale,
    marginRight: 10 * scale,
  },
  petTypeItemText: {
    fontSize: 14 * scale,
    color: "#E52020",
    fontFamily: "Prompt-Regular",
  },
  // Sitter list (Horizontal)
  sitterAvatarContainer: {
    width: 80 * scale,
    alignItems: "center",
    marginRight: 20 * scale,
  },
  sitterAvatarWrapper: {
    width: 70 * scale,
    height: 70 * scale,
    borderRadius: 70 * scale,
    backgroundColor: "#ccc",
    overflow: "hidden",
    marginBottom: 8 * scale,
    justifyContent: "center",
    alignItems: "center",
  },
  sitterAvatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  sitterPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#999",
    justifyContent: "center",
    alignItems: "center",
  },
  sitterAvatarName: {
    fontSize: 14 * scale,
    fontFamily: "Prompt-Regular",
    color: "#000",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2 * scale,
  },
  starIcon: {
    marginRight: 3 * scale,
  },
  ratingText: {
    fontSize: 14 * scale,
    fontFamily: "Prompt-Regular",
    color: "#000",
  },
  noServicesText: {
    textAlign: "center",
    fontSize: 16 * scale,
    fontFamily: "Prompt-Regular",
    color: "#000",
  },
});
