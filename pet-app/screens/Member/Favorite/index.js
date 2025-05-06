import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';

export default function Favorite() {
  const navigation = useNavigation();
  const [memberId, setMemberId] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // ดึง member_id จาก AsyncStorage เมื่อ component mount
  useEffect(() => {
    const getMemberId = async () => {
      try {
        const storedMemberId = await AsyncStorage.getItem('member_id');
        if (storedMemberId) {
          setMemberId(storedMemberId);
        } else {
          // ถ้าไม่มี member_id ให้กลับไปหน้า Login
          navigation.replace('Login');
        }
      } catch (error) {
        console.error('Failed to fetch member_id:', error);
      }
    };
    getMemberId();
  }, []);

  // ดึงรายการ Favorite Sitters ของสมาชิก
  const fetchFavorites = async () => {
    if (!memberId) return;
    try {
      const response = await fetch(`http://192.168.1.12:5000/api/auth/favorite/${memberId}`);
      const data = await response.json();
      if (response.ok) {
        // สมมติว่า API ส่งกลับมาเป็น { favorites: [...] }
        setFavorites(data.favorites || []);
      } else {
        console.error('Error fetching favorites:', data.message);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [memberId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFavorites();
    setRefreshing(false);
  };

  // นำทางไปยังหน้า Profile ของพี่เลี้ยงเมื่อกดที่รายการ Favorite
  const handleNavigateToSitter = (sitter_id) => {
    navigation.navigate('ProfileSitter', { sitter_id });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>รายการโปรด</Text>
        {favorites.length === 0 ? (
          <Text style={styles.infoText}>ไม่มีพี่เลี้ยงที่ถูกใจ</Text>
        ) : (
          favorites.map((fav) => (
            <TouchableOpacity
              key={fav.favorite_id}
              style={styles.favoriteItem}
              onPress={() => handleNavigateToSitter(fav.sitter_id)}
            >
              <View style={styles.avatar}>
                {fav.profile_image ? (
                  <Image source={{ uri: fav.profile_image }} style={styles.avatarImage} />
                ) : (
                  <AntDesign name="user" size={24} color="#000" />
                )}
              </View>
              <Text style={styles.sitterName}>
                {fav.first_name} {fav.last_name}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFF" },
  scrollContainer: { padding: 20 },
  title: { fontSize: 18, fontFamily: "Prompt-Bold", color: "#000", marginBottom: 10 },
  infoText: { fontSize: 16, fontFamily: "Prompt-Regular", color: "#333" },
  favoriteItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  avatarImage: { width: 50, height: 50, borderRadius: 25 },
  sitterName: { fontSize: 16, fontFamily: "Prompt-Regular", color: "#000" },
});
