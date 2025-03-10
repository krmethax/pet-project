import React, { useState } from 'react';
import { 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';

export default function Review() {
  const navigation = useNavigation();
  const route = useRoute();
  // รับค่า bookingId, memberId, sitterId จาก route.params
  const { bookingId, memberId, sitterId } = route.params;
  console.log('Route params:', route.params);

  
  const [rating, setRating] = useState(0); // คะแนนเป็นตัวเลข (1-5)
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStarPress = (star) => {
    // ถ้ากดดาวที่เลือกอยู่แล้ว (rating เท่ากับ star) ให้ยกเลิกเฉพาะดาวที่กด (ลด rating ลง 1)
    if (rating === star) {
      setRating(star - 1);
    } else {
      setRating(star);
    }
  };
  

  const handleSubmitReview = async () => {
    if (rating === 0 || !reviewText) {
      Alert.alert('กรุณากรอกข้อมูลให้ครบถ้วน', 'โปรดให้คะแนนและเขียนรีวิว');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('http://192.168.1.10:5000/api/auth/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          member_id: memberId,
          sitter_id: sitterId,
          rating,
          review_text: reviewText,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert('เกิดข้อผิดพลาด', data.message || 'ไม่สามารถส่งรีวิวได้');
      } else {
        Alert.alert('สำเร็จ', data.message, [
          { text: 'ตกลง', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถส่งรีวิวได้');
    }
    setLoading(false);
  };

  const renderStars = () => {
    let stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity key={i} onPress={() => handleStarPress(i)}>
          <AntDesign
            name={i <= rating ? "star" : "staro"}
            size={32}
            color="#FFCC00"
            style={styles.starIcon}
          />
        </TouchableOpacity>
      );
    }
    return <View style={styles.starContainer}>{stars}</View>;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {/* Header with back arrow and title */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <AntDesign name="arrowleft" size={24} color="#FF0000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>รีวิวการจอง</Text>
      </View>
      <View style={styles.formContainer}>
        {renderStars()}
        <Text style={styles.label}>ข้อความรีวิว:</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="กรอกข้อความรีวิว"
          multiline
          numberOfLines={4}
          value={reviewText}
          onChangeText={setReviewText}
        />
        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={handleSubmitReview} 
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'กำลังส่ง...' : 'ส่งรีวิว'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    paddingRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Prompt-Bold',
    color: '#000',
  },
  formContainer: {
    flex: 1,
  },
  starContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  starIcon: {
    marginHorizontal: 4,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Prompt-Medium',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    fontFamily: 'Prompt-Regular',
    marginBottom: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Prompt-Bold',
  },
});
