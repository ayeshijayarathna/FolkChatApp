import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Image, TextInput, KeyboardAvoidingView,
  Platform, Alert, Modal, Pressable, ActivityIndicator,
  Dimensions, PermissionsAndroid, ImageBackground, Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { uploadToCloudinary } from '../../services/cloudinary.service';

const { width: SW, height: SH } = Dimensions.get('window');

interface Message {
  id: string;
  senderId: string;
  text: string;
  type: 'text' | 'image';
  imageUrl?: string;
  createdAt: any;
  edited: boolean;
  deletedFor: string[];
  senderName?: string;
  senderAvatar?: string;
}

function initials(name: string) { return (name || 'A').charAt(0).toUpperCase(); }
function fmtTime(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
function fmtDateHeader(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const today = new Date();
  const yest = new Date(today); yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}
function fmtLastSeen(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'Active just now';
  if (diff < 3600) return `Active ${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `Active ${Math.floor(diff / 3600)}h ago`;
  return `Last seen ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}
function getChatId(a: string, b: string) { return [a, b].sort().join('_'); }

const BG_MAP: Record<string, string> = {
  default: 'transparent', dark: '#1a1a2e', ocean: '#dbeeff',
  forest: '#dff2e1', sunset: '#fff0e0', lavender: '#f0e5f5',
};

function ImageViewer({ uri, visible, onClose }: { uri: string; visible: boolean; onClose: () => void }) {
  const downloadImage = async () => {
    try {
      const RNBlobUtil = require('react-native-blob-util').default;
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) { Alert.alert('Permission denied', 'Storage permission required.'); return; }
      }
      const ext = uri.split('?')[0].split('.').pop() || 'jpg';
      const fileName = `FolkChat_${Date.now()}.${ext}`;
      const dest = `${RNBlobUtil.fs.dirs.PictureDir}/${fileName}`;
      await RNBlobUtil.config({ fileCache: true, path: dest, addAndroidDownloads: { useDownloadManager: true, notification: true, title: fileName, description: 'Downloading from FolkChat', mime: 'image/jpeg', path: dest } }).fetch('GET', uri);
      Alert.alert('Downloaded!', 'Image saved to Gallery.');
    } catch {
      try { const { Share } = require('react-native'); await Share.share({ message: uri }); }
      catch { Alert.alert('Error', 'Could not download image.'); }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={iv.overlay}>
        <View style={iv.topBar}>
          <TouchableOpacity style={iv.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={iv.downloadBtn} onPress={downloadImage}>
            <Ionicons name="download-outline" size={24} color="#fff" />
            <Text style={iv.downloadTxt}>Save</Text>
          </TouchableOpacity>
        </View>
        <Pressable style={iv.imageWrap} onPress={onClose}>
          <Image source={{ uri }} style={iv.image} resizeMode="contain" />
        </Pressable>
      </View>
    </Modal>
  );
}

const iv = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  topBar: { position: 'absolute', top: 52, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, zIndex: 10 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  downloadTxt: { color: '#fff', fontSize: 14, fontWeight: '600' },
  imageWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: SW, height: SH * 0.8 },
});

function MsgAvatar({ uri, name, size = 32, colors }: { uri?: string; name?: string; size?: number; colors: any }) {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: colors.saffron,
      justifyContent: 'center', alignItems: 'center',
    }}>
      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: size * 0.4 }}>
        {initials(name || '')}
      </Text>
    </View>
  );
}

