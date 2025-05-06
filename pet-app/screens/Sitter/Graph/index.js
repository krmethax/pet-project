import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  FlatList,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PieChart } from "react-native-svg-charts";
import { Defs, LinearGradient, Stop } from "react-native-svg";
import { Picker } from "@react-native-picker/picker";

const { width: screenWidth } = Dimensions.get("window");

export default function ExpensesReport() {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ jobsCompleted: "0", totalIncome: "0" });
  const [incomeStats, setIncomeStats] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
    "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"
  ];

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const sitterId = await AsyncStorage.getItem("sitter_id");
      if (!sitterId) throw new Error("No sitter_id");
      const resp = await fetch(
        `http://192.168.1.12:5000/api/sitter/sitter/income-stats/${sitterId}`
      );
      if (!resp.ok) throw new Error(await resp.text());
      const { stats: apiStats, incomeStats: apiInc } = await resp.json();
      setStats(apiStats);

      // กรองตามเดือน/ปี
      const filtered = apiInc.filter(x => {
        const d = new Date(x.booking_date);
        return (
          d.getMonth() + 1 === selectedMonth &&
          d.getFullYear() === selectedYear
        );
      });

      setIncomeStats(filtered.map((x, i) => {
        const bookingDate = new Date(x.booking_date);
        // ตัดเวลาให้เหลือ ชั่วโมง:นาที
        const start = x.start_time.slice(0,5);
        const end = x.end_time.slice(0,5);
        return {
          key: String(i),
          short_name: x.short_name,
          amount: parseFloat(x.total_income),
          date: bookingDate.toLocaleDateString("th-TH", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          time: `${start} - ${end}`,
        };
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // คำนวณยอดรวมเดือนที่เลือก
  const total = incomeStats.reduce((sum, x) => sum + x.amount, 0);

  // เตรียมข้อมูลสำหรับ Donut: ถ้ารายได้ >0 ใช้ gradient สีหลัก ถ้า =0 ใช้สีเทา
  const chartData = [
    {
      key: "slice",
      value: 1,
      svg: { fill: total > 0 ? "url(#grad)" : "#eee" },
    }
  ];

  // ขนาด chart ครึ่งหน้าจอ
  const chartSize = screenWidth * 0.5;

  const renderHeader = () => (
    <View>
      {/* Back + Title */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AntDesign name="arrowleft" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>รายงานรายได้</Text>
      </View>

      {/* Donut Chart */}
      <View style={[styles.chartWrapper, { width: chartSize, height: chartSize }]}> 
        <PieChart
          style={{ width: chartSize, height: chartSize }}
          data={chartData}
          outerRadius={"95%"}
          innerRadius={"65%"}
          padAngle={0}
        >
          <Defs>
            <LinearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#8E2DE2" />
              <Stop offset="100%" stopColor="#4A00E0" />
            </LinearGradient>
          </Defs>
        </PieChart>
        <View style={[styles.centerLabel, { width: chartSize, height: chartSize }]}> 
          <Text style={styles.centerLabelText}>฿</Text>
          <Text style={styles.centerLabelAmount}>{total.toFixed(0)}</Text>
        </View>
      </View>

      {/* Dropdowns ใต้กราฟ */}
      <View style={styles.pickerRow}>
        <Picker
          selectedValue={selectedMonth}
          style={styles.picker}
          onValueChange={setSelectedMonth}
        >
          {months.map((m, i) => (
            <Picker.Item key={i} label={m} value={i + 1} />
          ))}
        </Picker>
        <Picker
          selectedValue={selectedYear}
          style={styles.picker}
          onValueChange={setSelectedYear}
        >
          {Array.from({ length: 5 }, (_, i) => {
            const y = new Date().getFullYear() - i;
            return <Picker.Item key={y} label={`${y}`} value={y} />;
          })}
        </Picker>
      </View>

      {/* ถ้าไม่มีงาน */}
      {incomeStats.length === 0 && (
        <Text style={styles.noJobsText}>ไม่พบงานในเดือนที่เลือก</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <FlatList
        data={incomeStats}
        keyExtractor={item => item.key}
        ListHeaderComponent={renderHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} />}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <View style={styles.listText}>
              {/* ชื่องาน */}
              <Text style={styles.listDesc}>{item.short_name}</Text>
              {/* วันที่ */}
              <View style={styles.row}>
                <Ionicons name="calendar-outline" size={16} color="#777" style={styles.icon} />
                <Text style={styles.listDate}>{item.date}</Text>
              </View>
              {/* เวลา */}
              <View style={styles.row}>
                <Ionicons name="time-outline" size={16} color="#777" style={styles.icon} />
                <Text style={styles.listTime}>{item.time}</Text>
              </View>
            </View>
            <Text
              style={[
                styles.listAmount,
                item.amount >= 0 ? styles.amountPlus : styles.amountMinus,
              ]}
            >
              ฿{Math.abs(item.amount).toFixed(2)}
            </Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  listContainer: { padding: 16 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Prompt-Medium",
    color: "#333",
    marginLeft: 8,
  },

  chartWrapper: {
    alignSelf: "center",
    marginBottom: 24,
  },
  centerLabel: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  centerLabelText: {
    fontSize: 18,
    fontFamily: "Prompt-Regular",
    color: "#999",
  },
  centerLabelAmount: {
    fontSize: 24,
    fontFamily: "Prompt-Bold",
    color: "#333",
  },

  pickerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
  },
  picker: {
    width: 140,
    height: 50,
    marginHorizontal: 8,
    fontFamily: "Prompt-Regular",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    backgroundColor: "#fafafa",
  },

  noJobsText: {
    textAlign: "center",
    color: "#999",
    fontFamily: "Prompt-Regular",
    marginBottom: 24,
  },

  listItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingVertical: 12,
  },
  listText: { flex: 1 },
  listDesc: {
    fontSize: 16,
    fontFamily: "Prompt-Medium",
    color: "#333",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  icon: {
    marginRight: 6,
  },
  listDate: {
    fontSize: 14,
    fontFamily: "Prompt-Regular",
    color: "#333",
  },
  listTime: {
    fontSize: 14,
    fontFamily: "Prompt-Regular",
    color: "#333",
  },
  listAmount: {
    fontSize: 16,
    fontFamily: "Prompt-Bold",
  },
  amountPlus: { color: "#4caf50" },
  amountMinus: { color: "#e53935" },
  separator: { height: 1, backgroundColor: "#eee", width: "100%" },
});
