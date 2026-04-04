import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator,
  Alert, Image, Modal, FlatList, Dimensions,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import firestore from '@react-native-firebase/firestore';
import { COLORS } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { uploadToCloudinary } from '../../services/cloudinary.service';
import { FOLK_CATEGORIES } from '../../constants/categories';

const { width } = Dimensions.get('window');

interface MediaItem {
  uri: string;
  type: 'image' | 'video';
  name: string;
}

export default function UploadScreen({ navigation }: any) {
  const { user, userProfile } = useAuthStore();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [techniques, setTechniques] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const pickMedia = async () => {
    if (mediaItems.length >= 10) {
      Alert.alert('Limit', 'Maximum 10 media items allowed');
      return;
    }
    const result = await launchImageLibrary({
      mediaType: 'mixed',
      quality: 0.9,
      selectionLimit: 10 - mediaItems.length,
    });

    if (result.assets && result.assets.length > 0) {
      const newItems: MediaItem[] = result.assets.map(asset => ({
        uri: asset.uri || '',
        type: asset.type?.startsWith('video') ? 'video' : 'image',
        name: asset.fileName || `media_${Date.now()}`,
      }));
      setMediaItems(prev => [...prev, ...newItems]);
    }
  };

  const removeMedia = (index: number) => {
    setMediaItems(prev => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (mediaItems.length === 0) {
      Alert.alert('Error', 'Please select at least one image or video');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Error', 'Please add a title');
      return;
    }
    if (!category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    setLoading(true);
    try {
      const uploadedUrls: { url: string; type: 'image' | 'video' }[] = [];

      for (let i = 0; i < mediaItems.length; i++) {
        const item = mediaItems[i];
        setUploadProgress(`Uploading ${i + 1} of ${mediaItems.length}...`);
        const url = await uploadToCloudinary(item.uri, item.type);
        uploadedUrls.push({ url, type: item.type });
      }

      setUploadProgress('Saving post...');
      await firestore().collection('posts').add({
        userId: user?.uid,
        imageUrl: uploadedUrls[0].url, 
        mediaItems: uploadedUrls,
        title: title.trim(),
        caption: description.trim(),
        techniques: techniques.trim(),
        category,
        likes: [],
        bookmarks: [],
        commentCount: 0,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      setUploadProgress('');
      Alert.alert('Success', 'Artwork posted successfully!', [
        {
          text: 'View Feed',
          onPress: () => {
            setMediaItems([]);
            setTitle('');
            setDescription('');
            setTechniques('');
            setCategory('');
            navigation.navigate('Home');
          },
        },
      ]);
    } catch (e: any) {
      setUploadProgress('');
      Alert.alert('Error', e.message || 'Failed to post artwork');
    } finally {
      setLoading(false);
    }
  };

  const renderMediaItem = ({ item, index }: { item: MediaItem; index: number }) => (
    <View style={styles.mediaThumb}>
      {item.type === 'video' ? (
        <View style={styles.videoThumb}>
          <Ionicons name="play-circle" size={32} color={COLORS.white} />
          <Text style={styles.videoLabel}>Video</Text>
        </View>
      ) : (
        <Image source={{ uri: item.uri }} style={styles.thumbImg} resizeMode="cover" />
      )}
      {index === 0 && (
        <View style={styles.primaryBadge}>
          <Text style={styles.primaryBadgeText}>Main</Text>
        </View>
      )}
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => removeMedia(index)}>
        <Ionicons name="close-circle" size={22} color="#FF4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.darkText} />
        </TouchableOpacity>
        <Text style={styles.title}>Upload Artwork</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.form}>

        {/* Media Picker Area */}
        <TouchableOpacity
          style={styles.addMediaBtn}
          onPress={pickMedia}
          activeOpacity={0.85}>
          <View style={styles.addMediaInner}>
            <View style={styles.imageIconCircle}>
              <Ionicons name="cloud-upload-outline" size={32} color={COLORS.saffron} />
            </View>
            <Text style={styles.addMediaText}>
              {mediaItems.length > 0
                ? `Add more (${mediaItems.length}/10)`
                : 'Click to upload artwork'}
            </Text>
            <Text style={styles.addMediaSub}>PNG, JPG, MP4 — up to 10 files</Text>
          </View>
        </TouchableOpacity>

        {/* Media Preview Grid */}
        {mediaItems.length > 0 && (
          <View style={styles.mediaGrid}>
            <Text style={styles.mediaCountText}>
              {mediaItems.length} item{mediaItems.length > 1 ? 's' : ''} selected
            </Text>
            <FlatList
              data={mediaItems}
              horizontal
              keyExtractor={(_, i) => i.toString()}
              renderItem={renderMediaItem}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
              scrollEnabled
            />
          </View>
        )}

        {/* Title */}
        <Text style={styles.label}>
          Title <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Give your artwork a title"
          placeholderTextColor={COLORS.muted}
          maxLength={100}
        />

        {/* Description */}
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your artwork, inspiration..."
          placeholderTextColor={COLORS.muted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={500}
        />

        {/* Techniques */}
        <Text style={styles.label}>Techniques Used</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={techniques}
          onChangeText={setTechniques}
          placeholder="e.g. Hand woven, Natural dyes, Traditional patterns..."
          placeholderTextColor={COLORS.muted}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          maxLength={300}
        />

        {/* Category */}
        <Text style={styles.label}>
          Category <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={[styles.input, styles.categorySelector]}
          onPress={() => setShowCategoryModal(true)}>
          <Text style={{ color: category ? COLORS.darkText : COLORS.muted, fontSize: 15 }}>
            {category || 'Select folk art category...'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={COLORS.muted} />
        </TouchableOpacity>

        {/* Progress */}
        {loading && (
          <View style={styles.progressBanner}>
            <ActivityIndicator size="small" color={COLORS.saffron} />
            <Text style={styles.progressText}>{uploadProgress}</Text>
          </View>
        )}

        {/* Share Button */}
        <TouchableOpacity
          style={[styles.uploadBtn, loading && { opacity: 0.6 }]}
          onPress={handlePost}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <View style={styles.uploadBtnInner}>
              <Ionicons name="cloud-upload-outline" size={20} color={COLORS.white} />
              <Text style={styles.uploadBtnText}>Share Artwork</Text>
            </View>
          )}
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
                  style={[
                    styles.categoryItem,
                    category === cat && styles.categoryItemActive,
                  ]}
                  onPress={() => {
                    setCategory(cat);
                    setShowCategoryModal(false);
                  }}>
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
  form: { padding: 20 },

  addMediaBtn: {
    borderRadius: 16, overflow: 'hidden', marginBottom: 16,
    borderWidth: 1.5, borderColor: COLORS.saffron, borderStyle: 'dashed',
  },
  addMediaInner: {
    height: 160, backgroundColor: '#FFF8F4',
    justifyContent: 'center', alignItems: 'center', gap: 10,
  },
  imageIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#FDE8D8', justifyContent: 'center', alignItems: 'center',
  },
  addMediaText: { fontSize: 15, fontWeight: '600', color: COLORS.darkText },
  addMediaSub: { fontSize: 12, color: COLORS.muted },

  mediaGrid: { marginBottom: 20 },
  mediaCountText: {
    fontSize: 13, color: COLORS.muted, marginBottom: 10, fontWeight: '500',
  },
  mediaThumb: {
    width: 100, height: 100, borderRadius: 12,
    overflow: 'hidden', position: 'relative',
    backgroundColor: COLORS.warmBg,
  },
  thumbImg: { width: '100%', height: '100%' },
  videoThumb: {
    width: '100%', height: '100%',
    backgroundColor: '#2C2418', justifyContent: 'center',
    alignItems: 'center', gap: 4,
  },
  videoLabel: { color: COLORS.white, fontSize: 11, fontWeight: '600' },
  primaryBadge: {
    position: 'absolute', top: 6, left: 6,
    backgroundColor: COLORS.saffron, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  primaryBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: 'bold' },
  removeBtn: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: COLORS.white, borderRadius: 11,
  },

  label: { fontSize: 14, fontWeight: '600', color: COLORS.darkText, marginBottom: 8 },
  required: { color: COLORS.saffron },
  input: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 14,
    fontSize: 15, color: COLORS.darkText, marginBottom: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  textArea: { height: 100 },
  categorySelector: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  progressBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.warmBg, borderRadius: 10,
    padding: 12, marginBottom: 16,
  },
  progressText: { fontSize: 13, color: COLORS.darkText, flex: 1 },
  uploadBtn: {
    backgroundColor: COLORS.saffron, padding: 16,
    borderRadius: 12, alignItems: 'center', marginTop: 8,
  },
  uploadBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  uploadBtnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '70%', paddingBottom: 40,
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