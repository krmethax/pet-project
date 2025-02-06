import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

export default function Booking() {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <StatusBar style="dark" />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
        >
          {/* ไม่มี Header: ไม่แสดง Avatar, ชื่อ, Logout */}
          
          {/* ส่วน Content หลัก */}
          <View style={styles.mainContent}>
            <Text style={styles.title}>การจอง</Text>
            {/* ส่วนนี้จะใส่ลิสต์รายการโปรด หรือฟีเจอร์อื่น ๆ ได้ตามต้องการ */}
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
    marginBottom: 10,
  },
  infoText: {
    fontSize: 16,
    fontFamily: 'Prompt-Regular',
    color: '#333',
  },
});
