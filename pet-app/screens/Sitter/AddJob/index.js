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
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { AntDesign } from "@expo/vector-icons";

export default function AddJob() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  // เราจะใช้ sitter_id สำหรับ Add Job
  const [sitterId, setSitterId] = useState(null);

  // ฟิลด์ฟอร์มสำหรับเพิ่มงาน
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");

  // ฟิลด์อื่น ๆ
  const [petTypeId, setPetTypeId] = useState("");
  // ตั้งค่า pricing unit ให้เป็น state โดยมีค่าเริ่มต้น "per_session"
  const [pricingUnit, setPricingUnit] = useState("per_session");
  const [serviceImage, setServiceImage] = useState(null); // URI ของรูป (ถ้ามี)

  // ตัวเลือกต่าง ๆ ที่ดึงจาก API
  const [serviceTypes, setServiceTypes] = useState([]);
  const [petTypes, setPetTypes] = useState([]);

  // รายการหน่วยราคา (แบบ static) – แต่ dropdown นี้มีเพียงตัวเลือกเดียว
  const pricingUnitOptions = [{ label: "ต่อครั้ง", value: "per_session" }];

  // ดึง sitter_id จาก AsyncStorage (ถ้าคุณเคยเก็บหลัง Login)
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

  // ดึงประเภทบริการ
  useEffect(() => {
    const fetchServiceTypes = async () => {
      try {
        const response = await fetch("http://192.168.1.8:5000/api/sitter/service-types");
        if (response.ok) {
          const data = await response.json();
          if (data.serviceTypes && Array.isArray(data.serviceTypes)) {
            setServiceTypes(data.serviceTypes);
          } else {
            console.error("ข้อมูลประเภทบริการไม่ถูกต้อง:", data);
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

  // ดึงประเภทสัตว์เลี้ยง
  useEffect(() => {
    const fetchPetTypes = async () => {
      try {
        const response = await fetch("http://192.168.1.8:5000/api/sitter/pet-types");
        if (response.ok) {
          const data = await response.json();
          if (data.petTypes && Array.isArray(data.petTypes)) {
            setPetTypes(data.petTypes);
          } else {
            console.error("ข้อมูลประเภทสัตว์เลี้ยงไม่ถูกต้อง:", data);
          }
        } else {
          console.error("ไม่สามารถดึงประเภทสัตว์เลี้ยงได้");
        }
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดึงประเภทสัตว์เลี้ยง:", error);
      }
    };
    fetchPetTypes();
  }, []);

  // ขออนุญาตเลือกรูป + ตรวจสอบ size + (option) crop
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("ข้อผิดพลาด", "แอปต้องการสิทธิ์เข้าถึงแกลเลอรี่");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      const originalUri = result.assets[0].uri;
      // 1) เช็กไฟล์ไม่เกิน 32MB
      try {
        const info = await FileSystem.getInfoAsync(originalUri);
        if (info.size && info.size > 32 * 1024 * 1024) {
          Alert.alert("รูปเกิน", "ไฟล์รูปนี้มีขนาดเกิน 32MB");
          return;
        }
      } catch (fsErr) {
        console.error("ตรวจสอบขนาดไฟล์ไม่ได้:", fsErr);
        Alert.alert("ข้อผิดพลาด", "ไม่สามารถตรวจสอบขนาดไฟล์ได้");
        return;
      }

      // 2) ถ้าต้องการครอปก็ทำด้วย ImageManipulator
      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          originalUri,
          [
            {
              crop: { originX: 0, originY: 0, width: 200, height: 200 },
            },
          ],
          {
            compress: 1,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );
        setServiceImage(manipResult.uri);
      } catch (error) {
        console.error("ครอปภาพผิดพลาด:", error);
        Alert.alert("ข้อผิดพลาด", "ไม่สามารถครอปภาพได้");
      }
    }
  };

  /**
   * เรียก /sitter/add-job เพื่อเพิ่มงาน
   */
  const createJob = async () => {
    if (!serviceTypeId || !petTypeId || !price) {
      Alert.alert("ข้อผิดพลาด", "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
      return null;
    }

    // เราจะตั้งค่าหน่วยการคิดราคาเป็น "per_session" ตามที่เลือกจาก dropdown
    const jobData = {
      sitter_id: sitterId,
      service_type_id: serviceTypeId,
      pet_type_id: petTypeId,
      price: parseFloat(price),
      pricing_unit: pricingUnit,
      duration: duration ? parseInt(duration, 10) : null,
      description: description,
    };

    const response = await fetch("http://192.168.1.8:5000/api/sitter/add-job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jobData),
    });
    const data = await response.json();

    console.log("Create job response:", data);

    if (!response.ok) {
      Alert.alert("ข้อผิดพลาด", data.message || "ไม่สามารถเพิ่มงานได้");
      return null;
    }

    return data.job.sitter_service_id;
  };

  /**
   * เรียก /sitter/upload-job-image => ส่ง sitter_service_id + image
   */
  const uploadJobImage = async (sitterServiceId, localUri) => {
    try {
      let formData = new FormData();
      formData.append("sitter_service_id", sitterServiceId);
      formData.append("image", {
        uri: localUri,
        name: "job_image.jpg",
        type: "image/jpeg",
      });

      const response = await fetch(
        "http://192.168.1.8:5000/api/sitter/upload-job-image",
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await response.json();

      console.log("Upload image response:", data);

      if (!response.ok) {
        Alert.alert("อัปโหลดรูปงานไม่สำเร็จ", data.message || "เกิดข้อผิดพลาด");
        return false;
      }

      return true;
    } catch (error) {
      console.error("uploadJobImage error:", error);
      Alert.alert("ข้อผิดพลาด", "เกิดข้อผิดพลาดระหว่างอัปโหลดรูปงาน");
      return false;
    }
  };

  /**
   * handleSubmit => เรียก createJob และถ้ามีรูป จะเรียก uploadJobImage
   */
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const newSitterServiceId = await createJob();
      if (!newSitterServiceId) {
        setLoading(false);
        return;
      }
      if (serviceImage) {
        const uploadOk = await uploadJobImage(newSitterServiceId, serviceImage);
        if (!uploadOk) {
          setLoading(false);
          return;
        }
      }

      Alert.alert("สำเร็จ", "เพิ่มงานและอัปโหลดรูปเรียบร้อยแล้ว!");
      // รีเซ็ตฟอร์ม
      setServiceTypeId("");
      setPetTypeId("");
      setPrice("");
      // pricing_unit ถูกตั้งเป็น per_session โดยอัตโนมัติ
      setDuration("");
      setDescription("");
      setServiceImage(null);
      navigation.goBack();
    } catch (error) {
      console.error("handleSubmit error:", error);
      Alert.alert("ข้อผิดพลาด", "เกิดข้อผิดพลาดในการเพิ่มงาน");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header: ปุ่มย้อนกลับและหัวข้อ */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <AntDesign name="arrowleft" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>เพิ่มงานของฉัน</Text>
        </View>

        {/* ส่วนเลือกรูปภาพบริการ */}
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {serviceImage ? (
            <Image source={{ uri: serviceImage }} style={styles.image} />
          ) : (
            <Text style={styles.imagePickerText}>เลือกรูปภาพบริการ (ไม่เกิน 32MB)</Text>
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

        {/* เลือกประเภทสัตว์เลี้ยง (capsule แนวนอน) */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>ประเภทสัตว์เลี้ยง</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.capsuleContainer}>
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

        {/* เลือกหน่วยการคิดราคา (dropdown) */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>หน่วยการคิดราคา</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={pricingUnit}
              onValueChange={(itemValue) => setPricingUnit(itemValue)}
              style={styles.picker}
            >
              {pricingUnitOptions.map((option) => (
                <Picker.Item key={option.value} label={option.label} value={option.value} />
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
        <TouchableOpacity style={styles.addButton} onPress={handleSubmit} disabled={loading}>
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
    backgroundColor: "#FFF",
    paddingTop: 40,
  },
  container: {
    padding: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    marginRight: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Prompt-Bold",
    color: "#000",
  },
  imagePicker: {
    borderWidth: 1,
    borderColor: "#ddd",
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
    textAlign: "center",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
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
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    fontFamily: "Prompt-Regular",
    backgroundColor: "#FFF",
    color: "#000",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    overflow: "hidden",
  },
  picker: {
    height: 50,
    width: "100%",
  },
  fixedText: {
    fontSize: 16,
    fontFamily: "Prompt-Bold",
    color: "#000",
    padding: 10,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
  },
  addButton: {
    backgroundColor: "#FF0000",
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
  capsuleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  capsule: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#ddd",
    marginRight: 10,
  },
  capsuleSelected: {
    backgroundColor: "#FF0000",
  },
  capsuleText: {
    fontSize: 14,
    fontFamily: "Prompt-Regular",
    color: "#000",
  },
  capsuleTextSelected: {
    color: "#FFF",
    fontFamily: "Prompt-Bold",
  },
});
