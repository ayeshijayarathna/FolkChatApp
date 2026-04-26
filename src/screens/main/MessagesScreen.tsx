import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Image, RefreshControl, ActivityIndicator,
  Alert, Animated, PanResponder, Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from '@react-native-vector-icons/ionicons';
import firestore from '@react-native-firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LanguageContext';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');

interface Conversation {
  chatId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string;
  lastMessage: string;
  lastMessageTime: any;
  unread: number;
  lastSenderId: string;
}

function timeAgo(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'Now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function initials(name: string) { return (name || 'A').charAt(0).toUpperCase(); }

// swipeable conversation row
function ConvRow({ item, colors, user, navigation, onDelete }: {
  item: Conversation; colors: any; user: any; navigation: any; onDelete: (id: string) => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [swiped, setSwiped] = useState(false);
  const DELETE_WIDTH = 80;

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dy) < 20,
    onPanResponderMove: (_, g) => {
      if (g.dx < 0) translateX.setValue(Math.max(g.dx, -DELETE_WIDTH));
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx < -DELETE_WIDTH / 2) {
        Animated.spring(translateX, { toValue: -DELETE_WIDTH, useNativeDriver: true }).start();
        setSwiped(true);
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        setSwiped(false);
      }
    },
  })).current;

  const handlePress = () => {
    if (swiped) {
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      setSwiped(false);
      return;
    }
    navigation.navigate('Chat', {
      chatId: item.chatId,
      userId: item.otherUserId,
      userName: item.otherUserName,
      userAvatar: item.otherUserAvatar,
    });
  };

  const confirmDelete = () => {
    Alert.alert('Delete Conversation', `Delete chat with ${item.otherUserName}?`, [
      { text: 'Cancel', style: 'cancel', onPress: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        setSwiped(false);
      }},
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.chatId) },
    ]);
  };

  return (
    <View style={{ overflow: 'hidden' }}>
      {/* delete button */}
      <View style={[styles.deleteAction, { width: DELETE_WIDTH }]}>
        <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
          <Text style={styles.deleteBtnTxt}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable row */}
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <TouchableOpacity
          style={[styles.convItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
          onPress={handlePress}
          activeOpacity={0.85}>

          {/* Avatar */}
          <View style={styles.avatarWrap}>
            {item.otherUserAvatar
              ? <Image source={{ uri: item.otherUserAvatar }} style={[styles.avatar, { borderColor: item.unread > 0 ? colors.saffron : 'transparent', borderWidth: item.unread > 0 ? 2 : 0 }]} />
              : <View style={[styles.avatarInit, { backgroundColor: colors.saffron }]}>
                  <Text style={styles.initTxt}>{initials(item.otherUserName)}</Text>
                </View>
            }
          </View>

          {/* Content */}
          <View style={styles.convContent}>
            <View style={styles.convTop}>
              <Text style={[styles.convName, { color: colors.darkText }, item.unread > 0 && { fontWeight: '800' }]}>
                {item.otherUserName}
              </Text>
              <Text style={[styles.convTime, { color: item.unread > 0 ? colors.saffron : colors.muted }]}>
                {timeAgo(item.lastMessageTime)}
              </Text>
            </View>
            <View style={styles.convBottom}>
              <Text
                style={[styles.convLast, { color: item.unread > 0 ? colors.darkText : colors.muted },
                  item.unread > 0 && { fontWeight: '600' }]}
                numberOfLines={1}>
                {item.lastSenderId === user?.uid ? 'You: ' : ''}{item.lastMessage || 'Start a conversation'}
              </Text>
              {item.unread > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.saffron }]}>
                  <Text style={styles.badgeTxt}>{item.unread > 99 ? '99+' : item.unread}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// main screen
