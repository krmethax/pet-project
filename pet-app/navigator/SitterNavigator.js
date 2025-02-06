import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AntDesign, Ionicons } from '@expo/vector-icons';

// Import components สำหรับแต่ละหน้าที่คุณต้องการให้แสดง
import Home from '../screens/Sitter/Home';
import AddService from '../screens/Sitter/AddService';
import Setting from '../screens/Sitter/Setting';
import Jobs from '../screens/Sitter/Jobs';

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          height: 75, // ปรับความสูงของ Bottom Tab
          backgroundColor: '#000', // สีพื้นหลัง Bottom Tab
          borderTopColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10, // ขนาดตัวอักษรของ Label
          fontFamily: 'Prompt-Medium', // ใช้ฟอนต์ Prompt
          paddingBottom: 5, // ขยับตัวหนังสือให้อยู่ตรงกลางมากขึ้น
        },
        tabBarIconStyle: {
          marginTop: 10, // ทำให้ไอคอนอยู่ตรงกลางของ Bottom Tab
        },
        tabBarActiveTintColor: '#1E1', // สีไอคอนที่ถูกเลือก
        tabBarInactiveTintColor: '#fff', // สีไอคอนที่ไม่ได้เลือก
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'หน้าแรก') {
            iconName = 'home';
          } else if (route.name === 'คำขอ') {
            iconName = 'profile';
          } else if (route.name === 'เพิ่มงาน') {
            iconName = 'pluscircleo';
          } else if (route.name === 'การตั้งค่า') {
            iconName = 'setting';
          }

          return (
            <AntDesign
              name={iconName}
              size={size}
              color={color}
              style={{ alignSelf: 'center' }} // ทำให้ไอคอนอยู่ตรงกลาง
            />
          );
        },
      })}
    >
      <Tab.Screen name="หน้าแรก" component={Home} options={{ headerShown: false }}/>
      <Tab.Screen name="คำขอ" component={Jobs} options={{ headerShown: false }}/>
      <Tab.Screen name="เพิ่มงาน" component={AddService} options={{ headerShown: false }}/>
      <Tab.Screen name="การตั้งค่า" component={Setting} options={{ headerShown: false }}/>
     
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
