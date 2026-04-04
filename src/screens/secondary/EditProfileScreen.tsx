import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator,
  Alert, Image, Modal,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import firestore from '@react-native-firebase/firestore';
import { COLORS } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { uploadToCloudinary } from '../../services/cloudinary.service';
import { FOLK_CATEGORIES } from '../../constants/categories';

export default function EditProfileScreen({ navigation }: any) {
  const { user, userProfile, fetchUserProfile } = useAuthStore();
  const [name, setName] = useState(userProfile?.name || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [category, setCategory] = useState(userProfile?.artistCategory || '');
  const [loading, setLoading] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const pickAvatar = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.assets?.[0]?.uri) setAvatarUri(result.assets[0].uri);
  };

  const pickCover = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.assets?.[0]?.uri) setCoverUri(result.assets[0].uri);
  };

  const removeAvatar = () => {
    if (avatarUri) {
      setAvatarUri(null);
    } else {
      Alert.alert('Remove Profile Photo', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            await firestore().collection('users').doc(user?.uid).set(
              { avatarUrl: '' }, { merge: true }
            );
            await fetchUserProfile(user?.uid);
          },
        },
      ]);
    }
  };

  const removeCover = () => {
    if (coverUri) {
      setCoverUri(null);
    } else {
      Alert.alert('Remove Cover Photo', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            await firestore().collection('users').doc(user?.uid).set(
              { coverUrl: '' }, { merge: true }
            );
            await fetchUserProfile(user?.uid);
          },
        },
      ]);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Name cannot be empty'); return; }
    setLoading(true);
    try {
      let avatarUrl = userProfile?.avatarUrl || '';
      let coverUrl = userProfile?.coverUrl || '';

      if (avatarUri) {
        setUploadProgress('Uploading profile photo...');
        avatarUrl = await uploadToCloudinary(avatarUri, 'image');
      }
      if (coverUri) {
        setUploadProgress('Uploading cover photo...');
        coverUrl = await uploadToCloudinary(coverUri, 'image');
      }

      setUploadProgress('Saving profile...');
      await firestore().collection('users').doc(user?.uid).set({
        name: name.trim(),
        bio: bio.trim(),
        artistCategory: category.trim(),
        avatarUrl,
        coverUrl,
      }, { merge: true });

      await fetchUserProfile(user?.uid);
      setUploadProgress('');
      Alert.alert('Success', 'Profile updated successfully!');
      navigation.goBack();
    } catch (e: any) {
      setUploadProgress('');
      Alert.alert('Error', e.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.darkText} />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Cover Photo */}
      <TouchableOpacity style={styles.coverContainer} onPress={pickCover} activeOpacity={0.85}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.coverImg} />
        ) : userProfile?.coverUrl ? (
          <Image source={{ uri: userProfile.coverUrl }} style={styles.coverImg} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Ionicons name="image-outline" size={32} color={COLORS.muted} />
            <Text style={styles.coverPlaceholderText}>Tap to add cover photo</Text>
          </View>
        )}
        <View style={styles.coverOverlay}>
          <View style={styles.coverActions}>
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={14} color={COLORS.white} />
              <Text style={styles.editBadgeText}>Change Cover</Text>
            </View>
            {(coverUri || userProfile?.coverUrl) && (
              <TouchableOpacity
                style={styles.deleteBadge}
                onPress={(e: any) => {
                  e.stopPropagation?.();
                  removeCover();
                }}>
                <Ionicons name="trash-outline" size={14} color="#FF6B6B" />
                <Text style={styles.deleteBadgeText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <TouchableOpacity style={styles.avatarWrapper} onPress={pickAvatar} activeOpacity={0.85}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : userProfile?.avatarUrl ? (
            <Image source={{ uri: userProfile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color={COLORS.saffron} />
            </View>
          )}
          <View style={styles.avatarCameraBadge}>
            <Ionicons name="camera" size={14} color={COLORS.white} />
          </View>
        </TouchableOpacity>
        <Text style={styles.changePhotoText}>Change Profile Photo</Text>
        {(avatarUri || userProfile?.avatarUrl) && (
          <TouchableOpacity style={styles.removePhotoBtn} onPress={removeAvatar}>
            <Ionicons name="trash-outline" size={14} color="#FF4444" />
            <Text style={styles.removePhotoText}>Remove Photo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Form */}
      <View style={styles.form}>

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={COLORS.muted}
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell your story..."
          placeholderTextColor={COLORS.muted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Artist Category</Text>
        <TouchableOpacity
          style={[styles.input, styles.categorySelector]}
          onPress={() => setShowCategoryModal(true)}>
          <Text style={{ color: category ? COLORS.darkText : COLORS.muted, fontSize: 15 }}>
            {category || 'Select your folk art category...'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={COLORS.muted} />
        </TouchableOpacity>

        {/* Progress */}
        {loading && uploadProgress !== '' && (
          <View style={styles.progressBanner}>
            <ActivityIndicator size="small" color={COLORS.saffron} />
            <Text style={styles.progressText}>{uploadProgress}</Text>
          </View>
        )}

        {/* Preview */}
        {(avatarUri || coverUri) && !loading && (
          <View style={styles.previewBanner}>
            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.teal} />
            <Text style={styles.previewText}>
              {avatarUri && coverUri
                ? 'Profile photo + cover selected'
                : avatarUri ? 'Profile photo selected'
                : 'Cover photo selected'}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, loading && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={loading}>
          {loading
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>

      </View>

      {/* Category Modal */}
      <Modal visible={showCategoryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.darkText} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {FOLK_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryItem, category === cat && styles.categoryItemActive]}
                  onPress={() => { setCategory(cat); setShowCategoryModal(false); }}>
                  <Text style={[
                    styles.categoryItemText,
                    category === cat && styles.categoryItemTextActive,
                  ]}>
                    {cat}
                  </Text>
                  {category === cat && (
                    <Ionicons name="checkmark" size={18} color={COLORS.saffron} />
                  )}
                </TouchableOpacity>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.offwhite },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16,
    backgroundColor: COLORS.white, borderBottomWidth: 0.5, borderBottomColor: COLORS.border,
  },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.darkText },
  coverContainer: { height: 160, position: 'relative' },
  coverImg: { width: '100%', height: '100%' },
  coverPlaceholder: {
    width: '100%', height: '100%', backgroundColor: COLORS.warmBg,
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  coverPlaceholderText: { fontSize: 13, color: COLORS.muted },
  coverOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.35)', paddingVertical: 10, paddingHorizontal: 16,
  },
  coverActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editBadgeText: { color: COLORS.white, fontSize: 13, fontWeight: '500' },
  deleteBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deleteBadgeText: { color: '#FF6B6B', fontSize: 13, fontWeight: '500' },
  avatarSection: { alignItems: 'center', marginTop: -40, marginBottom: 8 },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: COLORS.white },
  avatarPlaceholder: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: COLORS.warmBg, justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: COLORS.white,
  },
  avatarCameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: COLORS.saffron, width: 28, height: 28,
    borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.white,
  },
  changePhotoText: { fontSize: 13, color: COLORS.saffron, fontWeight: '600', marginTop: 8 },
  removePhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  removePhotoText: { fontSize: 12, color: '#FF4444', fontWeight: '500' },
  form: { paddingHorizontal: 20, paddingTop: 20 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.darkText, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 14,
    fontSize: 15, color: COLORS.darkText, marginBottom: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  bioInput: { height: 100 },
  categorySelector: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  progressBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.warmBg, borderRadius: 10, padding: 12, marginBottom: 16,
  },
  progressText: { fontSize: 13, color: COLORS.darkText },
  previewBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#E8F5F3', borderRadius: 10, padding: 12,
    marginBottom: 16, borderWidth: 1, borderColor: '#B2DDD6',
  },
  previewText: { fontSize: 13, color: COLORS.teal, flex: 1 },
  saveBtn: {
    backgroundColor: COLORS.saffron, padding: 16,
    borderRadius: 12, alignItems: 'center',
  },
  saveBtnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 24,
    borderTopRightRadius: 24, maxHeight: '70%', paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 0.5, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.darkText },
  categoryItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: COLORS.border,
  },
  categoryItemActive: { backgroundColor: COLORS.warmBg },
  categoryItemText: { fontSize: 15, color: COLORS.darkText },
  categoryItemTextActive: { color: COLORS.saffron, fontWeight: '600' },
});