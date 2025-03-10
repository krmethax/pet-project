import React, { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  LayoutAnimation,
  UIManager,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AntDesign } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { LinearGradient } from "expo-linear-gradient";
import Svg, { G, Path, Text as SvgText } from "react-native-svg";

const { width: screenWidth } = Dimensions.get("window");

// เปิดใช้งาน LayoutAnimation สำหรับ Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ----- Utility functions for custom donut chart -----
function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describeDonutSegment(cx, cy, outerRadius, innerRadius, startAngle, endAngle) {
  const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M", outerStart.x, outerStart.y,
    "A", outerRadius, outerRadius, 0, largeArcFlag, 1, outerEnd.x, outerEnd.y,
    "L", innerEnd.x, innerEnd.y,
    "A", innerRadius, innerRadius, 0, largeArcFlag, 0, innerStart.x, innerStart.y,
    "Z"
  ].join(" ");
}

// ----- Custom DonutChart Component -----
// เพิ่ม prop selectedIndex เพื่อให้ slice ที่เลือกมีการ offset (exploded effect)
const DonutChart = ({ data, innerRadius, outerRadius, centerText, selectedIndex }) => {
  const size = outerRadius * 2;
  const cx = outerRadius;
  const cy = outerRadius;
  let startAngle = 0;
  const slices = data.map((slice) => {
    const sliceAngle = (slice.value / 100) * 360;
    const endAngle = startAngle + sliceAngle;
    const midAngle = startAngle + sliceAngle / 2;
    const path = describeDonutSegment(cx, cy, outerRadius, innerRadius, startAngle, endAngle);
    startAngle = endAngle;
    return { path, color: slice.color, midAngle };
  });

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <G>
        {slices.map((slice, index) => {
          // หาก slice ตรงกับ selectedIndex ให้เพิ่ม offset เล็กน้อย (exploded effect)
          let transform = "";
          if (selectedIndex === index) {
            const offset = 5; // ลด offset ลงเพื่อไม่ให้วงกลมบัง
            const offsetX = offset * Math.cos((slice.midAngle - 90) * Math.PI / 180);
            const offsetY = offset * Math.sin((slice.midAngle - 90) * Math.PI / 180);
            transform = `translate(${offsetX}, ${offsetY})`;
          }
          return (
            <G key={`slice-${index}`} transform={transform}>
              <Path d={slice.path} fill={slice.color} />
            </G>
          );
        })}
        {centerText ? (
          <SvgText
            x={cx}
            y={cy}
            textAnchor="middle"
            alignmentBaseline="middle"
            fontSize={20}
            fill="#000"
          >
            {centerText}
          </SvgText>
        ) : null}
      </G>
    </Svg>
  );
};

