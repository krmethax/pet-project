import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
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
      fetch(`http://192.168.1.12:5000/api/auth/member/${memberId}`)
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
          if (data.member) {
            setUser(data.member);
          } else {
            setUser(data);
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
      <StatusBar style="dark" />
      <View style={styles.container}>
        {/* ส่วนแสดงรายการเมนูและข้อมูลผู้ใช้ */}
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.headerTitle}>ตั้งค่า</Text>
          
          {/* ส่วนแสดงข้อมูลผู้ใช้ */}
          {user ? (
            <View style={styles.userInfoContainer}>
              <Image
                source={
                  user.profile_image
                    ? { uri: user.profile_image }
                    : require('../../../assets/images/avatar.png')
                }
                style={styles.avatar}
              />
              <View style={styles.userTextContainer}>
                <Text style={styles.userName}>
                  {user.first_name?.trim()} {user.last_name?.trim()}
                </Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.loadingText}>กำลังโหลดข้อมูลผู้ใช้...</Text>
          )}

          {/* รายการเมนู (ไม่มี >) */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              console.log('ไปยังหน้าบัญชี');
              // navigation.navigate('Account');
            }}
          >
            <Text style={styles.menuText}>บัญชี</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              console.log('ไปยังหน้าการแจ้งเตือน');
              // navigation.navigate('NotificationSetting');
            }}
          >
            <Text style={styles.menuText}>การแจ้งเตือน</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ปุ่ม Logout อยู่ด้านล่าง */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity style={styles.menuItemLogout} onPress={handleLogout}>
            <Text style={styles.menuTextLogout}>ออกจากระบบ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Prompt-Bold',
    color: '#000',
    marginBottom: 20,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    resizeMode: 'cover',
  },
  userTextContainer: {
    justifyContent: 'center',
  },
  userName: {
    fontSize: 20,
    fontFamily: 'Prompt-Bold',
    color: '#000',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 16,
    fontFamily: 'Prompt-Regular',
    color: '#000',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Prompt-Regular',
    color: '#333',
    marginBottom: 30,
  },
  menuItem: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
    marginBottom: 15,
  },
  menuText: {
    fontSize: 16,
    fontFamily: 'Prompt-Medium',
    color: '#000',
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  menuItemLogout: {
    backgroundColor: '#FF0000',
    borderRadius: 5,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextLogout: {
    fontSize: 16,
    fontFamily: 'Prompt-Bold',
    color: '#FFF',
  },
});
