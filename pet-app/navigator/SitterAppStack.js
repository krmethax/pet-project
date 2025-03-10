// navigator/SitterStack.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Login from '../screens/Sitter/Login';
import Signup from '../screens/Sitter/SignupSitter';
import Home from '../screens/Sitter/Home';
import Jobs from '../screens/Sitter/Jobs';
import AddJob from '../screens/Sitter/AddJob/index.js';
import PaymentMethod from '../screens/Sitter/PaymentMethod';
import Graph from '../screens/Sitter/Graph';

import SitterNavigator from './SitterNavigator';

const Stack = createNativeStackNavigator();

export default function SitterStack() {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
      <Stack.Screen name="Signup" component={Signup} options={{ headerShown: false }} />
      <Stack.Screen name="Home" component={Home}  options={{ headerShown: false }} />
      <Stack.Screen name="Jobs" component={Jobs} options={{ headerShown: false }} />
      <Stack.Screen name="AddJob" component={AddJob} options={{ headerShown: false }} />
      <Stack.Screen name="PaymentMethod" component={PaymentMethod} options={{ headerShown: false }} />
      <Stack.Screen name="Graph" component={Graph} options={{ headerShown: false }} />
      <Stack.Screen name="SitterNavigator" component={SitterNavigator} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
