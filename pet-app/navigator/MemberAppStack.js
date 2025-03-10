// navigator/MemberStack.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// import จอ Login, Signup
import Login from '../screens/Member/Login';
import Signup from '../screens/Member/Signup';
import ProfileSitter from '../screens/Member/ProfileSitter';
import BookingDetail from '../screens/Member/BookingDetail';
import Booking from '../screens/Member/Booking';
import Review from '../screens/Member/Review';

// import MemberNavigator เข้ามาด้วย
import MemberNavigator from './MemberNavigator';

const Stack = createNativeStackNavigator();

export default function MemberStack() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Signup" component={Signup} />
      <Stack.Screen name="ProfileSitter" component={ProfileSitter} />
      <Stack.Screen name="BookingDetail" component={BookingDetail} />
      <Stack.Screen name="Booking" component={Booking} />
      <Stack.Screen name="Review" component={Review} />
      {/* เพิ่ม MemberNavigator เป็น Screen ใน Stack */}
      <Stack.Screen name="MemberNavigator" component={MemberNavigator} />
    </Stack.Navigator>
  );
}
