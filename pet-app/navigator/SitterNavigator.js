// navigator/SitterNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AntDesign } from '@expo/vector-icons';
import Home from '../screens/Sitter/Home';
import Jobs from '../screens/Sitter/Jobs';
import AddJob from '../screens/Sitter/AddService';
import Setting from '../screens/Sitter/Setting';
import { View, StyleSheet } from 'react-native';

const Tab = createBottomTabNavigator();

export default function SitterNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false, // ไม่แสดงชื่อเมนู
        tabBarStyle: {
          height: 50,            // ความสูงของ Tab Bar
          backgroundColor: '#fff',
          borderTopColor: 'transparent',
          borderTopWidth: 0,
          // shadow
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 5,
        },
        // กำหนดให้แต่ละ Item ใน Tab Bar จัดกึ่งกลาง
        tabBarItemStyle: {
          alignItems: 'center',
          justifyContent: 'center',
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName = '';
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
            <View
              style={{
                backgroundColor: focused ? '#E52020' : 'transparent',
                width: 80,
                height: 40,
                borderRadius: 30,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AntDesign
                name={iconName}
                size={size}
                color={focused ? '#fff' : color}
              />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="หน้าแรก" component={Home} />
      <Tab.Screen name="คำขอ" component={Jobs} />
      <Tab.Screen name="เพิ่มงาน" component={AddJob} />
      <Tab.Screen name="การตั้งค่า" component={Setting} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {
    backgroundColor: '#E52020',
  },
});
