// navigator/MemberStack.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// import จอ Login, Signup
import Login from '../screens/Member/Login';
import Signup from '../screens/Member/Signup';

// import MemberNavigator เข้ามาด้วย
import MemberNavigator from './MemberNavigator';

const Stack = createNativeStackNavigator();

export default function MemberStack() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Signup" component={Signup} />
      {/* เพิ่ม MemberNavigator เป็น Screen ใน Stack */}
      <Stack.Screen name="MemberNavigator" component={MemberNavigator} />
    </Stack.Navigator>
  );
}
