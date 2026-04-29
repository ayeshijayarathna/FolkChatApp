import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Alert, ActivityIndicator, Dimensions, Platform,
  StatusBar, Animated, TextInput, PanResponder, ScrollView,
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import Video from 'react-native-video';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { uploadToCloudinary } from '../../services/cloudinary.service';

const { width, height } = Dimensions.get('window');
const PREVIEW_HEIGHT = height * 0.58;

const TEXT_COLORS = [
  '#FFFFFF', '#000000', '#FF4444', '#FF9800',
  '#FFD700', '#4CAF50', '#2196F3', '#9C27B0',
  '#FF69B4', '#00BCD4', '#FF5722', '#8BC34A',
];

export default function AddStoryScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { user, userProfile } = useAuthStore();

  const [selectedMedia, setSelectedMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [showCaption, setShowCaption] = useState(false);
  const [captionColor, setCaptionColor] = useState('#FFFFFF');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);

  // draggable caption position
  const captionPos = useRef(new Animated.ValueXY({ x: 0, y: PREVIEW_HEIGHT * 0.35 })).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const bgGradient: [string, string, string, string] = isDark
    ? ['#1A1008', '#2A1C0E', '#3A2814', '#4A341C']
    : ['#FFC58A', '#FFD9A8', '#FFEAC8', '#FFF6E5'];

  //panresponder for caption draging
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        captionPos.extractOffset();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: captionPos.x, dy: captionPos.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        captionPos.flattenOffset();
      },
    })
  ).current;

  const openGallery = () => {
    launchImageLibrary(
      { mediaType: 'mixed', quality: 1, videoQuality: 'medium', selectionLimit: 1 },
      (response) => {
        if (response.didCancel || response.errorCode) return;
        const asset = response.assets?.[0];
        if (!asset?.uri) return;
        const type = asset.type?.startsWith('video') ? 'video' : 'image';
        setSelectedMedia({ uri: asset.uri, type });
        captionPos.setValue({ x: 0, y: PREVIEW_HEIGHT * 0.35 });
      }
    );
  };

  const openCamera = () => {
    launchCamera(
      { mediaType: 'mixed', quality: 1, saveToPhotos: false },
      (response) => {
        if (response.didCancel || response.errorCode) return;
        const asset = response.assets?.[0];
        if (!asset?.uri) return;
        const type = asset.type?.startsWith('video') ? 'video' : 'image';
        setSelectedMedia({ uri: asset.uri, type });
        captionPos.setValue({ x: 0, y: PREVIEW_HEIGHT * 0.35 });
      }
    );
  };

  const handlePost = async () => {
    if (!selectedMedia || !user?.uid) return;
    setUploading(true);
    progressAnim.setValue(0);

    Animated.timing(progressAnim, {
      toValue: 0.85,
      duration: 5000,
      useNativeDriver: false,
    }).start();

    try {
      const mediaUrl = await uploadToCloudinary(selectedMedia.uri, selectedMedia.type);

      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();

      const posValue: { x: number; y: number } = await new Promise(resolve => {
        captionPos.stopAnimation((v: any) => resolve(v));
      });
  
      const hasCaption = !!caption.trim();
      const captionXFrac = hasCaption ? (posValue.x + width / 2) / width : null;
      const captionYFrac = hasCaption ? posValue.y / PREVIEW_HEIGHT : null;

      await firestore().collection('stories').add({
        userId: user.uid,
        userName: userProfile?.name || 'Artist',
        userAvatar: userProfile?.avatarUrl || '',
        mediaUrl,
        mediaType: selectedMedia.type,
        caption: caption.trim() || null,
        captionColor: hasCaption ? captionColor : null,
        captionXFrac,
        captionYFrac,
        viewedBy: [],
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      setUploading(false);
      Alert.alert('✓ Successful', 'Your story has been shared!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.message || 'Please try again.');
      progressAnim.setValue(0);
      setUploading(false);
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 24) + 10;

  return (
    <LinearGradient colors={bgGradient} locations={[0, 0.3, 0.7, 1]} style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: STATUSBAR_HEIGHT }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.iconBtn, { backgroundColor: `${colors.saffron}18`, borderColor: `${colors.saffron}35` }]}
        >
          <Ionicons name="close" size={22} color={colors.darkText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.darkText }]}>Add Story</Text>
        {selectedMedia ? (
          <TouchableOpacity
            onPress={handlePost}
            disabled={uploading}
            style={[styles.shareBtn, { backgroundColor: uploading ? `${colors.saffron}80` : colors.saffron }]}
          >
            {uploading
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                  <Ionicons name="paper-plane" size={15} color="#fff" />
                  <Text style={styles.shareBtnTxt}>Share</Text>
                </>
            }
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {/*progress bar */}
      {uploading && (
        <View style={[styles.progressTrack, { backgroundColor: `${colors.saffron}25` }]}>
          <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: colors.saffron }]} />
        </View>
      )}

      {/*preview*/}
      <View style={[styles.previewWrap, { height: PREVIEW_HEIGHT }]}>
        {selectedMedia ? (
          <View style={[styles.previewCard, { borderColor: `${colors.saffron}30` }]}>

            {/* media */}
            {selectedMedia.type === 'video'
              ? <Video source={{ uri: selectedMedia.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" repeat muted paused={false} />
              : <Image source={{ uri: selectedMedia.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            }

            {/* bottom scrim */}
            <View style={styles.scrim} pointerEvents="none" />

            {showCaption && caption.length > 0 && !editingCaption && (
              <Animated.View
                style={[styles.captionDraggable, { transform: captionPos.getTranslateTransform() }]}
                {...panResponder.panHandlers}
              >
                <Text style={[styles.captionDragTxt, { color: captionColor }]}>{caption}</Text>
                <View style={styles.dragHintRow}>
                  <Ionicons name="move" size={9} color="rgba(255,255,255,0.55)" />
                  <Text style={styles.dragHintTxt}>drag</Text>
                </View>
              </Animated.View>
            )}

            {/* caption editing input */}
            {editingCaption && (
              <View style={styles.captionEditOverlay} pointerEvents="box-none">
                <View style={[styles.captionEditBox, { borderColor: `${captionColor}70` }]}>
                  <TextInput
                    style={[styles.captionEditInput, { color: captionColor }]}
                    placeholder="Type your caption…"
                    placeholderTextColor="rgba(255,255,255,0.45)"
                    value={caption}
                    onChangeText={setCaption}
                    maxLength={100}
                    multiline
                    autoFocus
                    blurOnSubmit
                    onBlur={() => {
                      setEditingCaption(false);
                      if (caption.trim()) setShowCaption(true);
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => { setEditingCaption(false); if (caption.trim()) setShowCaption(true); }}
                    style={styles.captionDoneBtn}
                  >
                    <Text style={[styles.captionDoneTxt, { color: colors.saffron }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                {/* inline color row while editing */}
                <View style={styles.colorRowInline}>
                  {TEXT_COLORS.map(c => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setCaptionColor(c)}
                      style={[
                        styles.colorDot,
                        {
                          backgroundColor: c,
                          borderWidth: captionColor === c ? 3 : 1.5,
                          borderColor: captionColor === c ? '#fff' : 'rgba(255,255,255,0.4)',
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Video badge */}
            {selectedMedia.type === 'video' && (
              <View style={[styles.typeBadge, { backgroundColor: `${colors.saffron}CC` }]}>
                <Ionicons name="play" size={9} color="#fff" />
                <Text style={styles.typeBadgeTxt}>VIDEO</Text>
              </View>
            )}

            <View style={styles.pillRow}>
              <TouchableOpacity
                style={[styles.pill, {
                  backgroundColor: showCaption ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.52)',
                  borderColor: 'rgba(255,255,255,0.22)',
                }]}
                onPress={() => { setShowCaption(true); setEditingCaption(true); }}
              >
                <Ionicons name="text" size={13} color="#fff" />
                <Text style={styles.pillTxt}>{showCaption && caption ? 'Edit Text' : 'Add Text'}</Text>
              </TouchableOpacity>

              {showCaption && caption.length > 0 && (
                <TouchableOpacity
                  style={[styles.pill, { backgroundColor: 'rgba(0,0,0,0.52)', borderColor: 'rgba(255,255,255,0.22)' }]}
                  onPress={() => setShowColorPicker(v => !v)}
                >
                  <View style={[styles.colorPreviewDot, { backgroundColor: captionColor }]} />
                  <Text style={styles.pillTxt}>Color</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.pill, { backgroundColor: 'rgba(0,0,0,0.52)', borderColor: 'rgba(255,100,100,0.35)' }]}
                onPress={() => {
                  setSelectedMedia(null);
                  setCaption('');
                  setShowCaption(false);
                  setEditingCaption(false);
                }}
              >
                <Ionicons name="trash-outline" size={13} color="#FF7777" />
                <Text style={[styles.pillTxt, { color: '#FF8888' }]}>Remove</Text>
              </TouchableOpacity>
            </View>

            {showColorPicker && showCaption && !editingCaption && (
              <View style={styles.colorBarFloat}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 12, gap: 10, alignItems: 'center' }}
                >
                  {TEXT_COLORS.map(c => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => { setCaptionColor(c); setShowColorPicker(false); }}
                      style={[
                        styles.colorDot,
                        {
                          backgroundColor: c,
                          borderWidth: captionColor === c ? 3 : 1.5,
                          borderColor: captionColor === c ? '#fff' : 'rgba(255,255,255,0.5)',
                        },
                      ]}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.emptyCard, { borderColor: `${colors.saffron}40`, backgroundColor: `${colors.saffron}08` }]}>
            <LinearGradient colors={[`${colors.saffron}28`, `${colors.saffron}06`]} style={styles.emptyIconBg}>
              <Ionicons name="images-outline" size={48} color={colors.saffron} />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: colors.darkText }]}>Share a Moment</Text>
            <Text style={[styles.emptySub, { color: colors.muted }]}>Your story disappears after 24 hours</Text>
            <View style={[styles.emptyLine, { backgroundColor: `${colors.saffron}35` }]} />
            <Text style={[styles.emptyHint, { color: colors.muted }]}>
              Choose a photo or video from your gallery,{'\n'}or capture something right now
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.bottomArea, { paddingBottom: Platform.OS === 'ios' ? 30 : 16 }]}>
        <View style={styles.btnRow}>

          <TouchableOpacity
            style={[styles.mediaBtn, { backgroundColor: colors.card, borderColor: `${colors.saffron}45` }]}
            onPress={openGallery}
            activeOpacity={0.82}
          >
            <Text style={[styles.mediaBtnLabel, { color: colors.darkText }]}>Choose from Gallery</Text>
          </TouchableOpacity>

          <View style={{ width: 10 }} />

          <TouchableOpacity
            style={[styles.mediaBtn, { backgroundColor: colors.card, borderColor: `${colors.saffron}45` }]}
            onPress={openCamera}
            activeOpacity={0.82}
          >
            <Text style={[styles.mediaBtnLabel, { color: colors.darkText }]}>Take a Photo / Video</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.tipBox, { backgroundColor: `${colors.saffron}12`, borderColor: `${colors.saffron}30` }]}>
          <Ionicons name="time-outline" size={13} color={colors.saffron} />
          <Text style={[styles.tipTxt, { color: colors.muted }]}>Stories are visible to your followers for 24 hours</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root:             { flex: 1 },

  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  headerTitle:      { fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
  iconBtn:          { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  shareBtn:         { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 22 },
  shareBtnTxt:      { color: '#fff', fontWeight: '800', fontSize: 14 },

  progressTrack:    { height: 3, marginHorizontal: 16, marginBottom: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill:     { height: '100%', borderRadius: 2 },

  previewWrap:      { marginHorizontal: 14, borderRadius: 24, overflow: 'hidden' },
  previewCard:      { flex: 1, borderRadius: 24, overflow: 'hidden', borderWidth: 1, backgroundColor: '#111' },
  scrim:            { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, backgroundColor: 'rgba(0,0,0,0.3)' },

  captionDraggable: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  captionDragTxt:   {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    paddingHorizontal: 16,
  },
  dragHintRow:      { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3, justifyContent: 'center' },
  dragHintTxt:      { color: 'rgba(255,255,255,0.55)', fontSize: 9 },

  captionEditOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.38)' },
  captionEditBox:     { width: width - 56, backgroundColor: 'rgba(0,0,0,0.68)', borderRadius: 16, borderWidth: 1.5, padding: 14 },
  captionEditInput:   { fontSize: 17, fontWeight: '700', minHeight: 44, maxHeight: 100, textAlign: 'center' },
  captionDoneBtn:     { alignSelf: 'flex-end', marginTop: 8 },
  captionDoneTxt:     { fontWeight: '800', fontSize: 14 },
  colorRowInline:     { flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' },

  typeBadge:        { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeTxt:     { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  pillRow:          { position: 'absolute', bottom: 12, left: 10, right: 10, flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill:             { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1 },
  pillTxt:          { color: '#fff', fontSize: 12, fontWeight: '700' },
  colorPreviewDot:  { width: 13, height: 13, borderRadius: 7, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
  colorBarFloat:    { position: 'absolute', bottom: 52, left: 0, right: 0, height: 50, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'center' },
  colorDot:         { width: 26, height: 26, borderRadius: 13 },

  emptyCard:        { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 24, paddingHorizontal: 30 },
  emptyIconBg:      { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle:       { fontSize: 20, fontWeight: '800' },
  emptySub:         { fontSize: 13, textAlign: 'center' },
  emptyLine:        { width: 36, height: 1.5, borderRadius: 1, marginVertical: 4 },
  emptyHint:        { fontSize: 12, textAlign: 'center', lineHeight: 18 },

  bottomArea:       { paddingHorizontal: 14, paddingTop: 12, gap: 10 },
  btnRow:           { flexDirection: 'row' },

  mediaBtn:         {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  mediaBtnLabel:    { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  tipBox:           { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
  tipTxt:           { fontSize: 12, flex: 1, lineHeight: 17 },
});