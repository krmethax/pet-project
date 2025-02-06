// screens/SelectLoginScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

export default function SelectLoginScreen({ navigation }) {
  return (
    <LinearGradient colors={["#1E1E1E", "#111111"]} style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>คุณคือใคร</Text>

      {/* ปุ่มสำหรับเข้าสู่ระบบในฐานะสมาชิก */}
      <TouchableOpacity 
        style={styles.button} 
        onPress={() => navigation.navigate('Member')}
      >
        <Text style={styles.buttonText}>สมาชิก</Text>
      </TouchableOpacity>

      {/* ปุ่มสำหรับเข้าสู่ระบบในฐานะพี่เลี้ยง */}
      <TouchableOpacity 
        style={styles.button} 
        onPress={() => navigation.navigate('Sitter')}
      >
        <Text style={styles.buttonText}>พี่เลี้ยง</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // จัดให้อยู่กลางหน้าจอ
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    // ใช้ฟอนต์ Prompt-Bold (ต้องมีการโหลดฟอนต์ล่วงหน้าใน App.js)
    fontFamily: "Prompt-Bold",
    color: "#FFF",
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#FFF",
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 30,
    marginVertical: 10,
    width: '75%' ,
  },
  buttonText: {
    color: "#000",
    fontFamily: "Prompt-Bold",
    fontSize: 16,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
