import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SelectLoginScreen({ navigation }) {
  // Animated Values สำหรับปุ่มแต่ละปุ่ม
  const animatedScaleMember = useRef(new Animated.Value(1)).current;
  const animatedScaleSitter = useRef(new Animated.Value(1)).current;

  // ฟังก์ชันสำหรับปุ่ม "สมาชิก"
  const onPressInMember = () => {
    Animated.spring(animatedScaleMember, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };
  const onPressOutMember = () => {
    Animated.spring(animatedScaleMember, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  // ฟังก์ชันสำหรับปุ่ม "พี่เลี้ยง"
  const onPressInSitter = () => {
    Animated.spring(animatedScaleSitter, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };
  const onPressOutSitter = () => {
    Animated.spring(animatedScaleSitter, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* ส่วนบน: รูป + ข้อความ */}
      <View style={styles.topSection}>
        <Image
          source={require('../../assets/images/logo-x.png')}
          style={styles.illustration}
          resizeMode="contain"
        />
        <Text style={styles.mainTitle}>สวัสดี</Text>
        <Text style={styles.subTitle}>คุณคือใคร</Text>
      </View>

      {/* ส่วนล่าง: ปุ่ม */}
      <View style={styles.bottomSection}>
        {/* ปุ่มสมาชิก (สีแดง) */}
        <AnimatedTouchable
          activeOpacity={0.8}
          style={[
            styles.actionButtonRed,
            { transform: [{ scale: animatedScaleMember }] },
          ]}
          onPressIn={onPressInMember}
          onPressOut={onPressOutMember}
          onPress={() => navigation.navigate('Member')}
        >
          <Text style={styles.actionButtonTextWhite}>สมาชิก</Text>
        </AnimatedTouchable>

        {/* ปุ่มพี่เลี้ยง (สีเทา) */}
        <AnimatedTouchable
          activeOpacity={0.8}
          style={[
            styles.actionButtonGray,
            { transform: [{ scale: animatedScaleSitter }] },
          ]}
          onPressIn={onPressInSitter}
          onPressOut={onPressOutSitter}
          onPress={() => navigation.navigate('Sitter')}
        >
          <Text style={styles.actionButtonTextBlack}>พี่เลี้ยง</Text>
        </AnimatedTouchable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ครอบหน้าทั้งหมด
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    justifyContent: 'space-between',
  },

  // ส่วนบน (รูป + ข้อความ)
  topSection: {
    alignItems: 'center',
    marginTop: 100,
  },
  illustration: {
    width: 250,
    height: 250,
    marginBottom: 10,
  },
  mainTitle: {
    fontSize: 28,
    fontFamily: 'Prompt-Bold',
    color: '#333',
    marginBottom: 6,
  },
  subTitle: {
    fontSize: 14,
    fontFamily: 'Prompt-Regular',
    color: '#000',
    textAlign: 'center',
    marginHorizontal: 20,
  },

  // ส่วนล่าง (ปุ่ม)
  bottomSection: {
    alignItems: 'center',
    marginBottom: 150,
  },
  // สไตล์ปุ่มสมาชิก (สีแดง)
  actionButtonRed: {
    width: '80%',
    backgroundColor: '#FF0000',
    borderColor: '#FF0000',
    borderWidth: 2,
    borderRadius: 5,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginVertical: 5,
    alignItems: 'center',
  },
  // สไตล์ปุ่มพี่เลี้ยง (สีเทา)
  actionButtonGray: {
    width: '80%',
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderWidth: 2,
    borderRadius: 5,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginVertical: 5,
    alignItems: 'center',
  },
  // ตัวหนังสือในปุ่มสีแดง (สีขาว)
  actionButtonTextWhite: {
    fontFamily: 'Prompt-Bold',
    fontSize: 16,
    color: '#fff',
  },
  // ตัวหนังสือในปุ่มสีเทา (สีดำ)
  actionButtonTextBlack: {
    fontFamily: 'Prompt-Bold',
    fontSize: 16,
    color: '#000',
  },
});
