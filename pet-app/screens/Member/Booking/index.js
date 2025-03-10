import React, { useState, useEffect, useCallback } from 'react';
import {
  Text,
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { AntDesign, FontAwesome } from '@expo/vector-icons';

export default function Booking() {
  const navigation = useNavigation();
  const [memberId, setMemberId] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  // States สำหรับข้อมูลประเภทงาน, ประเภทสัตว์เลี้ยง และบริการของพี่เลี้ยง
  const [serviceTypes, setServiceTypes] = useState([]);
  const [petCategories, setPetCategories] = useState([]);
  const [sitterServices, setSitterServices] = useState([]);

  // State สำหรับ Tab View: "pending", "review", "paid"
  const [selectedTab, setSelectedTab] = useState("pending");

  // ดึง member_id จาก AsyncStorage เมื่อ component mount
  useEffect(() => {
    const getMemberId = async () => {
      try {
        const storedMemberId = await AsyncStorage.getItem('member_id');
        if (storedMemberId) {
          setMemberId(storedMemberId);
        } else {
          navigation.replace('Login');
        }
      } catch (error) {
        console.error('Failed to fetch member_id:', error);
      }
    };
    getMemberId();
  }, [navigation]);

  // ดึงข้อมูลการจองของสมาชิก
  const fetchBookings = useCallback(() => {
    if (memberId) {
      setLoadingBookings(true);
      fetch(`http://192.168.1.10:5000/api/auth/member/${memberId}/bookings`)
        .then(async (response) => {
          if (!response.ok) {
            const text = await response.text();
            console.error('Error fetching bookings. Status:', response.status, 'Text:', text);
            throw new Error('ไม่สามารถดึงข้อมูลการจองได้');
          }
          return response.json();
        })
        .then((data) => {
          console.log('Bookings from server:', data);
          setBookings(data.bookings || []);
          setLoadingBookings(false);
        })
        .catch((error) => {
          console.error('Error fetching bookings:', error);
          setLoadingBookings(false);
        });
    }
  }, [memberId]);

  useEffect(() => {
    fetchBookings();
  }, [memberId, fetchBookings]);

  const onRefresh = useCallback(() => {
    fetchBookings();
  }, [fetchBookings]);

  // ดึงข้อมูลประเภทงานจาก API
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

  // ดึงข้อมูลประเภทสัตว์เลี้ยงจาก API
  useEffect(() => {
    fetch("http://192.168.1.10:5000/api/auth/pet-categories")
      .then((response) => response.json())
      .then((data) => {
        if (data.petCategories) {
          setPetCategories(data.petCategories);
        } else {
          setPetCategories(data);
        }
      })
      .catch((error) => console.error("Error fetching pet categories:", error));
  }, []);

  // ดึงข้อมูลบริการของพี่เลี้ยงจาก API
  useEffect(() => {
    fetch("http://192.168.1.10:5000/api/auth/sitter-services")
      .then((response) => response.json())
      .then((data) => {
        if (data.services) {
          setSitterServices(data.services);
        } else {
          setSitterServices(data);
        }
      })
      .catch((error) => console.error("Error fetching sitter services:", error));
  }, []);

  // กรองการจองตามแท็บที่เลือก
  const filteredBookings = bookings.filter((booking) => {
    const timeDiff = new Date() - new Date(booking.created_at);
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    if (selectedTab === "pending") {
      return booking.payment_status !== "paid";
    } else if (selectedTab === "review") {
      // งานที่ชำระแล้วแต่ยังไม่ครบ 3 วัน
      return booking.payment_status === "paid" && timeDiff < threeDays;
    } else if (selectedTab === "paid") {
      // งานที่ชำระแล้ว (ไม่เกี่ยวกับเวลา)
      return booking.payment_status === "paid";
    }
    return false;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={loadingBookings} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>การจอง</Text>

        {/* Tab View */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, selectedTab === "pending" && styles.tabButtonActive]}
            onPress={() => setSelectedTab("pending")}
          >
            <Text style={[styles.tabButtonText, selectedTab === "pending" && styles.tabButtonTextActive]}>
              รอชำระเงิน
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, selectedTab === "paid" && styles.tabButtonActive]}
            onPress={() => setSelectedTab("paid")}
          >
            <Text style={[styles.tabButtonText, selectedTab === "paid" && styles.tabButtonTextActive]}>
              ชำระเงินแล้ว
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, selectedTab === "review" && styles.tabButtonActive]}
            onPress={() => setSelectedTab("review")}
          >
            <Text style={[styles.tabButtonText, selectedTab === "review" && styles.tabButtonTextActive]}>
              รอรีวิว
            </Text>
          </TouchableOpacity>
        </View>

        {loadingBookings ? (
          <ActivityIndicator size="large" color="#000" />
        ) : filteredBookings.length > 0 ? (
          filteredBookings.map((booking) => {
            // ค้นหาข้อมูลบริการของพี่เลี้ยงจาก sitterServices
            const jobRecord = sitterServices.find(
              (s) => s.sitter_service_id === booking.sitter_service_id
            );
            const jobName = jobRecord && jobRecord.description ? jobRecord.description : "ไม่ระบุ";
            const jobType =
              jobRecord && jobRecord.service_type_id
                ? (serviceTypes.find((st) => st.service_type_id === jobRecord.service_type_id)?.short_name || "ไม่ระบุ")
                : "ไม่ระบุ";
            const petTypeName =
              petCategories.find((p) => p.pet_type_id === booking.pet_type_id)?.type_name || "ไม่ระบุ";
            const sitterName = booking.sitter_name || `พี่เลี้ยง ${booking.sitter_id}`;

            return (
              <View key={booking.booking_id} style={styles.bookingCard}>
                {/* Card Header: ข้อมูลสรุป */}
                <View style={styles.cardHeader}>
                  <View style={styles.leftColumn}>
                    <Text style={styles.infoText}>งาน: {jobName}</Text>
                    <Text style={styles.infoText}>ประเภทงาน: {jobType}</Text>
                    <Text style={styles.infoText}>ประเภทสัตว์เลี้ยง: {petTypeName}</Text>
                    <Text style={styles.infoText}>พี่เลี้ยง: {sitterName}</Text>
                  </View>
                  <View style={styles.rightColumn}>
                    <Text style={styles.priceText}>ราคา: {booking.total_price} บาท</Text>
                    {selectedTab === "pending" && (
                      <View style={styles.statusButtonPending}>
                        <Text style={styles.statusButtonText}>รอชำระเงิน</Text>
                      </View>
                    )}
                    {selectedTab === "paid" && (
                      <View style={styles.statusButtonPaid}>
                        <Text style={styles.statusButtonText}>ชำระเงินแล้ว</Text>
                      </View>
                    )}
                    {selectedTab === "review" && (
                      <TouchableOpacity
                        style={styles.reviewButton}
                        onPress={() => navigation.navigate("Review", {
                          bookingId: booking.booking_id,
                          memberId: memberId,      // memberId ควรถูกส่งมาด้วย
                          sitterId: booking.sitter_id, // หรือ sitterId ที่ถูกต้อง
                        })}
                      >
                        <Text style={styles.reviewButtonText}>รีวิว</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.noBookingContainer}>
            <Text style={styles.bookingText}>ยังไม่มีการจอง</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  scrollContainer: { padding: 20, paddingBottom: 40 },
  title: {
    fontSize: 18,
    fontFamily: "Prompt-Bold",
    color: "#000",
    marginBottom: 10,
  },
  // bookingText สำหรับข้อความในกรณีไม่มีการจอง
  bookingText: {
    fontSize: 18,
    fontFamily: "Prompt-Bold",
    color: "#000",
    textAlign: "center",
  },
  infoText: {
    fontSize: 16,
    fontFamily: "Prompt-Medium",
    color: "#000",
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  profileSection: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#FF0000",
  },
  avatarImage: { width: 40, height: 40, borderRadius: 20 },
  greeting: {},
  greetingText: { fontSize: 18, fontFamily: "Prompt-Bold", color: "#000" },
  subGreeting: { fontSize: 14, fontFamily: "Prompt-Regular", color: "#555" },
  // Tab View
  tabContainer: {
    flexDirection: "row",
    marginBottom: 15,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: "#ccc",
    alignItems: "center",
  },
  tabButtonActive: {
    borderBottomColor: "#FF0000",
  },
  tabButtonText: {
    fontSize: 16,
    fontFamily: "Prompt-Bold",
    color: "#000",
  },
  tabButtonTextActive: {
    color: "#FF0000",
  },
  // Section Header for Pet Categories
  capsuleScrollView: { marginBottom: 20 },
  categoryCapsule: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FF0000",
    backgroundColor: "#fff",
    marginRight: 10,
  },
  categoryCapsuleSelected: { backgroundColor: "#FF0000" },
  categoryCapsuleText: {
    fontSize: 14,
    fontFamily: "Prompt-Regular",
    color: "#FF0000",
  },
  categoryCapsuleTextSelected: { color: "#fff" },
  // Selected Filters
  selectedFiltersContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  selectedFilterCapsule: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    backgroundColor: "#FF0000",
    marginRight: 5,
    marginBottom: 5,
  },
  selectedFilterText: {
    fontSize: 12,
    fontFamily: "Prompt-Regular",
    color: "#fff",
  },
  // Sitters (Horizontal Avatar List)
  sitterAvatarRow: { marginBottom: 20 },
  sitterAvatarContainer: { width: 70, alignItems: "center", marginRight: 20 },
  sitterAvatarWrapper: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: "#ccc",
    overflow: "hidden",
    marginBottom: 8,
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
  sitterAvatarName: { fontSize: 14, fontFamily: "Prompt-Regular", color: "#000" },
  ratingContainer: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  starIcon: { marginRight: 3 },
  ratingText: { fontSize: 12, fontFamily: "Prompt-Regular", color: "#000" },
  // Booking Card Styles
  bookingCard: {
    backgroundColor: "#f2f2f2",
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between" },
  leftColumn: { flex: 1 },
  rightColumn: { flex: 1, alignItems: "flex-end" },
  priceText: {
    fontSize: 16,
    fontFamily: "Prompt-Bold",
    color: "#000",
    marginBottom: 5,
  },
  statusButtonPaid: {
    backgroundColor: "#28a745", // สีเขียว
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 5,
    width: 100,
  },
  statusButtonPending: {
    backgroundColor: "#ffc107", // สีเหลือง/ส้ม
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 5,
  },
  statusButtonText: {
    color: "#fff",
    fontFamily: "Prompt-Bold",
    fontSize: 14,
  },
  reviewButton: {
    backgroundColor: "#FFCC00", // สีเหลืองสำหรับรีวิว
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 5,
    width: 100,
  },
  reviewButtonText: {
    color: "#fff",
    fontFamily: "Prompt-Bold",
    fontSize: 14,
    textAlign: "center",
  },
  // Expanded content removed; card displays only summary.
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Prompt-Bold",
    color: "#000",
    marginBottom: 15,
    textAlign: "center",
  },
  modalSectionTitle: {
    fontSize: 16,
    fontFamily: "Prompt-Bold",
    color: "#000",
    marginBottom: 10,
  },
  modalCapsuleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 15,
  },
  modalCloseButton: {
    backgroundColor: "#FF0000",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontFamily: "Prompt-Bold",
    color: "#fff",
  },
  // Centering text when no booking
  noBookingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
});
