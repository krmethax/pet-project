// App.js
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import หน้าจอที่เกี่ยวข้อง
import SelectLoginScreen from './screens/SelectLogin';
import MemberStack from './navigator/MemberAppStack';
import SitterStack from './navigator/SitterAppStack';

SplashScreen.preventAutoHideAsync(); // ป้องกัน Splash Screen ซ่อนก่อนโหลดฟอนต์เสร็จ

const RootStack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded] = useFonts({
    'Prompt-Medium': require('./assets/fonts/Prompt-Medium.ttf'),
    'Prompt-Regular': require('./assets/fonts/Prompt-Regular.ttf'),
    'Prompt-Bold': require('./assets/fonts/Prompt-Bold.ttf'),
    'Prompt-Light': require('./assets/fonts/Prompt-Light.ttf'),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync(); // ซ่อน Splash Screen เมื่อโหลดฟอนต์เสร็จ
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null; // รอจนกว่าจะโหลดฟอนต์เสร็จ
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <NavigationContainer>
        <RootStack.Navigator initialRouteName="SelectLogin" screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="SelectLogin" component={SelectLoginScreen} />
          <RootStack.Screen name="Member" component={MemberStack} />
          <RootStack.Screen name="Sitter" component={SitterStack} />
        </RootStack.Navigator>
      </NavigationContainer>
    </View>
  );
}