// main chat screen
export default function ChatScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { user, userProfile } = useAuthStore();
  const { userId: otherUserId, userName, userAvatar, chatId: passedChatId } = route.params || {};
  const chatId = passedChatId || getChatId(user?.uid || '', otherUserId || '');

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [sending, setSending] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [otherStatus, setOtherStatus] = useState<{ online: boolean; lastSeen: any }>({ online: false, lastSeen: null });
  const [showAttach, setShowAttach] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [chatBg, setChatBg] = useState('default');
  const [customBgUri, setCustomBgUri] = useState<string | null>(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const typingTimer = useRef<any>(null);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem('chatTheme').then(v => setChatBg(v || 'default')).catch(() => setChatBg('default'));
    AsyncStorage.getItem('chatCustomBg').then(v => setCustomBgUri(v || null)).catch(() => setCustomBgUri(null));
  }, []));

  useEffect(() => {
    if (!user?.uid) return;
    const ref = firestore().collection('presence').doc(user.uid);
    ref.set({ online: true, lastSeen: firestore.FieldValue.serverTimestamp() }, { merge: true });
    return () => { ref.set({ online: false, lastSeen: firestore.FieldValue.serverTimestamp() }, { merge: true }); };
  }, [user]);

  useEffect(() => {
    if (!otherUserId) return;
    return firestore().collection('presence').doc(otherUserId)
      .onSnapshot(s => { if (s.exists()) setOtherStatus({ online: s.data()!.online || false, lastSeen: s.data()!.lastSeen }); }, () => { });
  }, [otherUserId]);

  const ensureChat = useCallback(async () => {
    if (!user?.uid || !otherUserId) return;
    const ref = firestore().collection('chats').doc(chatId);
    const snap = await ref.get();
    if (!snap.exists()) {
      await ref.set({ participants: [user.uid, otherUserId], lastMessage: '', lastMessageTime: firestore.FieldValue.serverTimestamp(), lastSenderId: '', unreadCount: { [user.uid]: 0, [otherUserId]: 0 }, createdAt: firestore.FieldValue.serverTimestamp() });
    }
    ref.update({ [`unreadCount.${user.uid}`]: 0 }).catch(() => { });
  }, [chatId, user, otherUserId]);

  useEffect(() => {
    if (!user?.uid) return;
    ensureChat();
    return firestore().collection('chats').doc(chatId).collection('messages')
      .orderBy('createdAt', 'asc')
      .onSnapshot(snap => {
        setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)).filter(m => !m.deletedFor?.includes(user.uid)));
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
      }, () => { });
  }, [chatId, user]);

  useEffect(() => {
    if (!otherUserId) return;
    return firestore().collection('chats').doc(chatId)
      .onSnapshot(s => setIsOtherTyping(s.data()?.typing?.[otherUserId] || false), () => { });
  }, [chatId, otherUserId]);

  const updateTyping = (v: boolean) => {
    if (!user?.uid) return;
    firestore().collection('chats').doc(chatId).update({ [`typing.${user.uid}`]: v }).catch(() => { });
  };

  const handleTextChange = (v: string) => {
    setText(v);
    updateTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => updateTyping(false), 2000);
  };

  const pushChatMeta = async (lastMsg: string) => {
    await firestore().collection('chats').doc(chatId).update({
      lastMessage: lastMsg, lastMessageTime: firestore.FieldValue.serverTimestamp(),
      lastSenderId: user?.uid, [`unreadCount.${otherUserId}`]: firestore.FieldValue.increment(1),
    });
    await firestore().collection('notifications').add({
      toUserId: otherUserId, fromUserId: user?.uid,
      fromUserName: userProfile?.name || 'Someone', fromUserAvatar: userProfile?.avatarUrl || '',
      type: 'message', chatId,
      message: `${userProfile?.name || 'Someone'}: ${lastMsg.slice(0, 60)}`,
      read: false, createdAt: firestore.FieldValue.serverTimestamp(),
    });
  };

  const sendMessage = async () => {
    if (!text.trim() || !user?.uid) return;
    const msgText = text.trim();
    setText(''); updateTyping(false);
    if (editingMsg) {
      setEditingMsg(null);
      await firestore().collection('chats').doc(chatId).collection('messages').doc(editingMsg.id)
        .update({ text: msgText, edited: true }).catch(() => { });
      return;
    }
    setSending(true);
    try {
      await firestore().collection('chats').doc(chatId).collection('messages').add({
        senderId: user.uid,
        senderName: userProfile?.name || 'User',
        senderAvatar: userProfile?.avatarUrl || '',
        text: msgText, type: 'text',
        createdAt: firestore.FieldValue.serverTimestamp(), edited: false, deletedFor: [],
      });
      await pushChatMeta(msgText);
    } catch { } finally { setSending(false); }
  };

  const sendImage = async (fromCamera = false) => {
    setShowAttach(false);
    const picker = fromCamera ? launchCamera : launchImageLibrary;
    const result = await picker({ mediaType: 'photo', quality: 0.8 });
    if (!result.assets?.[0]?.uri) return;
    setUploadingMedia(true);
    try {
      const url = await uploadToCloudinary(result.assets[0].uri, 'image');
      await firestore().collection('chats').doc(chatId).collection('messages').add({
        senderId: user?.uid, senderName: userProfile?.name || 'User', senderAvatar: userProfile?.avatarUrl || '',
        text: '', type: 'image', imageUrl: url,
        createdAt: firestore.FieldValue.serverTimestamp(), edited: false, deletedFor: [],
      });
      await pushChatMeta('📷 Photo');
    } catch { Alert.alert('Error', 'Failed to send image'); }
    finally { setUploadingMedia(false); }
  };

  const deleteMessage = (msg: Message) => {
    setSelectedMsg(null);
    const opts: any[] = [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete for me', onPress: async () => {
        await firestore().collection('chats').doc(chatId).collection('messages').doc(msg.id)
          .update({ deletedFor: firestore.FieldValue.arrayUnion(user?.uid) });
      }},
    ];
    if (msg.senderId === user?.uid) {
      opts.push({ text: 'Delete for everyone', style: 'destructive', onPress: async () => {
        await firestore().collection('chats').doc(chatId).collection('messages').doc(msg.id).delete();
      }});
    }
    Alert.alert('Delete Message', '', opts);
  };

  const clearChat = () => {
    setShowHeaderMenu(false);
    Alert.alert('Clear Chat', 'Clear all messages for you?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
        const snap = await firestore().collection('chats').doc(chatId).collection('messages').get();
        await Promise.all(snap.docs.map(d => d.ref.update({ deletedFor: firestore.FieldValue.arrayUnion(user?.uid) })));
      }},
    ]);
  };

  const handleVoiceCall = () => {
    setShowHeaderMenu(false);
    navigation.navigate('VoiceCall', {
      userId: otherUserId, userName, userAvatar, chatId, isIncoming: false,
    });
  };

  const handleVideoCall = () => {
    setShowHeaderMenu(false);
    navigation.navigate('VideoCall', {
      userId: otherUserId, userName, userAvatar, chatId, isIncoming: false,
    });
  };

  type ListItem = Message | { type: 'header'; date: string; id: string };

  const getListData = (): ListItem[] => {
    const out: ListItem[] = [];
    let lastDate = '';
    messages.forEach(m => {
      if (!m.createdAt) { out.push(m); return; }
      const ds = (m.createdAt.toDate ? m.createdAt.toDate() : new Date(m.createdAt)).toDateString();
      if (ds !== lastDate) { lastDate = ds; out.push({ type: 'header', date: fmtDateHeader(m.createdAt), id: `h_${ds}` }); }
      out.push(m);
    });
    return out;
  };

  const isMe = (m: Message) => m.senderId === user?.uid;
  const bgColor = BG_MAP[chatBg] || 'transparent';
  const isCustom = chatBg === 'custom' && customBgUri;
  const msgAreaStyle = !isCustom && bgColor !== 'transparent'
    ? { backgroundColor: bgColor }
    : !isCustom ? { backgroundColor: colors.warmBg }
    : {};

  const renderItem = ({ item, index }: { item: ListItem; index: number }) => {
    if ((item as any).type === 'header') {
      return (
        <View style={s.dateHeader}>
          <View style={[s.datePill, { backgroundColor: colors.warmBg }]}>
            <Text style={[s.dateTxt, { color: colors.muted }]}>{(item as any).date}</Text>
          </View>
        </View>
      );
    }

    const msg = item as Message;
    const mine = isMe(msg);
    const listData = getListData();
    const prevItem = index > 0 ? listData[index - 1] : null;
    const prevMsg = prevItem && !(prevItem as any).type ? prevItem as Message : null;
    const nextItem = index < listData.length - 1 ? listData[index + 1] : null;
    const nextMsg = nextItem && !(nextItem as any).type ? nextItem as Message : null;
    const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId;
    const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId;

    const AVATAR_SIZE = 32;
    const AVATAR_GAP = 8;

    return (
      <TouchableOpacity
        onLongPress={() => setSelectedMsg(msg)}
        activeOpacity={0.9}
        style={[s.row, mine ? s.rowRight : s.rowLeft]}>

        {!mine && (
          <View style={{ width: AVATAR_SIZE, marginRight: AVATAR_GAP, alignSelf: 'flex-end', marginBottom: 2 }}>
            {isLastInGroup ? (
              <MsgAvatar uri={msg.senderAvatar} name={msg.senderName || userName} size={AVATAR_SIZE} colors={colors} />
            ) : (
              <View style={{ width: AVATAR_SIZE }} />
            )}
          </View>
        )}

        <View style={{ maxWidth: '72%', alignItems: mine ? 'flex-end' : 'flex-start' }}>
          {!mine && isFirstInGroup && (
            <Text style={[s.senderName, { color: colors.saffron }]}>
              {msg.senderName || userName}
            </Text>
          )}

          {msg.type === 'image' && msg.imageUrl ? (
            <TouchableOpacity onPress={() => setViewerUri(msg.imageUrl!)} onLongPress={() => setSelectedMsg(msg)}>
              <View style={[s.imgBubble,
                mine
                  ? { borderBottomRightRadius: isLastInGroup ? 4 : 18 }
                  : { borderBottomLeftRadius: isLastInGroup ? 4 : 18 },
              ]}>
                <Image source={{ uri: msg.imageUrl }} style={s.chatImg} resizeMode="cover" />
                <View style={s.imgOverlay}>
                  <Ionicons name="expand-outline" size={18} color="rgba(255,255,255,0.8)" />
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={[
              s.textBubble,
              mine
                ? { backgroundColor: colors.saffron, borderBottomRightRadius: isLastInGroup ? 4 : 18 }
                : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderBottomLeftRadius: isLastInGroup ? 4 : 18 },
            ]}>
              <Text style={[s.bubbleTxt, { color: mine ? '#fff' : colors.darkText }]}>{msg.text}</Text>
              {msg.edited && (
                <Text style={[s.editedTxt, { color: mine ? 'rgba(255,255,255,0.65)' : colors.muted }]}>edited</Text>
              )}
            </View>
          )}

          <View style={s.meta}>
            <Text style={[s.metaTime, { color: colors.muted }]}>{fmtTime(msg.createdAt)}</Text>
            {mine && <Ionicons name="checkmark-done" size={13} color={colors.saffron} />}
          </View>
        </View>

        {mine && (
          <View style={{ width: AVATAR_SIZE, marginLeft: AVATAR_GAP, alignSelf: 'flex-end', marginBottom: 2 }}>
            {isLastInGroup ? (
              <MsgAvatar uri={userProfile?.avatarUrl} name={userProfile?.name || 'Me'} size={AVATAR_SIZE} colors={colors} />
            ) : (
              <View style={{ width: AVATAR_SIZE }} />
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const MessageList = () => (
    <FlatList
      ref={flatRef}
      data={getListData()}
      keyExtractor={i => (i as any).id}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
      onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
      ListEmptyComponent={
        <View style={s.emptyChat}>
          <Ionicons name="chatbubble-outline" size={48} color={colors.muted} />
          <Text style={[s.emptyChatTxt, { color: colors.muted }]}>Say hello to {userName}!</Text>
        </View>
      }
    />
  );

  const TypingIndicator = () => isOtherTyping ? (
    <View style={[s.typingBar, { backgroundColor: colors.card }]}>
      <MsgAvatar uri={userAvatar} name={userName} size={24} colors={colors} />
      <View style={[s.typingBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.dots}>
          {[0, 1, 2].map(i => <View key={i} style={[s.dot, { backgroundColor: colors.muted }]} />)}
        </View>
      </View>
      <Text style={[s.typingTxt, { color: colors.muted }]}>{userName} is typing...</Text>
    </View>
  ) : null;

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>

      {/* header */}
      <View style={[s.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerIconBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.darkText} />
        </TouchableOpacity>

        <TouchableOpacity style={s.headerUser} onPress={() => navigation.navigate('UserProfile', { userId: otherUserId })}>
          <View style={{ position: 'relative' }}>
            <MsgAvatar uri={userAvatar} name={userName} size={40} colors={colors} />
            {otherStatus.online && <View style={[s.onlineDot, { borderColor: colors.header }]} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.headerName, { color: colors.darkText }]} numberOfLines={1}>{userName || 'User'}</Text>
            <Text style={[s.headerSub, { color: otherStatus.online ? '#27AE60' : colors.muted }]} numberOfLines={1}>
              {isOtherTyping ? 'typing...' : otherStatus.online ? 'Online' : fmtLastSeen(otherStatus.lastSeen)}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={s.headerActions}>
          <TouchableOpacity style={s.headerIconBtn} onPress={handleVoiceCall} activeOpacity={0.7}>
            <Ionicons name="call-outline" size={22} color={colors.saffron} />
          </TouchableOpacity>
          <TouchableOpacity style={s.headerIconBtn} onPress={handleVideoCall} activeOpacity={0.7}>
            <Ionicons name="videocam-outline" size={24} color={colors.saffron} />
          </TouchableOpacity>
          <TouchableOpacity style={s.headerIconBtn} onPress={() => setShowHeaderMenu(true)} activeOpacity={0.7}>
            <Ionicons name="ellipsis-vertical" size={20} color={colors.darkText} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>

        {isCustom ? (
          <ImageBackground source={{ uri: customBgUri! }} style={s.msgArea} resizeMode="cover">
            <MessageList />
            <TypingIndicator />
          </ImageBackground>
        ) : (
          <View style={[s.msgArea, msgAreaStyle]}>
            <MessageList />
            <TypingIndicator />
          </View>
        )}

        {editingMsg && (
          <View style={[s.editBar, { backgroundColor: colors.warmBg, borderTopColor: colors.border }]}>
            <Ionicons name="create-outline" size={16} color={colors.saffron} />
            <Text style={[s.editBarTxt, { color: colors.muted }]} numberOfLines={1}>Editing: {editingMsg.text}</Text>
            <TouchableOpacity onPress={() => { setEditingMsg(null); setText(''); }}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
        )}

        <View style={[s.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TouchableOpacity style={s.attachBtn} onPress={() => setShowAttach(true)}>
            {uploadingMedia
              ? <ActivityIndicator size="small" color={colors.saffron} />
              : <Ionicons name="add-circle-outline" size={26} color={colors.saffron} />
            }
          </TouchableOpacity>
          <TextInput
            style={[s.input, { backgroundColor: colors.offwhite, color: colors.darkText }]}
            placeholder={editingMsg ? 'Edit message...' : 'Type a message...'}
            placeholderTextColor={colors.muted}
            value={text} onChangeText={handleTextChange} multiline maxLength={1000}
          />
          <TouchableOpacity
            style={[s.sendBtn, { backgroundColor: text.trim() ? colors.saffron : colors.warmBg }]}
            onPress={sendMessage} disabled={!text.trim() || sending}>
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name={editingMsg ? 'checkmark' : 'send'} size={18} color={text.trim() ? '#fff' : colors.muted} />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* header menu */}
      <Modal visible={showHeaderMenu} transparent animationType="fade" onRequestClose={() => setShowHeaderMenu(false)}>
        <Pressable style={s.headerMenuOverlay} onPress={() => setShowHeaderMenu(false)}>
          <View style={[s.headerMenuSheet, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={[s.headerMenuItem, { borderBottomColor: colors.border }]}
              onPress={() => { setShowHeaderMenu(false); navigation.navigate('UserProfile', { userId: otherUserId }); }}>
              <Ionicons name="person-outline" size={20} color={colors.darkText} />
              <Text style={[s.headerMenuTxt, { color: colors.darkText }]}>View Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.headerMenuItem, { borderBottomColor: 'transparent' }]}
              onPress={clearChat}>
              <Ionicons name="trash-outline" size={20} color="#FF4444" />
              <Text style={[s.headerMenuTxt, { color: '#FF4444' }]}>Clear Chat</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showAttach} transparent animationType="slide">
        <Pressable style={s.attachOverlay} onPress={() => setShowAttach(false)}>
          <View style={[s.attachSheet, { backgroundColor: colors.card }]}>
            <Text style={[s.attachTitle, { color: colors.darkText }]}>Send Photo</Text>
            {[
              { icon: 'image-outline', label: 'Photo from Gallery', color: '#E8F0FE', iconColor: '#1A4D8B', onPress: () => sendImage(false) },
              { icon: 'camera-outline', label: 'Take Photo', color: '#E8F5F3', iconColor: '#1A6B5C', onPress: () => sendImage(true) },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={[s.attachItem, { borderBottomColor: i === 0 ? colors.border : 'transparent' }]} onPress={item.onPress}>
                <View style={[s.attachIcon, { backgroundColor: item.color }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.iconColor} />
                </View>
                <Text style={[s.attachLabel, { color: colors.darkText }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* message options */}
      <Modal visible={selectedMsg !== null} transparent animationType="fade">
        <Pressable style={s.optOverlay} onPress={() => setSelectedMsg(null)}>
          <View style={[s.optSheet, { backgroundColor: colors.card }]}>
            <View style={[s.optPreview, { borderBottomColor: colors.border }]}>
              <Text style={[s.optPreviewTxt, { color: colors.muted }]} numberOfLines={2}>
                {selectedMsg?.type === 'image' ? '📷 Photo' : selectedMsg?.text}
              </Text>
            </View>
            {selectedMsg?.type === 'text' && isMe(selectedMsg) && (
              <TouchableOpacity style={[s.optItem, { borderBottomColor: colors.border }]}
                onPress={() => { setEditingMsg(selectedMsg); setText(selectedMsg.text); setSelectedMsg(null); }}>
                <View style={[s.optIcon, { backgroundColor: '#E8F0FE' }]}>
                  <Ionicons name="create-outline" size={20} color="#1A4D8B" />
                </View>
                <Text style={[s.optTxt, { color: colors.darkText }]}>Edit Message</Text>
              </TouchableOpacity>
            )}
            {selectedMsg?.type === 'image' && selectedMsg.imageUrl && (
              <TouchableOpacity style={[s.optItem, { borderBottomColor: colors.border }]}
                onPress={() => { setViewerUri(selectedMsg.imageUrl!); setSelectedMsg(null); }}>
                <View style={[s.optIcon, { backgroundColor: '#E8F5F3' }]}>
                  <Ionicons name="download-outline" size={20} color="#1A6B5C" />
                </View>
                <Text style={[s.optTxt, { color: colors.darkText }]}>Save Image</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.optItem, { borderBottomColor: 'transparent' }]}
              onPress={() => selectedMsg && deleteMessage(selectedMsg)}>
              <View style={[s.optIcon, { backgroundColor: '#FEE8E8' }]}>
                <Ionicons name="trash-outline" size={20} color="#FF4444" />
              </View>
              <Text style={[s.optTxt, { color: '#FF4444' }]}>Delete Message</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <ImageViewer uri={viewerUri || ''} visible={viewerUri !== null} onClose={() => setViewerUri(null)} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 6, paddingTop: 52, paddingBottom: 12,
    borderBottomWidth: 0.5, gap: 4,
  },
  headerIconBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  headerUser: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: 6, backgroundColor: '#27AE60', borderWidth: 2 },
  headerName: { fontSize: 15, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },

  headerMenuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  headerMenuSheet: {
    position: 'absolute', top: 96, right: 12,
    minWidth: 200, borderRadius: 14, paddingVertical: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  headerMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 0.5 },
  headerMenuTxt: { fontSize: 14, fontWeight: '500' },

  msgArea: { flex: 1 },
  dateHeader: { alignItems: 'center', marginVertical: 10 },
  datePill: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4 },
  dateTxt: { fontSize: 12 },

  row: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 3 },
  rowRight: { justifyContent: 'flex-end' },
  rowLeft: { justifyContent: 'flex-start' },

  senderName: { fontSize: 11, fontWeight: '600', marginBottom: 3, marginLeft: 4 },
  textBubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleTxt: { fontSize: 15, lineHeight: 21 },
  editedTxt: { fontSize: 10, marginTop: 2 },

  imgBubble: { borderRadius: 18, overflow: 'hidden', position: 'relative' },
  chatImg: { width: 210, height: 210 },
  imgOverlay: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 12, padding: 4 },

  meta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3, paddingHorizontal: 4 },
  metaTime: { fontSize: 10 },

  emptyChat: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyChatTxt: { fontSize: 15 },

  typingBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  typingBubble: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, opacity: 0.6 },
  typingTxt: { fontSize: 12 },

  editBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 0.5 },
  editBarTxt: { flex: 1, fontSize: 13 },

  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 0.5 },
  attachBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 9, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },

  attachOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  attachSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 34 },
  attachTitle: { fontSize: 15, fontWeight: '700', padding: 20, paddingBottom: 12 },
  attachItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5 },
  attachIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  attachLabel: { fontSize: 15, fontWeight: '500' },

  optOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  optSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 },
  optPreview: { padding: 16, borderBottomWidth: 0.5 },
  optPreviewTxt: { fontSize: 13 },
  optItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5 },
  optIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  optTxt: { fontSize: 16, fontWeight: '500' },
});