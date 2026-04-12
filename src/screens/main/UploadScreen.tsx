import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator,
  Alert, Image, Modal, FlatList, Dimensions, Platform,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import firestore from '@react-native-firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LanguageContext';
import { useAuthStore } from '../../store/authStore';
import { uploadToCloudinary } from '../../services/cloudinary.service';
import { FOLK_CATEGORIES } from '../../constants/categories';

const { width } = Dimensions.get('window');

const EVENT_CATEGORIES = ['Exhibition', 'Workshop', 'Festival', 'Concert', 'Cultural', 'Competition', 'Craft Fair', 'Other'];

interface MediaItem { uri: string; type: 'image' | 'video'; name: string; }

//post Upload 
function PostUpload({ navigation, colors, t }: any) {
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
    if (mediaItems.length >= 10) { Alert.alert('Limit', 'Maximum 10 items allowed'); return; }
    const result = await launchImageLibrary({ mediaType: 'mixed', quality: 0.9, selectionLimit: 10 - mediaItems.length });
    if (result.assets?.length) {
      setMediaItems(prev => [...prev, ...result.assets!.map(a => ({
        uri: a.uri || '', type: a.type?.startsWith('video') ? 'video' as const : 'image' as const, name: a.fileName || `media_${Date.now()}`,
      }))]);
    }
  };

  const handlePost = async () => {
    if (!mediaItems.length) { Alert.alert('Error', 'Please select at least one image or video'); return; }
    if (!title.trim()) { Alert.alert('Error', 'Please add a title'); return; }
    if (!category) { Alert.alert('Error', 'Please select a category'); return; }
    setLoading(true);
    try {
      const uploaded: { url: string; type: 'image' | 'video' }[] = [];
      for (let i = 0; i < mediaItems.length; i++) {
        setUploadProgress(`Uploading ${i + 1} of ${mediaItems.length}...`);
        uploaded.push({ url: await uploadToCloudinary(mediaItems[i].uri, mediaItems[i].type), type: mediaItems[i].type });
      }
      setUploadProgress('Saving post...');
      await firestore().collection('posts').add({
        userId: user?.uid, imageUrl: uploaded[0].url, mediaItems: uploaded,
        title: title.trim(), caption: description.trim(), techniques: techniques.trim(), category,
        likes: [], bookmarks: [], commentCount: 0, viewCount: 0,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      setUploadProgress('');
      Alert.alert('Posted!', 'Your artwork is live!', [{
        text: 'View Feed', onPress: () => { setMediaItems([]); setTitle(''); setDescription(''); setTechniques(''); setCategory(''); navigation.navigate('Home'); },
      }]);
    } catch (e: any) {
      setUploadProgress('');
      Alert.alert('Error', e.message || 'Failed to post');
    } finally { setLoading(false); }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
      {/* media picker */}
      <TouchableOpacity style={[styles.mediaPickerArea, { borderColor: colors.saffron }]} onPress={pickMedia} activeOpacity={0.85}>
        <View style={[styles.mediaPickerInner, { backgroundColor: colors.warmBg }]}>
          <View style={[styles.uploadCircle, { backgroundColor: colors.offwhite }]}>
            <Ionicons name="cloud-upload-outline" size={32} color={colors.saffron} />
          </View>
          <Text style={[styles.mediaPickerTitle, { color: colors.darkText }]}>
            {mediaItems.length > 0 ? `Add more (${mediaItems.length}/10)` : 'Upload Artwork'}
          </Text>
          <Text style={[styles.mediaPickerSub, { color: colors.muted }]}>PNG, JPG, MP4 · up to 10 files</Text>
        </View>
      </TouchableOpacity>

      {/* Thumbnails */}
      {mediaItems.length > 0 && (
        <View style={styles.thumbSection}>
          <Text style={[styles.thumbCount, { color: colors.muted }]}>{mediaItems.length} item{mediaItems.length > 1 ? 's' : ''} selected</Text>
          <FlatList
            data={mediaItems} horizontal keyExtractor={(_, i) => String(i)}
            showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}
            renderItem={({ item, index }) => (
              <View style={styles.thumb}>
                {item.type === 'video'
                  ? <View style={styles.videoThumb}><Ionicons name="play-circle" size={28} color="#fff" /></View>
                  : <Image source={{ uri: item.uri }} style={styles.thumbImg} resizeMode="cover" />
                }
                {index === 0 && <View style={[styles.mainBadge, { backgroundColor: colors.saffron }]}><Text style={styles.mainBadgeTxt}>Main</Text></View>}
                <TouchableOpacity style={styles.removeThumb} onPress={() => setMediaItems(prev => prev.filter((_, i) => i !== index))}>
                  <Ionicons name="close-circle" size={20} color="#FF4444" />
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      )}

      {/* Fields */}
      <Text style={[styles.label, { color: colors.darkText }]}>Title <Text style={{ color: colors.saffron }}>*</Text></Text>
      <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.darkText, borderColor: colors.border }]}
        value={title} onChangeText={setTitle} placeholder="Give your artwork a title" placeholderTextColor={colors.muted} maxLength={100} />

      <Text style={[styles.label, { color: colors.darkText }]}>Description</Text>
      <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.darkText, borderColor: colors.border }]}
        value={description} onChangeText={setDescription} placeholder="Describe your artwork..." placeholderTextColor={colors.muted}
        multiline numberOfLines={4} textAlignVertical="top" maxLength={500} />

      <Text style={[styles.label, { color: colors.darkText }]}>Techniques</Text>
      <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.darkText, borderColor: colors.border }]}
        value={techniques} onChangeText={setTechniques} placeholder="e.g. Hand woven, Natural dyes..." placeholderTextColor={colors.muted} maxLength={300} />

      <Text style={[styles.label, { color: colors.darkText }]}>Category <Text style={{ color: colors.saffron }}>*</Text></Text>
      <TouchableOpacity style={[styles.input, styles.selector, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setShowCategoryModal(true)}>
        <Text style={{ color: category ? colors.darkText : colors.muted, fontSize: 15 }}>{category || 'Select category...'}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </TouchableOpacity>

      {loading && uploadProgress && (
        <View style={[styles.progressBar, { backgroundColor: colors.warmBg }]}>
          <ActivityIndicator size="small" color={colors.saffron} />
          <Text style={[styles.progressTxt, { color: colors.darkText }]}>{uploadProgress}</Text>
        </View>
      )}

      <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.saffron }, loading && { opacity: 0.6 }]}
        onPress={handlePost} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : (
          <View style={styles.submitBtnInner}>
            <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
            <Text style={styles.submitBtnTxt}>Share Artwork</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Category Modal */}
      <Modal visible={showCategoryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.darkText }]}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color={colors.darkText} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {FOLK_CATEGORIES.map(cat => (
                <TouchableOpacity key={cat} style={[styles.modalItem, { borderBottomColor: colors.border }, category === cat && { backgroundColor: colors.warmBg }]}
                  onPress={() => { setCategory(cat); setShowCategoryModal(false); }}>
                  <Text style={[styles.modalItemTxt, { color: colors.darkText }, category === cat && { color: colors.saffron, fontWeight: '600' }]}>{cat}</Text>
                  {category === cat && <Ionicons name="checkmark" size={18} color={colors.saffron} />}
                </TouchableOpacity>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

//event Upload
function EventUpload({ navigation, colors, t }: any) {
  const { user, userProfile } = useAuthStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const pickImage = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.assets?.[0]?.uri) setImageUri(result.assets[0].uri);
  };

  const handleCreateEvent = async () => {
    if (!title.trim()) { Alert.alert('Error', 'Please add a title'); return; }
    if (!category) { Alert.alert('Error', 'Please select a category'); return; }
    if (!location.trim()) { Alert.alert('Error', 'Please add a location'); return; }
    setLoading(true);
    try {
      let imageUrl = '';
      if (imageUri) imageUrl = await uploadToCloudinary(imageUri, 'image');
      await firestore().collection('events').add({
        userId: user?.uid,
        userName: userProfile?.name || '',
        userAvatar: userProfile?.avatarUrl || '',
        title: title.trim(), description: description.trim(),
        location: location.trim(), category,
        date: firestore.Timestamp.fromDate(date),
        imageUrl, interestedUsers: [],
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      Alert.alert('Event Created!', 'Your event is now visible to everyone.', [{
        text: 'OK', onPress: () => { setTitle(''); setDescription(''); setLocation(''); setCategory(''); setDate(new Date()); setImageUri(null); navigation.navigate('Home'); },
      }]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create event');
    } finally { setLoading(false); }
  };

  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const formatTimeDisplay = (d: Date) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
      {/* Event image */}
      <TouchableOpacity style={[styles.eventImgPicker, { borderColor: colors.saffron, backgroundColor: colors.warmBg }]} onPress={pickImage}>
        {imageUri
          ? <Image source={{ uri: imageUri }} style={styles.eventImgPreview} />
          : <View style={styles.eventImgPlaceholder}>
              <Ionicons name="image-outline" size={32} color={colors.saffron} />
              <Text style={[styles.mediaPickerSub, { color: colors.muted }]}>Add event banner (optional)</Text>
            </View>
        }
        {imageUri && (
          <TouchableOpacity style={styles.removeEventImg} onPress={() => setImageUri(null)}>
            <Ionicons name="close-circle" size={24} color="#FF4444" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Title */}
      <Text style={[styles.label, { color: colors.darkText }]}>Event Title <Text style={{ color: colors.saffron }}>*</Text></Text>
      <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.darkText, borderColor: colors.border }]}
        value={title} onChangeText={setTitle} placeholder="e.g. Batik Exhibition 2025" placeholderTextColor={colors.muted} maxLength={100} />

      {/* Category */}
      <Text style={[styles.label, { color: colors.darkText }]}>Category <Text style={{ color: colors.saffron }}>*</Text></Text>
      <TouchableOpacity style={[styles.input, styles.selector, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setShowCategoryModal(true)}>
        <Text style={{ color: category ? colors.darkText : colors.muted, fontSize: 15 }}>{category || 'Select event type...'}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </TouchableOpacity>

      {/* Date */}
      <Text style={[styles.label, { color: colors.darkText }]}>Date <Text style={{ color: colors.saffron }}>*</Text></Text>
      <TouchableOpacity style={[styles.input, styles.selector, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setShowDatePicker(true)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="calendar-outline" size={18} color={colors.saffron} />
          <Text style={{ color: colors.darkText, fontSize: 15 }}>{formatDate(date)}</Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </TouchableOpacity>

      {/* Time */}
      <Text style={[styles.label, { color: colors.darkText }]}>Time</Text>
      <TouchableOpacity style={[styles.input, styles.selector, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setShowTimePicker(true)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="time-outline" size={18} color={colors.saffron} />
          <Text style={{ color: colors.darkText, fontSize: 15 }}>{formatTimeDisplay(date)}</Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker value={date} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={(_, d) => { setShowDatePicker(false); if (d) setDate(prev => { const nd = new Date(d); nd.setHours(prev.getHours(), prev.getMinutes()); return nd; }); }} />
      )}
      {showTimePicker && (
        <DateTimePicker value={date} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => { setShowTimePicker(false); if (d) setDate(prev => { const nd = new Date(prev); nd.setHours(d.getHours(), d.getMinutes()); return nd; }); }} />
      )}

      {/* Location */}
      <Text style={[styles.label, { color: colors.darkText }]}>Location <Text style={{ color: colors.saffron }}>*</Text></Text>
      <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.darkText, borderColor: colors.border }]}
        value={location} onChangeText={setLocation} placeholder="e.g. Colombo National Museum" placeholderTextColor={colors.muted} />

      {/* description */}
      <Text style={[styles.label, { color: colors.darkText }]}>Description</Text>
      <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.darkText, borderColor: colors.border }]}
        value={description} onChangeText={setDescription} placeholder="Tell people what this event is about..."
        placeholderTextColor={colors.muted} multiline numberOfLines={4} textAlignVertical="top" maxLength={500} />

      <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.saffron }, loading && { opacity: 0.6 }]}
        onPress={handleCreateEvent} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : (
          <View style={styles.submitBtnInner}>
            <Ionicons name="calendar-outline" size={20} color="#fff" />
            <Text style={styles.submitBtnTxt}>Create Event</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Category Modal */}
      <Modal visible={showCategoryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.darkText }]}>Event Type</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color={colors.darkText} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {EVENT_CATEGORIES.map(cat => (
                <TouchableOpacity key={cat} style={[styles.modalItem, { borderBottomColor: colors.border }, category === cat && { backgroundColor: colors.warmBg }]}
                  onPress={() => { setCategory(cat); setShowCategoryModal(false); }}>
                  <Text style={[styles.modalItemTxt, { color: colors.darkText }, category === cat && { color: colors.saffron, fontWeight: '600' }]}>{cat}</Text>
                  {category === cat && <Ionicons name="checkmark" size={18} color={colors.saffron} />}
                </TouchableOpacity>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// main uplaod scren
export default function UploadScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState<'post' | 'event'>('post');

  return (
    <View style={[styles.container, { backgroundColor: colors.offwhite }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.darkText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.darkText }]}>
          {activeTab === 'post' ? 'Upload Artwork' : 'Create Event'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab switcher */}
      <View style={[styles.tabRow, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        {(['post', 'event'] as const).map(tab => (
          <TouchableOpacity key={tab}
            style={[styles.tabBtn, activeTab === tab && [styles.tabBtnActive, { borderBottomColor: colors.saffron }]]}
            onPress={() => setActiveTab(tab)}>
            <Ionicons name={tab === 'post' ? 'images-outline' : 'calendar-outline'} size={16} color={activeTab === tab ? colors.saffron : colors.muted} />
            <Text style={[styles.tabBtnTxt, { color: activeTab === tab ? colors.saffron : colors.muted }]}>
              {tab === 'post' ? 'Post' : 'Event'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'post'
        ? <PostUpload navigation={navigation} colors={colors} t={t} />
        : <EventUpload navigation={navigation} colors={colors} t={t} />
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 0.5 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  tabBtnActive: { borderBottomWidth: 2 },
  tabBtnTxt: { fontSize: 14, fontWeight: '600' },
  formScroll: { padding: 20, paddingBottom: 40 },
  mediaPickerArea: { borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1.5, borderStyle: 'dashed' },
  mediaPickerInner: { height: 150, justifyContent: 'center', alignItems: 'center', gap: 10 },
  uploadCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  mediaPickerTitle: { fontSize: 15, fontWeight: '600' },
  mediaPickerSub: { fontSize: 12 },
  thumbSection: { marginBottom: 20 },
  thumbCount: { fontSize: 13, fontWeight: '500', marginBottom: 10 },
  thumb: { width: 90, height: 90, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  thumbImg: { width: '100%', height: '100%' },
  videoThumb: { width: '100%', height: '100%', backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
  mainBadge: { position: 'absolute', top: 4, left: 4, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  mainBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  removeThumb: { position: 'absolute', top: 2, right: 2, backgroundColor: '#fff', borderRadius: 10 },
  eventImgPicker: { height: 160, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', overflow: 'hidden', marginBottom: 20, position: 'relative' },
  eventImgPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  eventImgPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  removeEventImg: { position: 'absolute', top: 8, right: 8, backgroundColor: '#fff', borderRadius: 12 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 20, borderWidth: 1 },
  textArea: { height: 100 },
  selector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: 12, marginBottom: 16 },
  progressTxt: { fontSize: 13 },
  submitBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  submitBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitBtnTxt: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 0.5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5 },
  modalItemTxt: { fontSize: 15 },
});