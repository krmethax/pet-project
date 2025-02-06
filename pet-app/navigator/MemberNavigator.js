import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AntDesign } from '@expo/vector-icons';
import Home from '../screens/Member/Home';
import Favorite from '../screens/Member/Favorite';
import Booking from '../screens/Member/Booking';
import Setting from '../screens/Member/Setting';

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          height: 75, // ปรับความสูงของ Bottom Tab
          backgroundColor: '#1C1C1C', // สีพื้นหลัง Bottom Tab
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
        tabBarActiveTintColor: '#fff', // สีไอคอนที่ถูกเลือก
        tabBarInactiveTintColor: '#fff', // สีไอคอนที่ไม่ได้เลือก
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'หน้าแรก') {
            iconName = 'home';
          } else if (route.name === 'รายการโปรด') {
            iconName = 'hearto';
          } else if (route.name === 'การจองของฉัน') {
            iconName = 'calendar';
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
      <Tab.Screen name="หน้าแรก" component={Home} />
      <Tab.Screen name="รายการโปรด" component={Favorite} />
      <Tab.Screen name="การจองของฉัน" component={Booking} />
      <Tab.Screen name="การตั้งค่า" component={Setting} />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
