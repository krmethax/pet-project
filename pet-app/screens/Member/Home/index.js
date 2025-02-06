import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  RefreshControl,
  Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { AntDesign } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

export default function Home() {
  const navigation = useNavigation();

  // States สำหรับข้อมูลผู้ใช้และงาน
  const [user, setUser] = useState(null);
  const [memberId, setMemberId] = useState(null);
  const [sitterServices, setSitterServices] = useState([]); // งานของพี่เลี้ยง
  const [serviceTypes, setServiceTypes] = useState([]); // ประเภทบริการ
  const [petCategories, setPetCategories] = useState([]); // หมวดหมู่สัตว์เลี้ยง
  const [refreshing, setRefreshing] = useState(false);

  // States สำหรับฟิลเตอร์
  const [selectedPetCategory, setSelectedPetCategory] = useState(null);
  const [selectedServiceType, setSelectedServiceType] = useState(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

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

  // ดึงข้อมูลผู้ใช้งาน
  const fetchUser = useCallback(() => {
    if (memberId) {
      fetch(`http://192.168.133.111:5000/api/auth/member/${memberId}`)
        .then(async (response) => {
          if (!response.ok) {
            const text = await response.text();
            console.log("Response status:", response.status);
            console.log("Response text:", text);
            throw new Error("ไม่สามารถดึงข้อมูลผู้ใช้งานได้");
          }
          return response.json();
        })
        .then((data) => {
          console.log("User data:", data);
          setUser(data);
        })
        .catch((error) => {
          console.error("Error fetching user:", error);
        });
    }
  }, [memberId]);

  // ดึงข้อมูลประเภทบริการจาก API
  const fetchServiceTypes = useCallback(() => {
    fetch("http://192.168.133.111:5000/api/auth/service-type")
      .then(async (response) => {
        if (!response.ok) {
          console.error("ไม่สามารถดึงประเภทบริการได้");
          return;
        }
        return response.json();
      })
      .then((data) => {
        console.log("Fetched service types:", data);
        if (Array.isArray(data)) {
          setServiceTypes(data);
        } else {
          setServiceTypes(data.serviceTypes || []);
        }
      })
      .catch((error) => {
        console.error("Error fetching service types:", error);
      });
  }, []);

  // ดึงข้อมูลหมวดหมู่สัตว์เลี้ยงจาก API
  const fetchPetCategories = useCallback(() => {
    fetch("http://192.168.133.111:5000/api/auth/pet-categories")
      .then(async (response) => {
        if (!response.ok) {
          console.error("ไม่สามารถดึงหมวดหมู่สัตว์เลี้ยงได้");
          return;
        }
        return response.json();
      })
      .then((data) => {
        console.log("Fetched pet categories:", data);
        if (Array.isArray(data)) {
          setPetCategories(data);
        } else if (data && data.petCategories && Array.isArray(data.petCategories)) {
          setPetCategories(data.petCategories);
        } else {
          console.error("รูปแบบข้อมูลที่ได้รับไม่ถูกต้อง", data);
          setPetCategories([]);
        }
      })
      .catch((error) => {
        console.error("Error fetching pet categories:", error);
      });
  }, []);

  // ดึงงานของพี่เลี้ยงจาก API
  const fetchSitterServices = useCallback(() => {
    fetch("http://192.168.133.111:5000/api/auth/sitter-services")
      .then(async (response) => {
        if (!response.ok) {
          console.error("ไม่สามารถดึงงานของพี่เลี้ยงได้");
          return;
        }
        return response.json();
      })
      .then((data) => {
        console.log("Fetched sitter services:", data);
        if (Array.isArray(data)) {
          setSitterServices(data);
        } else {
          setSitterServices(data.services || []);
        }
      })
      .catch((error) => {
        console.error("Error fetching sitter services:", error);
      });
  }, []);

  // ดึงข้อมูลทั้งหมด
  const fetchAllData = useCallback(() => {
    if (memberId) {
      fetchUser();
    }
    fetchServiceTypes();
    fetchPetCategories();
    fetchSitterServices();
  }, [memberId, fetchUser, fetchServiceTypes, fetchPetCategories, fetchSitterServices]);

  useEffect(() => {
    if (memberId) {
      fetchAllData();
    }
  }, [memberId, fetchAllData]);

  // ฟังก์ชันรีเฟรชหน้าจอ
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAllData();
    setRefreshing(false);
  }, [fetchAllData]);

  // ฟังก์ชัน Logout
  const handleLogout = async () => {
    await AsyncStorage.removeItem("member_id");
    navigation.replace("Login");
  };

  // ฟังก์ชันเปิด Modal ฟิลเตอร์
  const openFilterModal = () => {
    setFilterModalVisible(true);
  };

  // ฟังก์ชันปิด Modal ฟิลเตอร์
  const closeFilterModal = () => {
    setFilterModalVisible(false);
  };

  // ฟังก์ชันล้างฟิลเตอร์
  const resetFilters = () => {
    setSelectedPetCategory(null);
    setSelectedServiceType(null);
  };

  // เมื่อกด "ตกลง" ใน Modal ให้ปิด Modal
  const handleConfirmFilter = () => {
    closeFilterModal();
  };

  // คำนวณ filteredServices ตามฟิลเตอร์ที่เลือก
  const filteredServices = useMemo(() => {
    let services = sitterServices;
    if (selectedPetCategory) {
      services = services.filter(
        (service) => service.pet_type_id === selectedPetCategory
      );
    }
    if (selectedServiceType) {
      services = services.filter(
        (service) => service.service_type_id === selectedServiceType
      );
    }
    return services;
  }, [selectedPetCategory, selectedServiceType, sitterServices]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <StatusBar style="light" />
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
                <AntDesign name="user" size={24} color="#6A0DAD" />
              </View>
              <View style={styles.greeting}>
                <Text style={styles.greetingText}>
                  {user ? `สวัสดี ${user.member.first_name}` : ""}
                </Text>
                <Text style={styles.subGreeting}>ยินดีต้อนรับ</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <AntDesign name="logout" size={20} color="#FFCCCC" />
            </TouchableOpacity>
          </View>

          {/* ปุ่มเปิด Modal ฟิลเตอร์ */}
          <View style={styles.filterButtonContainer}>
            <TouchableOpacity style={styles.filterButton} onPress={openFilterModal}>
              <Text style={styles.filterButtonText}>
                {selectedPetCategory || selectedServiceType
                  ? `กรอง: ${
                      petCategories.find(
                        (c) => c.pet_type_id === selectedPetCategory
                      )?.type_name ||
                      serviceTypes.find(
                        (s) => s.service_type_id === selectedServiceType
                      )?.short_name
                    }`
                  : "ตัวกรอง"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Services Section (แสดงงานของพี่เลี้ยงเป็น List) */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>บริการสำหรับสัตว์เลี้ยง</Text>
            <TouchableOpacity>
              <AntDesign name="filter" size={20} color="#4A148C" />
            </TouchableOpacity>
          </View>
          {filteredServices.length > 0 ? (
            <View style={styles.listContainer}>
              {filteredServices.map((service) => (
                <View key={service.sitter_service_id} style={styles.listItem}>
                  <View style={styles.listItemInfo}>
                    <Text style={styles.listItemTitle}>{service.short_name}</Text>
                    <Text style={styles.listItemDescription}>
                      {service.description || "ไม่มีรายละเอียด"}
                    </Text>
                  </View>
                  <View style={styles.listItemPrice}>
                    <Text style={styles.priceText}>
                      {formatPrice(service.price)} บาท /{" "}
                      {pricingUnitMapping[service.pricing_unit] || service.pricing_unit}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noServicesText}>ไม่มีงานที่ตรงกับฟิลเตอร์</Text>
          )}

          {/* Modal ฟิลเตอร์ */}
          <Modal
            visible={filterModalVisible}
            transparent
            animationType="slide"
            onRequestClose={closeFilterModal}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>เลือกฟิลเตอร์</Text>
                <Text style={styles.modalSubTitle}>หมวดหมู่สัตว์เลี้ยง</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {petCategories.map((category) => (
                    <TouchableOpacity
                      key={category.pet_type_id}
                      style={[
                        styles.modalOption,
                        selectedPetCategory === category.pet_type_id &&
                          styles.modalOptionSelected,
                      ]}
                      onPress={() => setSelectedPetCategory(category.pet_type_id)}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          selectedPetCategory === category.pet_type_id &&
                            styles.modalOptionTextSelected,
                        ]}
                      >
                        {category.type_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={styles.modalSubTitle}>ประเภทบริการ</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {serviceTypes.map((service) => (
                    <TouchableOpacity
                      key={service.service_type_id}
                      style={[
                        styles.modalOption,
                        selectedServiceType === service.service_type_id &&
                          styles.modalOptionSelected,
                      ]}
                      onPress={() => setSelectedServiceType(service.service_type_id)}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          selectedServiceType === service.service_type_id &&
                            styles.modalOptionTextSelected,
                        ]}
                      >
                        {service.short_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {/* ปุ่มล้างฟิลเตอร์ */}
                <TouchableOpacity style={styles.modalResetButton} onPress={resetFilters}>
                  <Text style={styles.modalResetButtonText}>ล้างฟิลเตอร์</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButton} onPress={handleConfirmFilter}>
                  <Text style={styles.modalButtonText}>ตกลง</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// Helper function: แปลงราคาเป็นจำนวนเต็มถ้าไม่มีเศษ (.00)
const formatPrice = (price) => {
  const num = parseFloat(price);
  return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
};

// Mapping สำหรับหน่วยการคิดราคาเป็นภาษาไทย
const pricingUnitMapping = {
  per_walk: "การเดิน",
  per_night: "คืน",
  per_session: "ครั้ง",
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3E5F5", // สีพื้นหลังอ่อน ๆ โทนม่วง
  },
  container: {
    flex: 1,
    backgroundColor: "#F3E5F5",
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
    backgroundColor: "#FFFFFF", // avatar สีขาว
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  greeting: {},
  greetingText: {
    fontSize: 18,
    fontFamily: "Prompt-Bold",
    color: "#4A148C", // สีม่วงเข้ม
  },
  subGreeting: {
    fontSize: 14,
    fontFamily: "Prompt-Regular",
    color: "#7B1FA2", // สีม่วงอ่อน
  },
  logoutButton: {
    padding: 4,
  },
  filterButtonContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  filterButton: {
    backgroundColor: "#4A148C",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  filterButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Prompt-Bold",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Prompt-Bold",
    color: "#4A148C", // สีม่วงเข้ม
  },
  seeAll: {
    fontSize: 14,
    fontFamily: "Prompt-Medium",
    color: "#4A148C",
    opacity: 0.8,
  },
  listContainer: {
    marginBottom: 25,
  },
  listItem: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontFamily: "Prompt-Bold",
    color: "#4A148C",
    marginBottom: 5,
  },
  listItemDescription: {
    fontSize: 14,
    fontFamily: "Prompt-Regular",
    color: "#7B1FA2",
  },
  listItemPrice: {
    justifyContent: "center",
    alignItems: "flex-end",
  },
  priceText: {
    fontSize: 14,
    fontFamily: "Prompt-Bold",
    color: "#4A148C",
  },
  serviceCapsuleContainer: {
    marginBottom: 25,
  },
  filterContainer: {
    marginBottom: 25,
  },
  filterTitle: {
    fontSize: 16,
    fontFamily: "Prompt-Bold",
    color: "#4A148C",
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#4A148C",
    marginRight: 10,
    backgroundColor: "#F3E5F5",
  },
  filterChipSelected: {
    backgroundColor: "#4A148C",
  },
  filterChipText: {
    fontSize: 14,
    fontFamily: "Prompt-Regular",
    color: "#4A148C",
  },
  filterChipTextSelected: {
    fontFamily: "Prompt-Bold",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Prompt-Bold",
    marginBottom: 15,
    color: "#4A148C",
    textAlign: "center",
  },
  modalSubTitle: {
    fontSize: 16,
    fontFamily: "Prompt-Medium",
    color: "#4A148C",
    marginBottom: 10,
  },
  modalOption: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  modalOptionSelected: {
    backgroundColor: "#F3E5F5",
  },
  modalOptionText: {
    fontSize: 16,
    fontFamily: "Prompt-Regular",
    color: "#4A148C",
  },
  modalOptionTextSelected: {
    fontFamily: "Prompt-Bold",
    color: "#4A148C",
  },
  modalResetButton: {
    marginTop: 10,
    backgroundColor: "#FFCDD2",
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: "center",
  },
  modalResetButtonText: {
    color: "#C62828",
    fontSize: 16,
    fontFamily: "Prompt-Bold",
  },
  modalButton: {
    marginTop: 20,
    backgroundColor: "#4A148C",
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Prompt-Bold",
  },
});
