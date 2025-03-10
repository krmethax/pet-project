import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
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
        tabBarShowLabel: false, // ไม่แสดงชื่อเมนู
        tabBarStyle: {
          height: 60,            // ความสูงของ Tab Bar
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
      <Tab.Screen name="รายการโปรด" component={Favorite} />
      <Tab.Screen name="การจองของฉัน" component={Booking} />
      <Tab.Screen name="การตั้งค่า" component={Setting} />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