// ----- Report Component -----
export default function Report() {
  const navigation = useNavigation();
  const route = useRoute();

  // สมมติ API ส่งมาในรูปแบบ:
  // {
  //   "stats": { "jobsCompleted": "5", "totalIncome": "1000.00" },
  //   "incomeStats": [
  //     { "short_name": "บริการ A", "description": "รับฝากสัตว์เลี้ยงค้างคืน", "total_income": "400.00", "job_count": "2" },
  //     { "short_name": "บริการ B", "description": "รับอาบน้ำ", "total_income": "300.00", "job_count": "1" },
  //     { "short_name": "บริการ C", "description": "พาสัตว์เลี้ยงเดินเล่น", "total_income": "200.00", "job_count": "1" },
  //     { "short_name": "บริการ D", "description": "รับอาบน้ำ", "total_income": "100.00", "job_count": "1" }
  //   ]
  // }
  const { stats } = route.params || {};
  const [incomeStats, setIncomeStats] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const totalIncome = parseFloat(stats?.totalIncome) || 0;

  const fetchIncomeStats = useCallback(async () => {
    try {
      let sitterId = route.params?.sitter_id;
      if (!sitterId) {
        sitterId = await AsyncStorage.getItem("sitter_id");
      }
      if (!sitterId) {
        console.error("Sitter ID not found");
        return;
      }
      const response = await fetch(`http://100.116.44.8:5000/api/sitter/sitter/income-stats/${sitterId}`);
      if (!response.ok) {
        const text = await response.text();
        console.error("Income stats response status:", response.status);
        console.error("Income stats response text:", text);
        throw new Error("ไม่สามารถดึงข้อมูลรายได้ได้");
      }
      const data = await response.json();
      setIncomeStats(data.incomeStats || []);
    } catch (error) {
      console.error("Error fetching income stats:", error);
    }
  }, [route.params?.sitter_id]);

  useEffect(() => {
    if (stats) {
      fetchIncomeStats();
    }
  }, [fetchIncomeStats, stats]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchIncomeStats();
    setRefreshing(false);
  }, [fetchIncomeStats]);

  // รวมรายได้ตามบริการ (group by short_name)
  const groupedIncomeStats = incomeStats.reduce((acc, item) => {
    const key = item.short_name;
    if (!acc[key]) {
      acc[key] = {
        short_name: item.short_name,
        total_income: parseFloat(item.total_income),
        job_count: Number(item.job_count),
        details: [item],
      };
    } else {
      acc[key].total_income += parseFloat(item.total_income);
      acc[key].job_count += Number(item.job_count);
      acc[key].details.push(item);
    }
    return acc;
  }, {});
  const groupedArray = Object.values(groupedIncomeStats);

  // เตรียมข้อมูลสำหรับ DonutChart (แยกบริการ)
  const colorPalette = [
    "#FF69B4",
    "#33CC33",
    "#6666CC",
    "#CC3333",
    "#CCCC33",
    "#FF8C00",
    "#20B2AA",
    "#9370DB",
  ];
  const breakdownData = groupedArray.map((item, index) => {
    const percentage = totalIncome ? (item.total_income / totalIncome) * 100 : 0;
    return { value: percentage, color: colorPalette[index % colorPalette.length] };
  });
  let sum = breakdownData.reduce((acc, slice) => acc + slice.value, 0);
  if (sum < 100) {
    breakdownData.push({ value: 100 - sum, color: "#E0E0E0" });
  } else if (sum > 100) {
    breakdownData.forEach((slice) => {
      slice.value = (slice.value / sum) * 100;
    });
  }

  // ปรับขนาด DonutChart: ลดขนาดเล็กลง
  const radius = screenWidth * 0.2;
  const innerRadius = radius * 0.6;
  const centerText = `฿ ${totalIncome.toFixed(0)}`;

  // สร้าง routes สำหรับ TabView จาก groupedArray (เก็บรายละเอียดงาน)
  const routes = groupedArray.map((item, index) => ({
    key: `${index}`,
    title: item.short_name,
    data: item.details,
  }));

  // state สำหรับ TabView: active tab (สำหรับ scene) และ exploded tab (สำหรับ effect)
  const [activeTab, setActiveTab] = useState(0);
  const [explodedTab, setExplodedTab] = useState(null);

  // เมื่อกดแท็บ: ถ้าแท็บที่กดเท่ากับ explodedTab ให้ toggle กลับเป็น null (กลับมาปกติ)
  const onTabPress = (index) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(index);
    setExplodedTab((prev) => (prev === index ? null : index));
  };

  // renderScene สำหรับแต่ละ tab: แสดงรายการงานเป็น list
  const renderScene = ({ route }) => {
    return (
      <View style={styles.sceneContainer}>
        {route.data.map((job, idx) => (
          <View key={idx} style={styles.jobItem}>
            <View style={styles.jobLeft}>
              <Text style={styles.jobTitle}>
                {job.description || job.short_name}
              </Text>
            </View>
            <Text style={styles.jobPrice}>
              ฿ {parseFloat(job.total_income).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  // Custom Tab Bar แบบเลื่อนซ้ายขวา (เหมือน Instagram) ใช้ ScrollView แนวนอน
  const renderTabBar = () => {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContainer}>
        {routes.map((route, index) => (
          <TouchableOpacity key={route.key} style={styles.tabItemWrapper} onPress={() => onTabPress(index)}>
            <Text style={[styles.tabLabel, activeTab === index && styles.tabLabelActive]}>
              {route.title}
            </Text>
            {activeTab === index && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      {/* Header พร้อมปุ่มย้อนกลับ */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <AntDesign name="arrowleft" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>รายงานรายได้</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* ข้อมูลพื้นฐาน */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            รับงานไปแล้ว: {stats?.jobsCompleted || 0} | รายได้รวม: ฿ {totalIncome.toFixed(0)}
          </Text>
        </View>
        {/* Donut Chart */}
        <View style={styles.chartContainer}>
          <TouchableOpacity>
            <DonutChart
              data={breakdownData}
              innerRadius={innerRadius}
              outerRadius={radius}
              centerText={centerText}
              selectedIndex={explodedTab} // ส่ง explodedTab เพื่อให้ slice ที่เลือกมี effect
            />
          </TouchableOpacity>
        </View>
        {/* Custom TabView */}
        {routes.length > 0 && (
          <View style={styles.tabContainer}>
            {renderTabBar()}
            <View style={styles.sceneWrapper}>{renderScene({ route: routes[activeTab] })}</View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  content: { paddingBottom: 40, alignItems: "center" },
  header: {
    width: "100%",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  backButton: { paddingRight: 10 },
  headerTitle: { fontSize: 18, fontFamily: "Prompt-Medium", color: "#000" },
  infoContainer: { marginTop: 20, marginBottom: 20 },
  infoText: { fontSize: 16, fontFamily: "Prompt-Regular", color: "#333" },
  chartContainer: { alignItems: "center", justifyContent: "center", marginBottom: 20 },
  tabContainer: { width: "90%", marginBottom: 20 },
  tabBarContainer: { flexDirection: "row", paddingHorizontal: 10 },
  tabItemWrapper: { alignItems: "center", marginRight: 20 },
  tabLabel: { fontFamily: "Prompt-Regular", fontSize: 14, color: "#333" },
  tabLabelActive: { fontFamily: "Prompt-Bold", color: "#FF69B4" },
  tabIndicator: { marginTop: 4, height: 2, width: "100%", backgroundColor: "#FF69B4" },
  sceneWrapper: { padding: 10, backgroundColor: "#fff", borderRadius: 10, marginTop: 20 },
  sceneContainer: { width: "100%", padding: 10 },
  jobItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingVertical: 8,
  },
  jobLeft: { flex: 1 },
  jobTitle: { fontSize: 14, fontFamily: "Prompt-Regular", color: "#333" },
  jobPrice: { fontSize: 14, fontFamily: "Prompt-Bold", color: "#FF69B4" },
});
