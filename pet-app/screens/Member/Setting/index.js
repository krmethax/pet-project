import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

export default function Setting() {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [memberId, setMemberId] = useState(null);

  // ดึง member_id จาก AsyncStorage เมื่อ component mount
  useEffect(() => {
    const getMemberId = async () => {
      try {
        const storedMemberId = await AsyncStorage.getItem('member_id');
        if (storedMemberId) {
          setMemberId(storedMemberId);
        } else {
          // ถ้าไม่มี member_id ให้กลับไปหน้า Login
          navigation.replace('Login');
        }
      } catch (error) {
        console.error('Failed to fetch member_id:', error);
      }
    };
    getMemberId();
  }, []);

  // ดึงข้อมูลผู้ใช้งานเมื่อได้ memberId
  useEffect(() => {
    if (memberId) {
      fetch(`http://192.168.133.111:5000/api/auth/member/${memberId}`)
        .then(async (response) => {
          if (!response.ok) {
            const text = await response.text();
            console.log('Response status:', response.status);
            console.log('Response text:', text);
            throw new Error('ไม่สามารถดึงข้อมูลผู้ใช้งานได้');
          }
          return response.json();
        })
        .then((data) => {
          console.log('data from server:', data);
          // สมมติ data.member คือโครงสร้างสำหรับ user
          if (data.member) {
            setUser(data.member);
          } else {
            setUser(data); // ปรับตามโครงสร้างจริง
          }
        })
        .catch((error) => {
          console.error('Error fetching user:', error);
        });
    }
  }, [memberId]);

  // ฟังก์ชัน Logout
  const handleLogout = async () => {
    await AsyncStorage.removeItem('member_id');
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <StatusBar style="dark" />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
        >
          <View style={styles.mainContent}>
            <Text style={styles.title}>การตั้งค่า</Text>

            {/* Card แสดงข้อมูลผู้ใช้ */}
            {user ? (
              <View style={styles.userCard}>
                <Text style={styles.userCardName}>
                  {user.first_name?.trim()} {user.last_name?.trim()}
                </Text>
                <Text style={styles.userCardEmail}>
                  {user.email}
                </Text>
              </View>
            ) : (
              <Text style={styles.infoText}>กำลังโหลดข้อมูลผู้ใช้...</Text>
            )}

            {/* ปุ่ม Logout */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>ออกจากระบบ</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF', // พื้นหลังขาว
  },
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  mainContent: {
    marginTop: 10,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Prompt-Bold',
    color: '#000',
    marginBottom: 20,
  },
  // Card แสดงข้อมูลผู้ใช้
  userCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  userCardName: {
    fontSize: 16,
    fontFamily: 'Prompt-Bold',
    color: '#000',
    marginBottom: 5,
  },
  userCardEmail: {
    fontSize: 14,
    fontFamily: 'Prompt-Regular',
    color: '#333',
  },
  infoText: {
    fontSize: 16,
    fontFamily: 'Prompt-Regular',
    color: '#333',
    marginBottom: 20,
  },
  // ปุ่ม Logout
  logoutButton: {
    backgroundColor: '#000',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FFF',
    fontFamily: 'Prompt-Bold',
    fontSize: 14,
  },
});