export default function MessagesScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { t } = useLang();
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const gradientColors: string[] = isDark
    ? ['#1A1008', '#2A1C0E', '#3A2814', '#4A341C']
    : ['#FFC58A', '#FFD9A8', '#FFEAC8', '#FFF6E5'];

  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
    const unsub = firestore()
      .collection('chats')
      .where('participants', 'array-contains', user.uid)
      .orderBy('lastMessageTime', 'desc')
      .onSnapshot(async snap => {
        try {
          const convs = await Promise.all(snap.docs.map(async doc => {
            const data = doc.data();
            const otherUserId = data.participants.find((id: string) => id !== user.uid);
            let otherUserName = 'User', otherUserAvatar = '';
            try {
              const ud = (await firestore().collection('users').doc(otherUserId).get()).data();
              otherUserName = ud?.name || 'User';
              otherUserAvatar = ud?.avatarUrl || '';
            } catch { }
            return {
              chatId: doc.id, otherUserId, otherUserName, otherUserAvatar,
              lastMessage: data.lastMessage || '',
              lastMessageTime: data.lastMessageTime,
              unread: data.unreadCount?.[user.uid] || 0,
              lastSenderId: data.lastSenderId || '',
            } as Conversation;
          }));
          setConversations(convs);
        } catch { }
        setLoading(false); setRefreshing(false);
      }, () => { setLoading(false); setRefreshing(false); });
    return () => unsub();
  }, [user]);

  const deleteConversation = async (chatId: string) => {
    try {
      const snap = await firestore().collection('chats').doc(chatId).collection('messages').get();
      await Promise.all(snap.docs.map(d =>
        d.ref.update({ deletedFor: firestore.FieldValue.arrayUnion(user?.uid) })
      ));
      await firestore().collection('chats').doc(chatId).update({
        [`unreadCount.${user?.uid}`]: 0,
        lastMessage: '',
      });
      setConversations(prev => prev.filter(c => c.chatId !== chatId));
    } catch { Alert.alert('Error', 'Failed to delete conversation'); }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  return (
    <View style={styles.container}>
      {/* Gradient background */}
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.30, 0.70, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: 'transparent', borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.darkText }]}>{t.messages}</Text>
          {totalUnread > 0 && (
            <Text style={[styles.headerSub, { color: colors.muted }]}>
              {totalUnread} unread message{totalUnread > 1 ? 's' : ''}
            </Text>
          )}
        </View>
        {totalUnread > 0 && (
          <View style={[styles.headerBadge, { backgroundColor: colors.saffron }]}>
            <Text style={styles.headerBadgeTxt}>{totalUnread}</Text>
          </View>
        )}
      </View>

      {/* Swipe hint */}
      {conversations.length > 0 && (
        <View style={[styles.swipeHint, { backgroundColor: 'transparent' }]}>
          <Ionicons name="arrow-back-outline" size={12} color={colors.muted} />
          <Text style={[styles.swipeHintTxt, { color: colors.muted }]}>Swipe left to delete</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.saffron} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={c => c.chatId}
          renderItem={({ item }) => (
            <ConvRow
              item={item} colors={colors} user={user}
              navigation={navigation} onDelete={deleteConversation}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => setRefreshing(true)}
              colors={[colors.saffron]}
            />
          }
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: 'transparent' }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.warmBg }]}>
                <Ionicons name="chatbubbles-outline" size={48} color={colors.saffron} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.darkText }]}>No messages yet</Text>
              <Text style={[styles.emptySub, { color: colors.muted }]}>
                Visit an artist's profile and tap{'\n'}Message to start chatting
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 0.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 26, fontWeight: 'bold' },
  headerSub: { fontSize: 12, marginTop: 2 },
  headerBadge: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  headerBadgeTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  swipeHint: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 6 },
  swipeHintTxt: { fontSize: 11 },
  loadingState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  deleteAction: { position: 'absolute', right: 0, top: 0, bottom: 0, backgroundColor: '#FF4444', justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { alignItems: 'center', gap: 3 },
  deleteBtnTxt: { color: '#fff', fontSize: 11, fontWeight: '600' },
  convItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, gap: 12 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  avatarInit: { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center' },
  initTxt: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
  convContent: { flex: 1 },
  convTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  convName: { fontSize: 15, fontWeight: '600' },
  convTime: { fontSize: 12 },
  convBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convLast: { fontSize: 13, flex: 1, marginRight: 8 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  badgeTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 16, paddingHorizontal: 40 },
  emptyIconWrap: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});