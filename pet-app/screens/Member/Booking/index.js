import React, { useState, useEffect, useCallback } from 'react';
import {
  Text,
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AntDesign, FontAwesome } from '@expo/vector-icons';
import moment from 'moment';

export default function Booking() {
  const navigation = useNavigation();
  const route = useRoute();
  const [memberId, setMemberId] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('payment');

  // ถ้ามาจาก Review ก็สลับไปแท็บรีวิว
  useEffect(() => {
    const { reviewedBookingId } = route.params || {};
    if (reviewedBookingId) {
      setSelectedTab('review');
      navigation.setParams({ reviewedBookingId: undefined });
    }
  }, [route.params]);

  // โหลด memberId หรือเด้งไปหน้า Login
  useEffect(() => {
    AsyncStorage.getItem('member_id').then((id) => {
      if (id) setMemberId(id);
      else navigation.replace('Login');
    });
  }, []);

  // Fetch bookings ของ member
  const fetchBookings = useCallback(() => {
    if (!memberId) return;
    setLoading(true);
    fetch(`http://192.168.1.12:5000/api/auth/member/${memberId}/bookings`)
      .then((res) => res.json())
      .then((data) => setBookings(data.bookings || []))
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [memberId]);

  // รีเฟรชเวลากลับมาก่อนหน้า
  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchBookings);
    return unsub;
  }, [navigation, fetchBookings]);

  useEffect(() => { fetchBookings(); }, [memberId]);
  const onRefresh = () => { setRefreshing(true); fetchBookings(); };

  // กรองรายการตามแท็บ
  const filtered = bookings.filter((b) => {
    if (selectedTab === 'payment') return b.payment_status !== 'paid';
    if (selectedTab === 'review')  return b.payment_status === 'paid';
    return true;
  });

  // กำหนดข้อความป้ายสถานะ
  const statusLabel = (b) => {
    if (b.payment_status !== 'paid')             return 'รอชำระเงิน';
    if (b.payment_status === 'paid' && !b.has_review) return 'ชำระเงินแล้ว';
    return 'รีวิวแล้ว'; // paid && has_review
  };

  // กดป้ายสถานะเพื่อไปหน้า Review (เฉพาะ paid & not reviewed)
  const onStatusPress = (b) => {
    if (b.payment_status === 'paid' && !b.has_review) {
      navigation.navigate('Review', {
        bookingId:   b.booking_id,
        memberId:    memberId,
        sitterId:    b.sitter_id,
        jobDetails: {
          description: b.service_job_name,
          price:       b.service_price,
          short_name:  b.service_type_short_name,
        },
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>การจอง</Text>
        <View style={styles.tabs}>
          {[
            { key: 'payment', label: 'การชำระเงิน' },
            { key: 'review',  label: 'รีวิว'       },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, selectedTab === tab.key && styles.tabActive]}
              onPress={() => setSelectedTab(tab.key)}
            >
              <Text style={[styles.tabText, selectedTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="large" />
        ) : filtered.length > 0 ? (
          filtered.map((b) => (
            <View key={b.booking_id} style={styles.card}>
              {/* รายละเอียดงาน */}
              <View style={styles.row}>
                <FontAwesome name="file-text-o" size={16} style={styles.icon} />
                <Text style={styles.text}>ชื่องาน: {b.service_job_name}</Text>
              </View>
              <View style={styles.row}>
                <AntDesign name="tags" size={16} style={styles.icon} />
                <Text style={styles.text}>ประเภทงาน: {b.service_type_short_name}</Text>
              </View>
              <View style={styles.row}>
                <FontAwesome name="paw" size={16} style={styles.icon} />
                <Text style={styles.text}>ประเภทสัตว์เลี้ยง: {b.pet_type}</Text>
              </View>
              <View style={styles.row}>
                <AntDesign name="tagso" size={16} style={styles.icon} />
                <Text style={styles.text}>จำนวนสัตว์: {b.pet_quantity}</Text>
              </View>
              <View style={styles.row}>
                <AntDesign name="creditcard" size={16} style={styles.icon} />
                <Text style={styles.text}>ราคา: {b.service_price} บาท</Text>
              </View>
              <View style={styles.row}>
                <FontAwesome name="calendar" size={16} style={styles.icon} />
                <Text style={styles.text}>
                  วันที่จอง: {moment(b.booking_date).format('DD/MM/YYYY')}
                </Text>
              </View>

              {/* ป้ายสถานะ */}
              <TouchableOpacity
                onPress={() => onStatusPress(b)}
                disabled={!(b.payment_status === 'paid' && !b.has_review)}
              >
                <View style={[
                  styles.statusBadge,
                  b.payment_status !== 'paid'                     && styles.statusBadgeUnpaid,
                  b.payment_status === 'paid' && !b.has_review   && styles.statusBadgePaid,
                  b.payment_status === 'paid' && b.has_review    && styles.statusBadgeReviewed,
                ]}>
                  <Text style={styles.statusText}>{statusLabel(b)}</Text>
                </View>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={styles.noData}>ไม่พบรายการ</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontFamily: 'Prompt-Bold', marginBottom: 12 },
  tabs: { flexDirection: 'row', marginBottom: 16 },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#ccc',
    alignItems: 'center',
  },
  tabActive: { borderBottomColor: '#E52020' },
  tabText: { fontFamily: 'Prompt-Medium', color: '#333' },
  tabTextActive: { color: '#E52020' },
  card: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  icon: { marginRight: 6, color: '#555' },
  text: { fontSize: 14, fontFamily: 'Prompt-Regular', color: '#333' },
  statusBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeUnpaid:  { backgroundColor: '#E52020' }, // รอชำระเงิน (แดง)
  statusBadgePaid:    { backgroundColor: '#4CAF50' }, // ชำระเงินแล้ว (เขียว)
  statusBadgeReviewed:{ backgroundColor: '#999'   }, // รีวิวแล้ว (เทา)
  statusText: { fontFamily: 'Prompt-Bold', color: '#fff', fontSize: 14 },
  noData: { textAlign: 'center', fontFamily: 'Prompt-Regular', fontSize: 16, color: '#666' },
});
