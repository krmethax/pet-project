import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import { AntDesign } from "@expo/vector-icons";

export default function AddJob() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [sitterId, setSitterId] = useState(null);

  // ฟิลด์จากตาราง Sitter_Services
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [petTypeId, setPetTypeId] = useState("");
  const [jobName, setJobName] = useState("");
  const [price, setPrice] = useState("");

  // รายการประเภทบริการและประเภทสัตว์เลี้ยง
  const [serviceTypes, setServiceTypes] = useState([]);
  const [petTypes, setPetTypes] = useState([]);

  useEffect(() => {
    AsyncStorage.getItem("sitter_id").then((id) => {
      if (id) setSitterId(id);
    });
    fetchServiceTypes();
    fetchPetTypes();
  }, []);

  const fetchServiceTypes = async () => {
    try {
      const resp = await fetch(
        "http://192.168.1.12:5000/api/sitter/service-types"
      );
      const json = await resp.json();
      setServiceTypes(json.serviceTypes || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPetTypes = async () => {
    try {
      const resp = await fetch(
        "http://192.168.1.12:5000/api/sitter/pet-types"
      );
      const json = await resp.json();
      setPetTypes(json.petTypes || []);
    } catch (e) {
      console.error(e);
    }
  };

  const createJob = async () => {
    if (!serviceTypeId || !petTypeId || !jobName || !price) {
      Alert.alert(
        "กรอกข้อมูลไม่ครบ",
        "โปรดกรอกชื่องาน, ประเภทบริการ, ประเภทสัตว์เลี้ยง และราคา"
      );
      return null;
    }
    const payload = {
      sitter_id: sitterId,
      service_type_id: serviceTypeId,
      pet_type_id: petTypeId,
      job_name: jobName,
      price: parseFloat(price),
    };
    try {
      const resp = await fetch(
        "http://192.168.1.12:5000/api/sitter/add-job",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await resp.json();
      if (!resp.ok) {
        Alert.alert(
          "เพิ่มงานไม่สำเร็จ",
          json.message || "โปรดลองใหม่อีกครั้ง"
        );
        return null;
      }
      return json.service?.sitter_service_id ?? null;
    } catch (e) {
      console.error(e);
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
      return null;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    const id = await createJob();
    setLoading(false);
    if (id) {
      Alert.alert("สำเร็จ", "เพิ่มงานเรียบร้อยแล้ว");
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={loading} />}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <AntDesign name="arrowleft" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>เพิ่มงานใหม่</Text>
        </View>

        {/* ชื่องาน */}
        <View style={styles.field}>
          <Text style={styles.label}>ชื่องาน</Text>
          <TextInput
            style={styles.input}
            placeholder="เช่น รับอาบน้ำ"
            value={jobName}
            onChangeText={setJobName}
          />
        </View>

        {/* ประเภทบริการ */}
        <View style={styles.field}>
          <Text style={styles.label}>ประเภทบริการ</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={serviceTypeId}
              onValueChange={setServiceTypeId}
              style={styles.picker}
            >
              <Picker.Item label="เลือกประเภทบริการ" value="" />
              {serviceTypes.map((t) => (
                <Picker.Item
                  key={t.service_type_id}
                  label={t.short_name}
                  value={t.service_type_id}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* ประเภทสัตว์เลี้ยง */}
        <View style={styles.field}>
          <Text style={styles.label}>ประเภทสัตว์เลี้ยง</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={petTypeId}
              onValueChange={setPetTypeId}
              style={styles.picker}
            >
              <Picker.Item label="เลือกประเภทสัตว์เลี้ยง" value="" />
              {petTypes.map((pt) => (
                <Picker.Item
                  key={pt.pet_type_id}
                  label={pt.type_name}
                  value={pt.pet_type_id}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* ราคา */}
        <View style={styles.field}>
          <Text style={styles.label}>ราคา (฿)</Text>
          <TextInput
            style={styles.input}
            placeholder="เช่น 300.00"
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
          />
        </View>

        {/* ปุ่มบันทึก */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "กำลังบันทึก..." : "บันทึกงาน"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFF" },
  container: { padding: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  headerTitle: { fontSize: 18, fontFamily: "Prompt-Bold", marginLeft: 12 },
  field: { marginBottom: 16 },
  label: { fontFamily: "Prompt-Medium", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 6,
    padding: 10,
    fontFamily: "Prompt-Regular",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 6,
  },
  picker: { height: 48 },
  button: {
    backgroundColor: "#FF0000",
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: "center",
  },
  buttonDisabled: { backgroundColor: "#CCC" },
  buttonText: {
    color: "#FFF",
    fontFamily: "Prompt-Bold",
    fontSize: 16,
  },
});
