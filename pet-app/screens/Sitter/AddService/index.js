import React, { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { AntDesign } from "@expo/vector-icons";

export default function MyServices() {
  const navigation = useNavigation();
  const [jobs, setJobs] = useState([]);
  const [sitterId, setSitterId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [petTypes, setPetTypes] = useState([]);

  useEffect(() => {
    AsyncStorage.getItem("sitter_id").then((id) => {
      if (id) setSitterId(id);
    });
  }, []);

  const fetchJobs = useCallback(() => {
    if (!sitterId) {
      setRefreshing(false);
      return;
    }
    setRefreshing(true);
    fetch(`http://192.168.1.12:5000/api/sitter/sitter-services/${sitterId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data) => setJobs(data.services || []))
      .catch((e) => console.error(e))
      .finally(() => setRefreshing(false));
  }, [sitterId]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    // fetch service types
    fetch("http://192.168.1.12:5000/api/sitter/service-types")
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json.serviceTypes)) setServiceTypes(json.serviceTypes);
      })
      .catch(console.error);
    // fetch pet types
    fetch("http://192.168.1.12:5000/api/sitter/pet-types")
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json.petTypes)) setPetTypes(json.petTypes);
      })
      .catch(console.error);
  }, []);

  const onDelete = (id) =>
    Alert.alert("ยืนยัน", "ต้องการลบงานนี้หรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        onPress: () =>
          fetch(
            `http://192.168.1.12:5000/api/sitter/sitter-service/${id}`,
            { method: "DELETE" }
          )
            .then((r) =>
              r.json().then((json) => {
                if (!r.ok) throw new Error(json.message);
                fetchJobs();
              })
            )
            .catch((e) => Alert.alert("ผิดพลาด", e.message)),
      },
    ]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>งานของฉัน</Text>
        <TouchableOpacity onPress={() => navigation.navigate("AddJob")}> 
          <AntDesign name="pluscircleo" size={28} color="#FF3B30" />
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchJobs} />
        }
      >
        {jobs.length === 0 ? (
          <Text style={styles.empty}>ยังไม่มีงานของคุณ</Text>
        ) : (
          jobs.map((job) => {
            const svc = serviceTypes.find(
              (s) => s.service_type_id === job.service_type_id
            );
            const pet = petTypes.find(
              (p) => p.pet_type_id === job.pet_type_id
            );
            return (
              <View key={job.sitter_service_id} style={styles.card}>
                {/* ชื่องาน */}
                <View style={styles.line}>
                  <Text style={styles.label}>ชื่องาน: </Text>
                  <Text style={styles.value}>{job.job_name}</Text>
                </View>
                {/* ประเภทงาน */}
                <View style={styles.line}>
                  <Text style={styles.label}>ประเภทงาน: </Text>
                  <Text style={styles.value}>{svc?.short_name || "ไม่ระบุ"}</Text>
                </View>
                {/* ประเภทสัตว์เลี้ยง */}
                <View style={styles.line}>
                  <Text style={styles.label}>ประเภทสัตว์เลี้ยง: </Text>
                  <Text style={styles.value}>{pet?.type_name || "ไม่ระบุ"}</Text>
                </View>
                {/* ราคาและลบ */}
                <View style={styles.footerRow}>
                  <View style={styles.line}>
                    <Text style={styles.label}>ราคา: </Text>
                    <Text style={styles.price}>{parseFloat(job.price).toLocaleString()} บาท</Text>
                  </View>
                  <TouchableOpacity onPress={() => onDelete(job.sitter_service_id)}>
                    <AntDesign name="delete" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f9f9f9" },
  header: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  title: { fontSize: 24, fontFamily: "Prompt-Bold", color: "#333" },
  container: { padding: 16 },
  empty: {
    marginTop: 40,
    textAlign: "center",
    color: "#000",
    fontFamily: "Prompt-Regular",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  line: { flexDirection: "row", marginBottom: 6 },
  label: {
    fontSize: 16,
    fontFamily: "Prompt-Medium",
    color: "#000",
  },
  value: {
    fontSize: 16,
    fontFamily: "Prompt-Regular",
    color: "#222",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  price: {
    fontSize: 16,
    fontFamily: "Prompt-Bold",
    color: "#000",
  },
});