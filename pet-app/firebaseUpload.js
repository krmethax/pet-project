import uploadImageAsync from "./firebaseUpload"; // ปรับ path ให้ตรงกับที่คุณวางไฟล์

const pickImage = async (key) => {
  try {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
      base64: false, // ไม่ต้อง base64 เพราะเราจะอัปโหลดไฟล์จริง
    });
    if (!result.canceled) {
      const localUri = result.assets[0].uri;
      // อัปโหลดไฟล์ไป Firebase Storage และรับ download URL
      setLoading(true);
      const downloadURL = await uploadImageAsync(localUri);
      setLoading(false);

      if (key === "profile_image") {
        setProfileData({ ...profileData, profile_image: downloadURL });
      } else {
        setDocumentData({ ...documentData, [key]: downloadURL });
      }
    }
  } catch (error) {
    Alert.alert("ข้อผิดพลาด", "ไม่สามารถเลือกภาพได้");
  }
};
