import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";

export default function AddJob() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [sitterId, setSitterId] = useState(null);

  // State สำหรับข้อมูลในฟอร์มเดิม
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");

  // State สำหรับข้อมูลใหม่
  const [petTypeId, setPetTypeId] = useState("");
  const [pricingUnit, setPricingUnit] = useState("");
  const [serviceImage, setServiceImage] = useState(null);

  // State สำหรับดึงข้อมูลประเภทบริการจาก API
  const [serviceTypes, setServiceTypes] = useState([]);
  // State สำหรับดึงข้อมูลประเภทสัตว์เลี้ยง (สามารถดึงจาก API หรือกำหนดแบบ static)
  const [petTypes, setPetTypes] = useState([]);

  // ข้อมูลสำหรับตัวเลือกหน่วยการคิดราคา (แบบ static)
  const pricingUnitOptions = [
    { label: "ต่อการเดิน", value: "per_walk" },
    { label: "ต่อคืน", value: "per_night" },
    { label: "ต่อครั้ง", value: "per_session" },
  ];

  // ดึง sitter_id จาก AsyncStorage เมื่อ component mount
  useEffect(() => {
    const getSitterId = async () => {
      try {
        const storedSitterId = await AsyncStorage.getItem("sitter_id");
        if (storedSitterId) {
          setSitterId(storedSitterId);
        }
      } catch (error) {
        console.error("ไม่สามารถดึง sitter_id ได้:", error);
      }
    };
    getSitterId();
  }, []);

  // ดึงประเภทบริการจาก API
  useEffect(() => {
    const fetchServiceTypes = async () => {
      try {
        const response = await fetch("http://192.168.133.111:5000/api/sitter/service-types");
        if (response.ok) {
          const data = await response.json();
          console.log("ข้อมูลประเภทบริการที่ได้จาก API:", data);
          if (data.serviceTypes && Array.isArray(data.serviceTypes)) {
            setServiceTypes(data.serviceTypes);
          } else {
            console.error("รูปแบบข้อมูลประเภทบริการไม่ถูกต้อง:", data);
          }
        } else {
          console.error("ไม่สามารถดึงประเภทบริการได้");
        }
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดึงประเภทบริการ:", error);
      }
    };

    fetchServiceTypes();
  }, []);

  // ดึงประเภทสัตว์เลี้ยงจาก API หรือกำหนดแบบ static
  useEffect(() => {
    const fetchPetTypes = async () => {
      try {
        const response = await fetch("http://192.168.133.111:5000/api/sitter/pet-types");
        if (response.ok) {
          const data = await response.json();
          console.log("ข้อมูลประเภทสัตว์เลี้ยงที่ได้จาก API:", data);
          if (data.petTypes && Array.isArray(data.petTypes)) {
            setPetTypes(data.petTypes);
          } else {
            console.error("รูปแบบข้อมูลประเภทสัตว์เลี้ยงไม่ถูกต้อง:", data);
          }
        } else {
          console.error("ไม่สามารถดึงประเภทสัตว์เลี้ยงได้");
        }
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดึงประเภทสัตว์เลี้ยง:", error);
        // กรณีไม่มี API ให้กำหนดแบบ static
        const petTypesStatic = [
          { pet_type_id: 1, type_name: "สุนัข" },
          { pet_type_id: 2, type_name: "แมว" },
          { pet_type_id: 3, type_name: "กระต่าย" },
          { pet_type_id: 4, type_name: "หนูแฮมสเตอร์" },
          { pet_type_id: 5, type_name: "สัตว์เลี้ยงคลาน" },
        ];
        setPetTypes(petTypesStatic);
      }
    };

    fetchPetTypes();
  }, []);

  // ฟังก์ชันเลือกรูปภาพ
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("ข้อผิดพลาด", "คุณต้องให้สิทธิ์ในการเข้าถึงแกลเลอรี่");
      return;
    }
  
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
  
    // ตรวจสอบ property ที่ใหม่: result.canceled และ result.assets
    if (!result.canceled) {
      // result.assets เป็น Array เก็บข้อมูลของไฟล์ที่เลือกไว้
      setServiceImage(result.assets[0].uri);
    }
  };

  // ฟังก์ชันสำหรับส่งข้อมูลฟอร์ม
  const handleSubmit = async () => {
    if (!serviceTypeId || !petTypeId || !price || !pricingUnit) {
      Alert.alert("ข้อผิดพลาด", "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
      return;
    }

    const jobData = {
      sitter_id: sitterId,
      service_type_id: serviceTypeId,
      pet_type_id: petTypeId,
      price: parseFloat(price),
      pricing_unit: pricingUnit,
      duration: duration ? parseInt(duration, 10) : null,
      description: description,
      service_image: serviceImage,
    };

    setLoading(true);
    try {
      const response = await fetch("http://192.168.133.111:5000/api/sitter/add-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobData),
      });

      if (response.ok) {
        Alert.alert("สำเร็จ", "เพิ่มงานเรียบร้อยแล้ว!");
        setServiceTypeId("");
        setPetTypeId("");
        setPrice("");
        setPricingUnit("");
        setDuration("");
        setDescription("");
        setServiceImage(null);
        navigation.goBack();
      } else {
        Alert.alert("ข้อผิดพลาด", "ไม่สามารถเพิ่มงานได้");
      }
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการเพิ่มงาน:", error);
      Alert.alert("ข้อผิดพลาด", "เกิดข้อผิดพลาดระหว่างเพิ่มงาน");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* รูปภาพให้กดเลือก */}
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {serviceImage ? (
            <Image source={{ uri: serviceImage }} style={styles.image} />
          ) : (
            <Text style={styles.imagePickerText}>เลือกรูปภาพบริการ</Text>
          )}
        </TouchableOpacity>

        {/* เลือกประเภทบริการ */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>ประเภทบริการ</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={serviceTypeId}
              onValueChange={(itemValue) => setServiceTypeId(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="เลือกประเภทบริการ" value="" />
              {serviceTypes.map((type) => (
                <Picker.Item
                  key={type.service_type_id}
                  label={type.short_name}
                  value={type.service_type_id}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* แสดงประเภทสัตว์เลี้ยงในรูปแบบ Capsule (แนวนอน) */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>ประเภทสัตว์เลี้ยง</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.capsuleContainer}
          >
            {petTypes.map((pet) => (
              <TouchableOpacity
                key={pet.pet_type_id}
                style={[
                  styles.capsule,
                  petTypeId === pet.pet_type_id && styles.capsuleSelected,
                ]}
                onPress={() => setPetTypeId(pet.pet_type_id)}
              >
                <Text
                  style={[
                    styles.capsuleText,
                    petTypeId === pet.pet_type_id && styles.capsuleTextSelected,
                  ]}
                >
                  {pet.type_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* เลือกหน่วยการคิดราคา */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>หน่วยการคิดราคา</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={pricingUnit}
              onValueChange={(itemValue) => setPricingUnit(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="เลือกหน่วยการคิดราคา" value="" />
              {pricingUnitOptions.map((option) => (
                <Picker.Item
                  key={option.value}
                  label={option.label}
                  value={option.value}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* ช่องกรอกราคา */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>ราคา</Text>
          <TextInput
            style={styles.input}
            placeholder="กรอกราคา"
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
          />
        </View>

        {/* ช่องกรอกระยะเวลา (ถ้ามี) */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>ระยะเวลา (นาที)</Text>
          <TextInput
            style={styles.input}
            placeholder="กรอกระยะเวลา (ถ้ามี)"
            keyboardType="numeric"
            value={duration}
            onChangeText={setDuration}
          />
        </View>

        {/* ช่องกรอกรายละเอียดเพิ่มเติม */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>รายละเอียดเพิ่มเติม</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="กรอกรายละเอียดเพิ่มเติม (ถ้ามี)"
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* ปุ่มสำหรับส่งข้อมูล */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.addButtonText}>
            {loading ? "กำลังเพิ่ม..." : "เพิ่มงาน"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    marginTop: 30,
  },
  container: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: "Prompt-Bold",
    marginBottom: 8,
    color: "#000",
  },
  input: {
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    fontFamily: "Prompt-Regular",
    backgroundColor: "#FFF",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 8,
    overflow: "hidden",
  },
  picker: {
    height: 50,
    width: "100%",
  },
  addButton: {
    backgroundColor: "#1E90FF",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  addButtonText: {
    fontSize: 18,
    fontFamily: "Prompt-Bold",
    color: "#FFF",
  },
  imagePicker: {
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 8,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#F5F5F5",
  },
  imagePickerText: {
    fontSize: 16,
    fontFamily: "Prompt-Regular",
    color: "#666",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  capsuleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  capsule: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#EEE",
    marginRight: 10,
  },
  capsuleSelected: {
    backgroundColor: "#1E90FF",
  },
  capsuleText: {
    fontSize: 14,
    fontFamily: "Prompt-Regular",
    color: "#333",
  },
  capsuleTextSelected: {
    color: "#FFF",
    fontFamily: "Prompt-Bold",
  },
});
