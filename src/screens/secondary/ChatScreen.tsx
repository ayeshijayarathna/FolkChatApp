import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Image, TextInput, KeyboardAvoidingView,
  Platform, Alert, Modal, Pressable, ActivityIndicator,
  Dimensions, PermissionsAndroid, ImageBackground,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
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
  type: 'text' | 'image' | 'document';
  imageUrl?: string;
  documentUrl?: string;
  documentName?: string;
  documentSize?: string;
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

// image full screen viewer
function ImageViewer({ uri, visible, onClose }: { uri: string; visible: boolean; onClose: () => void }) {
  const downloadImage = async () => {
    try {
      const RNBlobUtil = require('react-native-blob-util').default;
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission denied', 'Storage permission required.');
          return;
        }
      }
      const ext = uri.split('?')[0].split('.').pop() || 'jpg';
      const fileName = `FolkChat_${Date.now()}.${ext}`;
      const dest = `${RNBlobUtil.fs.dirs.PictureDir}/${fileName}`;
      await RNBlobUtil.config({
        fileCache: true,
        path: dest,
        addAndroidDownloads: {
          useDownloadManager: true,
          notification: true,
          title: fileName,
          description: 'Downloading from FolkChat',
          mime: 'image/jpeg',
          path: dest,
        },
      }).fetch('GET', uri);
      Alert.alert('Downloaded!', 'Image saved to Gallery.');
    } catch {
      // fallback share URL
      try {
        const { Share } = require('react-native');
        await Share.share({ message: uri });
      } catch { Alert.alert('Error', 'Could not download image.'); }
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

// document bubble
function DocumentBubble({ msg, mine, colors }: { msg: Message; mine: boolean; colors: any }) {
  const openDoc = async () => {
    try {
      const { Linking } = require('react-native');
      if (msg.documentUrl) await Linking.openURL(msg.documentUrl);
    } catch { Alert.alert('Error', 'Cannot open document'); }
  };

  const ext = (msg.documentName || 'file').split('.').pop()?.toUpperCase() || 'FILE';
  const extColors: Record<string, string> = {
    PDF: '#FF4444', DOC: '#2B5797', DOCX: '#2B5797',
    XLS: '#1D6F42', XLSX: '#1D6F42', PPT: '#D24726',
    PPTX: '#D24726', TXT: '#666',
  };
  const extColor = extColors[ext] || '#888';

  return (
    <TouchableOpacity
      style={[db.bubble,
        mine ? { backgroundColor: colors.saffron } : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
      onPress={openDoc}
      activeOpacity={0.8}>
      <View style={[db.iconWrap, { backgroundColor: extColor }]}>
        <Text style={db.extTxt}>{ext}</Text>
      </View>
      <View style={db.info}>
        <Text style={[db.name, { color: mine ? '#fff' : colors.darkText }]} numberOfLines={2}>
          {msg.documentName || 'Document'}
        </Text>
        {msg.documentSize ? (
          <Text style={[db.size, { color: mine ? 'rgba(255,255,255,0.7)' : colors.muted }]}>
            {msg.documentSize}
          </Text>
        ) : null}
      </View>
      <Ionicons name="open-outline" size={18} color={mine ? 'rgba(255,255,255,0.8)' : colors.muted} />
    </TouchableOpacity>
  );
}

const db = StyleSheet.create({
  bubble: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, padding: 12, maxWidth: 250 },
  iconWrap: { width: 38, height: 38, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  extTxt: { color: '#fff', fontSize: 10, fontWeight: '900' },
  info: { flex: 1 },
  name: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  size: { fontSize: 11, marginTop: 2 },
});

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
  const flatRef = useRef<FlatList>(null);
  const typingTimer = useRef<any>(null);

  // reload chat bg every time screen is focused (settings change apply)
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('chatTheme')
        .then(v => setChatBg(v || 'default'))
        .catch(() => setChatBg('default'));
      AsyncStorage.getItem('chatCustomBg')
        .then(v => setCustomBgUri(v || null))
        .catch(() => setCustomBgUri(null));
    }, [])
  );

  // presence 
  useEffect(() => {
    if (!user?.uid) return;
    const ref = firestore().collection('presence').doc(user.uid);
    ref.set({ online: true, lastSeen: firestore.FieldValue.serverTimestamp() }, { merge: true });
    return () => { ref.set({ online: false, lastSeen: firestore.FieldValue.serverTimestamp() }, { merge: true }); };
  }, [user]);

  // watch other user presence
  useEffect(() => {
    if (!otherUserId) return;
    return firestore().collection('presence').doc(otherUserId)
      .onSnapshot(s => {
        if (s.exists()) setOtherStatus({ online: s.data()!.online || false, lastSeen: s.data()!.lastSeen });
      }, () => { });
  }, [otherUserId]);

  // ensure chat doc & mark read
  const ensureChat = useCallback(async () => {
    if (!user?.uid || !otherUserId) return;
    const ref = firestore().collection('chats').doc(chatId);
    const snap = await ref.get();
    if (!snap.exists()) {
      await ref.set({ participants: [user.uid, otherUserId], lastMessage: '', lastMessageTime: firestore.FieldValue.serverTimestamp(), lastSenderId: '', unreadCount: { [user.uid]: 0, [otherUserId]: 0 }, createdAt: firestore.FieldValue.serverTimestamp() });
    }
    ref.update({ [`unreadCount.${user.uid}`]: 0 }).catch(() => { });
  }, [chatId, user, otherUserId]);

  // messages listener
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

  // typing listener
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

  // helpers
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

  //send text
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
        senderId: user.uid, senderName: userProfile?.name || 'User', senderAvatar: userProfile?.avatarUrl || '',
        text: msgText, type: 'text', createdAt: firestore.FieldValue.serverTimestamp(), edited: false, deletedFor: [],
      });
      await pushChatMeta(msgText);
    } catch { } finally { setSending(false); }
  };

  // send img
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

  // send docs
  const sendDocument = async () => {
    setShowAttach(false);
    try {
      const result = await launchImageLibrary({
        mediaType: 'mixed',
        quality: 0.9,
        selectionLimit: 1,
      });
      if (!result.assets?.[0]?.uri) return;
      const file = result.assets[0];
      setUploadingMedia(true);
      const isVideo = file.type?.startsWith('video');
      const url = await uploadToCloudinary(file.uri!, isVideo ? 'video' : 'image');
      const fileName = file.fileName || 'File';
      const sizeKB = file.fileSize ? `${(file.fileSize / 1024).toFixed(1)} KB` : '';

      await firestore().collection('chats').doc(chatId).collection('messages').add({
        senderId: user?.uid, senderName: userProfile?.name || 'User',
        senderAvatar: userProfile?.avatarUrl || '',
        text: '', type: isVideo ? 'image' : 'document',
        ...(isVideo ? { imageUrl: url } : { documentUrl: url, documentName: fileName, documentSize: sizeKB }),
        createdAt: firestore.FieldValue.serverTimestamp(), edited: false, deletedFor: [],
      });
      await pushChatMeta(`📄 ${fileName}`);
    } catch (e: any) {
      if (e?.code !== 'E_PICKER_CANCELLED') Alert.alert('Error', 'Failed to send file');
    } finally { setUploadingMedia(false); }
  };

  // delete
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

  // clear chat
  const clearChat = () => {
    Alert.alert('Clear Chat', 'Clear all messages for you?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
        const snap = await firestore().collection('chats').doc(chatId).collection('messages').get();
        await Promise.all(snap.docs.map(d => d.ref.update({ deletedFor: firestore.FieldValue.arrayUnion(user?.uid) })));
      }},
    ]);
  };

  //list data
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

  // render msg
  const renderItem = ({ item }: { item: ListItem }) => {
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
    return (
      <TouchableOpacity onLongPress={() => setSelectedMsg(msg)} activeOpacity={0.9}
        style={[s.row, mine ? s.rowRight : s.rowLeft]}>
        {!mine && (
          msg.senderAvatar
            ? <Image source={{ uri: msg.senderAvatar }} style={s.msgAvatar} />
            : <View style={[s.msgAvatarInit, { backgroundColor: colors.saffron }]}>
                <Text style={s.initTxt}>{initials(msg.senderName || userName || '')}</Text>
              </View>
        )}
        <View style={{ maxWidth: '75%', alignItems: mine ? 'flex-end' : 'flex-start' }}>
          {/* Image message */}
          {msg.type === 'image' && msg.imageUrl ? (
            <TouchableOpacity onPress={() => setViewerUri(msg.imageUrl!)} onLongPress={() => setSelectedMsg(msg)}>
              <View style={[s.imgBubble, mine ? { backgroundColor: colors.saffron } : { backgroundColor: colors.card }]}>
                <Image source={{ uri: msg.imageUrl }} style={s.chatImg} resizeMode="cover" />
                <View style={s.imgOverlay}>
                  <Ionicons name="expand-outline" size={18} color="rgba(255,255,255,0.8)" />
                </View>
              </View>
            </TouchableOpacity>
          ) : msg.type === 'document' ? (
            <DocumentBubble msg={msg} mine={mine} colors={colors} />
          ) : (
            <View style={[s.textBubble,
              mine ? { backgroundColor: colors.saffron } : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
              mine ? s.bubbleR : s.bubbleL]}>
              <Text style={[s.bubbleTxt, { color: mine ? '#fff' : colors.darkText }]}>{msg.text}</Text>
              {msg.edited && <Text style={[s.editedTxt, { color: mine ? 'rgba(255,255,255,0.65)' : colors.muted }]}>edited</Text>}
            </View>
          )}
          <View style={s.meta}>
            <Text style={[s.metaTime, { color: colors.muted }]}>{fmtTime(msg.createdAt)}</Text>
            {mine && <Ionicons name="checkmark-done" size={13} color={colors.saffron} />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.darkText} />
        </TouchableOpacity>
        <TouchableOpacity style={s.headerUser} onPress={() => navigation.navigate('UserProfile', { userId: otherUserId })}>
          <View style={{ position: 'relative' }}>
            {userAvatar
              ? <Image source={{ uri: userAvatar }} style={s.headerAvatar} />
              : <View style={[s.headerAvatarInit, { backgroundColor: colors.saffron }]}>
                  <Text style={s.initTxt}>{initials(userName || '')}</Text>
                </View>
            }
            {otherStatus.online && <View style={[s.onlineDot, { borderColor: colors.header }]} />}
          </View>
          <View>
            <Text style={[s.headerName, { color: colors.darkText }]}>{userName || 'User'}</Text>
            <Text style={[s.headerSub, { color: otherStatus.online ? '#27AE60' : colors.muted }]}>
              {isOtherTyping ? 'typing...' : otherStatus.online ? 'Online' : fmtLastSeen(otherStatus.lastSeen)}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={clearChat}>
          <Text style={[s.clearBtn, { color: colors.muted }]}>Clear</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        {/* Messages area — custom wallpaper or color bg */}
        {isCustom ? (
          <ImageBackground source={{ uri: customBgUri! }} style={[s.msgArea]} resizeMode="cover">
            <FlatList ref={flatRef} data={getListData()} keyExtractor={i => (i as any).id}
              renderItem={renderItem} showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
              onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <View style={s.emptyChat}>
                  <Ionicons name="chatbubble-outline" size={48} color={colors.muted} />
                  <Text style={[s.emptyChatTxt, { color: colors.muted }]}>Say hello to {userName}!</Text>
                </View>
              }
            />
            {isOtherTyping && (
              <View style={[s.typingBar, { backgroundColor: colors.card }]}>
                <View style={[s.typingBubble, { borderColor: colors.border }]}>
                  <View style={s.dots}>
                    {[0,1,2].map(i => <View key={i} style={[s.dot, { backgroundColor: colors.muted }]} />)}
                  </View>
                </View>
                <Text style={[s.typingTxt, { color: colors.muted }]}>{userName} is typing...</Text>
              </View>
            )}
          </ImageBackground>
        ) : (
          <View style={[s.msgArea, msgAreaStyle]}>
          <FlatList ref={flatRef} data={getListData()} keyExtractor={i => (i as any).id}
            renderItem={renderItem} showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={s.emptyChat}>
                <Ionicons name="chatbubble-outline" size={48} color={colors.muted} />
                <Text style={[s.emptyChatTxt, { color: colors.muted }]}>Say hello to {userName}!</Text>
              </View>
            }
          />
          {/* Typing indicator */}
          {isOtherTyping && (
            <View style={[s.typingBar, { backgroundColor: colors.card }]}>
              <View style={[s.typingBubble, { borderColor: colors.border }]}>
                <View style={s.dots}>
                  {[0,1,2].map(i => <View key={i} style={[s.dot, { backgroundColor: colors.muted }]} />)}
                </View>
              </View>
              <Text style={[s.typingTxt, { color: colors.muted }]}>{userName} is typing...</Text>
            </View>
          )}
        </View>
        )}

        {/* Edit bar */}
        {editingMsg && (
          <View style={[s.editBar, { backgroundColor: colors.warmBg, borderTopColor: colors.border }]}>
            <Ionicons name="create-outline" size={16} color={colors.saffron} />
            <Text style={[s.editBarTxt, { color: colors.muted }]} numberOfLines={1}>Editing: {editingMsg.text}</Text>
            <TouchableOpacity onPress={() => { setEditingMsg(null); setText(''); }}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar */}
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

      {/* Attach menu */}
      <Modal visible={showAttach} transparent animationType="slide">
        <Pressable style={s.attachOverlay} onPress={() => setShowAttach(false)}>
          <View style={[s.attachSheet, { backgroundColor: colors.card }]}>
            <Text style={[s.attachTitle, { color: colors.darkText }]}>Send</Text>
            {[
              { icon: 'image-outline', label: 'Photo from Gallery', color: '#E8F0FE', iconColor: '#1A4D8B', onPress: () => sendImage(false) },
              { icon: 'camera-outline', label: 'Take Photo', color: '#E8F5F3', iconColor: '#1A6B5C', onPress: () => sendImage(true) },
              { icon: 'document-outline', label: 'Document', color: '#FFF3E0', iconColor: '#D4651A', onPress: sendDocument },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={[s.attachItem, { borderBottomColor: i < 2 ? colors.border : 'transparent' }]}
                onPress={item.onPress}>
                <View style={[s.attachIcon, { backgroundColor: item.color }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.iconColor} />
                </View>
                <Text style={[s.attachLabel, { color: colors.darkText }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Message options */}
      <Modal visible={selectedMsg !== null} transparent animationType="fade">
        <Pressable style={s.optOverlay} onPress={() => setSelectedMsg(null)}>
          <View style={[s.optSheet, { backgroundColor: colors.card }]}>
            <View style={[s.optPreview, { borderBottomColor: colors.border }]}>
              <Text style={[s.optPreviewTxt, { color: colors.muted }]} numberOfLines={2}>
                {selectedMsg?.type === 'image' ? '📷 Photo' : selectedMsg?.type === 'document' ? `📄 ${selectedMsg.documentName}` : selectedMsg?.text}
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

      {/* Image full-screen viewer */}
      <ImageViewer uri={viewerUri || ''} visible={viewerUri !== null} onClose={() => setViewerUri(null)} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 52, paddingBottom: 12, borderBottomWidth: 0.5 },
  headerUser: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerAvatarInit: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  initTxt: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: 6, backgroundColor: '#27AE60', borderWidth: 2 },
  headerName: { fontSize: 15, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },
  clearBtn: { fontSize: 13, fontWeight: '600', paddingHorizontal: 4 },
  msgArea: { flex: 1 },
  dateHeader: { alignItems: 'center', marginVertical: 10 },
  datePill: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4 },
  dateTxt: { fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10, gap: 8 },
  rowRight: { justifyContent: 'flex-end' },
  rowLeft: { justifyContent: 'flex-start' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14 },
  msgAvatarInit: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  textBubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleR: { borderBottomRightRadius: 4 },
  bubbleL: { borderBottomLeftRadius: 4 },
  bubbleTxt: { fontSize: 15, lineHeight: 21 },
  editedTxt: { fontSize: 10, marginTop: 2 },
  imgBubble: { borderRadius: 16, overflow: 'hidden', position: 'relative' },
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