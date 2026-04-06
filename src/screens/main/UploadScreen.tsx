import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator,
  Alert, Image, Modal, FlatList, Dimensions,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import firestore from '@react-native-firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LanguageContext';
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
  const { colors } = useTheme();
  const { t } = useLang();
  const { user } = useAuthStore();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [techniques, setTechniques] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const pickMedia = async () => {
    if (mediaItems.length >= 10) { Alert.alert('Limit', 'Maximum 10 media items allowed'); return; }
    const result = await launchImageLibrary({ mediaType: 'mixed', quality: 0.9, selectionLimit: 10 - mediaItems.length });
    if (result.assets && result.assets.length > 0) {
      const newItems: MediaItem[] = result.assets.map(asset => ({
        uri: asset.uri || '', type: asset.type?.startsWith('video') ? 'video' : 'image', name: asset.fileName || `media_${Date.now()}`,
      }));
      setMediaItems(prev => [...prev, ...newItems]);
    }
  };

  const removeMedia = (index: number) => setMediaItems(prev => prev.filter((_, i) => i !== index));

  const handlePost = async () => {
    if (mediaItems.length === 0) { Alert.alert('Error', 'Please select at least one image or video'); return; }
    if (!title.trim()) { Alert.alert('Error', 'Please add a title'); return; }
    if (!category) { Alert.alert('Error', 'Please select a category'); return; }

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
        userId: user?.uid, imageUrl: uploadedUrls[0].url, mediaItems: uploadedUrls,
        title: title.trim(), caption: description.trim(), techniques: techniques.trim(), category,
        likes: [], bookmarks: [], commentCount: 0, createdAt: firestore.FieldValue.serverTimestamp(),
      });
      setUploadProgress('');
      Alert.alert('Success', 'Artwork posted successfully!', [{
        text: 'View Feed', onPress: () => { setMediaItems([]); setTitle(''); setDescription(''); setTechniques(''); setCategory(''); navigation.navigate('Home'); },
      }]);
    } catch (e: any) {
      setUploadProgress('');
      Alert.alert('Error', e.message || 'Failed to post artwork');
    } finally { setLoading(false); }
  };

  const renderMediaItem = ({ item, index }: { item: MediaItem; index: number }) => (
    <View style={styles.mediaThumb}>
      {item.type === 'video' ? (
        <View style={styles.videoThumb}>
          <Ionicons name="play-circle" size={32} color="#fff" />
          <Text style={styles.videoLabel}>Video</Text>
        </View>
      ) : (
        <Image source={{ uri: item.uri }} style={styles.thumbImg} resizeMode="cover" />
      )}
      {index === 0 && (
        <View style={[styles.primaryBadge, { backgroundColor: colors.saffron }]}>
          <Text style={styles.primaryBadgeText}>Main</Text>
        </View>
      )}
      <TouchableOpacity style={styles.removeBtn} onPress={() => removeMedia(index)}>
        <Ionicons name="close-circle" size={22} color="#FF4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.offwhite }]} showsVerticalScrollIndicator={false}>

      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.darkText} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.darkText }]}>{t.upload}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.form}>
        <TouchableOpacity style={[styles.addMediaBtn, { borderColor: colors.saffron }]} onPress={pickMedia} activeOpacity={0.85}>
          <View style={[styles.addMediaInner, { backgroundColor: colors.warmBg }]}>
            <View style={[styles.imageIconCircle, { backgroundColor: colors.offwhite }]}>
              <Ionicons name="cloud-upload-outline" size={32} color={colors.saffron} />
            </View>
            <Text style={[styles.addMediaText, { color: colors.darkText }]}>
              {mediaItems.length > 0 ? `Add more (${mediaItems.length}/10)` : 'Click to upload artwork'}
            </Text>
            <Text style={[styles.addMediaSub, { color: colors.muted }]}>PNG, JPG, MP4 — up to 10 files</Text>
          </View>
        </TouchableOpacity>

        {mediaItems.length > 0 && (
          <View style={styles.mediaGrid}>
            <Text style={[styles.mediaCountText, { color: colors.muted }]}>{mediaItems.length} item{mediaItems.length > 1 ? 's' : ''} selected</Text>
            <FlatList data={mediaItems} horizontal keyExtractor={(_, i) => i.toString()} renderItem={renderMediaItem} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }} />
          </View>
        )}

        <Text style={[styles.label, { color: colors.darkText }]}>Title <Text style={{ color: colors.saffron }}>*</Text></Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.darkText, borderColor: colors.border }]}
          value={title} onChangeText={setTitle} placeholder="Give your artwork a title" placeholderTextColor={colors.muted} maxLength={100}
        />

        <Text style={[styles.label, { color: colors.darkText }]}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.darkText, borderColor: colors.border }]}
          value={description} onChangeText={setDescription} placeholder="Describe your artwork..." placeholderTextColor={colors.muted}
          multiline numberOfLines={4} textAlignVertical="top" maxLength={500}
        />

        <Text style={[styles.label, { color: colors.darkText }]}>Techniques Used</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.darkText, borderColor: colors.border }]}
          value={techniques} onChangeText={setTechniques} placeholder="e.g. Hand woven, Natural dyes..." placeholderTextColor={colors.muted}
          multiline numberOfLines={3} textAlignVertical="top" maxLength={300}
        />

        <Text style={[styles.label, { color: colors.darkText }]}>{t.category} <Text style={{ color: colors.saffron }}>*</Text></Text>
        <TouchableOpacity
          style={[styles.input, styles.categorySelector, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowCategoryModal(true)}>
          <Text style={{ color: category ? colors.darkText : colors.muted, fontSize: 15 }}>
            {category || 'Select folk art category...'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.muted} />
        </TouchableOpacity>

        {loading && (
          <View style={[styles.progressBanner, { backgroundColor: colors.warmBg }]}>
            <ActivityIndicator size="small" color={colors.saffron} />
            <Text style={[styles.progressText, { color: colors.darkText }]}>{uploadProgress}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.uploadBtn, { backgroundColor: colors.saffron }, loading && { opacity: 0.6 }]}
          onPress={handlePost} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <View style={styles.uploadBtnInner}>
              <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
              <Text style={styles.uploadBtnText}>Share Artwork</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={showCategoryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.darkText }]}>{t.category}</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color={colors.darkText} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {FOLK_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryItem, { borderBottomColor: colors.border }, category === cat && { backgroundColor: colors.warmBg }]}
                  onPress={() => { setCategory(cat); setShowCategoryModal(false); }}>
                  <Text style={[styles.categoryItemText, { color: colors.darkText }, category === cat && { color: colors.saffron, fontWeight: '600' }]}>{cat}</Text>
                  {category === cat && <Ionicons name="checkmark" size={18} color={colors.saffron} />}
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
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, borderBottomWidth: 0.5 },
  title: { fontSize: 18, fontWeight: 'bold' },
  form: { padding: 20 },
  addMediaBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1.5, borderStyle: 'dashed' },
  addMediaInner: { height: 160, justifyContent: 'center', alignItems: 'center', gap: 10 },
  imageIconCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  addMediaText: { fontSize: 15, fontWeight: '600' },
  addMediaSub: { fontSize: 12 },
  mediaGrid: { marginBottom: 20 },
  mediaCountText: { fontSize: 13, marginBottom: 10, fontWeight: '500' },
  mediaThumb: { width: 100, height: 100, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  thumbImg: { width: '100%', height: '100%' },
  videoThumb: { width: '100%', height: '100%', backgroundColor: '#2C2418', justifyContent: 'center', alignItems: 'center', gap: 4 },
  videoLabel: { color: '#fff', fontSize: 11, fontWeight: '600' },
  primaryBadge: { position: 'absolute', top: 6, left: 6, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  primaryBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  removeBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: '#fff', borderRadius: 11 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 20, borderWidth: 1 },
  textArea: { height: 100 },
  categorySelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: 12, marginBottom: 16 },
  progressText: { fontSize: 13, flex: 1 },
  uploadBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  uploadBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  uploadBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 0.5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  categoryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5 },
  categoryItemText: { fontSize: 15 },
});