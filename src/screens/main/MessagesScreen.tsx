import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Image, RefreshControl, ActivityIndicator,
  Alert, Animated, PanResponder, Dimensions, TextInput,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
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
  archived?: boolean;
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

// swipable raw
function ConvRow({ item, colors, user, navigation, onDelete, onArchive, t }: {
  item: Conversation; colors: any; user: any; navigation: any;
  onDelete: (id: string) => void; onArchive: (id: string) => void;
  t: any;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [swiped, setSwiped] = useState(false);
  const ACTION_WIDTH = 160;

  const close = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    setSwiped(false);
  };

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dy) < 20,
    onPanResponderMove: (_, g) => {
      if (g.dx < 0) translateX.setValue(Math.max(g.dx, -ACTION_WIDTH));
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx < -ACTION_WIDTH / 3) {
        Animated.spring(translateX, { toValue: -ACTION_WIDTH, useNativeDriver: true }).start();
        setSwiped(true);
      } else {
        close();
      }
    },
  })).current;

  const handlePress = () => {
    if (swiped) { close(); return; }
    navigation.navigate('Chat', {
      chatId: item.chatId,
      userId: item.otherUserId,
      userName: item.otherUserName,
      userAvatar: item.otherUserAvatar,
    });
  };

  const confirmDelete = () => {
    Alert.alert(t.msgDeleteTitle, `${t.msgDeleteBody} ${item.otherUserName}?`, [
      { text: t.cancel, style: 'cancel', onPress: close },
      { text: t.msgDelete, style: 'destructive', onPress: () => onDelete(item.chatId) },
    ]);
  };

  const handleArchive = () => {
    close();
    onArchive(item.chatId);
  };

  return (
    <View style={{ overflow: 'hidden' }}>
      {swiped && (
        <View style={[styles.actionContainer, { width: ACTION_WIDTH }]}>
          {/* archive */}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.saffron ?? '#F5A623' }]}
            onPress={handleArchive}>
            <Ionicons name="archive-outline" size={20} color="#fff" />
            <Text style={styles.actionBtnTxt}>
              {item.archived ? t.msgUnarchive : t.msgArchive}
            </Text>
          </TouchableOpacity>
          {/* delete */}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#FF4444' }]}
            onPress={confirmDelete}>
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.actionBtnTxt}>{t.msgDelete}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* swipeable content */}
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <TouchableOpacity
          style={[styles.convItem, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handlePress}
          activeOpacity={0.85}>

          {/* Avatar */}
          <View style={styles.avatarWrap}>
            {item.otherUserAvatar
              ? <Image
                  source={{ uri: item.otherUserAvatar }}
                  style={[
                    styles.avatar,
                    item.unread > 0 && { borderColor: colors.saffron, borderWidth: 2 },
                  ]}
                />
              : <View style={[styles.avatarInit, { backgroundColor: colors.saffron }]}>
                  <Text style={styles.initTxt}>{initials(item.otherUserName)}</Text>
                </View>
            }
            {item.archived && (
              <View style={[styles.archivedDot, { backgroundColor: colors.saffron }]}>
                <Ionicons name="archive" size={8} color="#fff" />
              </View>
            )}
          </View>

          {/* Content */}
          <View style={styles.convContent}>
            <View style={styles.convTop}>
              <Text style={[
                styles.convName,
                { color: colors.darkText },
                item.unread > 0 && { fontWeight: '800' },
              ]}>
                {item.otherUserName}
              </Text>
              <Text style={[
                styles.convTime,
                { color: item.unread > 0 ? colors.saffron : colors.muted },
              ]}>
                {timeAgo(item.lastMessageTime)}
              </Text>
            </View>
            <View style={styles.convBottom}>
              <Text
                style={[
                  styles.convLast,
                  { color: item.unread > 0 ? colors.darkText : colors.muted },
                  item.unread > 0 && { fontWeight: '600' },
                ]}
                numberOfLines={1}>
                {item.lastSenderId === user?.uid ? `${t.msgYou}: ` : ''}{item.lastMessage || t.msgStart}
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

  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const deletedIds = useRef<Set<string>>(new Set());
  const archivedIds = useRef<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [search, setSearch] = useState('');

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
              archived: data.archivedFor?.includes(user.uid) ?? archivedIds.current.has(doc.id),
            } as Conversation;
          }));

          setAllConversations(
            convs.filter(c => !deletedIds.current.has(c.chatId))
          );
        } catch { }
        setLoading(false);
        setRefreshing(false);
      }, () => { setLoading(false); setRefreshing(false); });

    return () => unsub();
  }, [user]);

  const filtered = allConversations.filter(c => {
    const matchSearch = c.otherUserName.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === 'archived' ? c.archived : !c.archived;
    return matchSearch && matchTab;
  });

  const totalUnread = allConversations
    .filter(c => !c.archived)
    .reduce((sum, c) => sum + c.unread, 0);

  const deleteConversation = useCallback(async (chatId: string) => {
    deletedIds.current.add(chatId);
    setAllConversations(prev => prev.filter(c => c.chatId !== chatId));
    try {
      const snap = await firestore().collection('chats').doc(chatId).collection('messages').get();
      await Promise.all(snap.docs.map(d =>
        d.ref.update({ deletedFor: firestore.FieldValue.arrayUnion(user?.uid) })
      ));
      await firestore().collection('chats').doc(chatId).update({
        [`unreadCount.${user?.uid}`]: 0,
        lastMessage: '',
      });
    } catch {
      deletedIds.current.delete(chatId);
      Alert.alert(t.errorTitle, t.msgErrorDelete);
      setRefreshing(true); 
    }
  }, [user]);

  const toggleArchive = useCallback(async (chatId: string) => {
    const conv = allConversations.find(c => c.chatId === chatId);
    if (!conv) return;
    const nowArchived = !conv.archived;

    // optimistic local update
    if (nowArchived) archivedIds.current.add(chatId);
    else archivedIds.current.delete(chatId);

    setAllConversations(prev =>
      prev.map(c => c.chatId === chatId ? { ...c, archived: nowArchived } : c)
    );

    try {
      await firestore().collection('chats').doc(chatId).update({
        archivedFor: nowArchived
          ? firestore.FieldValue.arrayUnion(user?.uid)
          : firestore.FieldValue.arrayRemove(user?.uid),
      });
    } catch {
      // rollback
      if (nowArchived) archivedIds.current.delete(chatId);
      else archivedIds.current.add(chatId);
      setAllConversations(prev =>
        prev.map(c => c.chatId === chatId ? { ...c, archived: !nowArchived } : c)
      );
      Alert.alert(t.errorTitle, t.msgErrorArchive);
    }
  }, [allConversations, user]);

  // render
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.30, 0.70, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.darkText }]}>{t.messages || 'Message'}</Text>
          {totalUnread > 0 && (
            <View style={[styles.headerBadge, { backgroundColor: colors.saffron }]}>
              <Text style={styles.headerBadgeTxt}>{totalUnread}</Text>
            </View>
          )}
        </View>

        {/* search bar */}
        <View style={[styles.searchBar, { backgroundColor: colors.warmBg ?? 'rgba(0,0,0,0.06)', borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t.msgSearchPlaceholder}
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.darkText }]}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* tabs */}
        <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
          {(['active', 'archived'] as const).map(t_ => (
            <TouchableOpacity
              key={t_}
              style={[styles.tab, tab === t_ && { borderBottomColor: colors.saffron, borderBottomWidth: 2 }]}
              onPress={() => setTab(t_)}>
              <Text style={[
                styles.tabTxt,
                { color: tab === t_ ? colors.saffron : colors.muted },
                tab === t_ && { fontWeight: '700' },
              ]}>
                {t_ === 'active' ? t.msgActive : t.msgArchived}
              </Text>
              {t_ === 'archived' && allConversations.filter(c => c.archived).length > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: colors.saffron }]}>
                  <Text style={styles.tabBadgeTxt}>
                    {allConversations.filter(c => c.archived).length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* swipe hint */}
      {filtered.length > 0 && (
        <View style={styles.swipeHint}>
          <Ionicons name="arrow-back-outline" size={11} color={colors.muted} />
          <Text style={[styles.swipeHintTxt, { color: colors.muted }]}>
            {t.msgSwipeHint}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.saffron} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={c => c.chatId}
          renderItem={({ item, index }) => (
            <ConvRow
              item={item}
              colors={colors}
              user={user}
              navigation={navigation}
              onDelete={deleteConversation}
              onArchive={toggleArchive}
              t={t}
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
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListHeaderComponent={<View style={{ height: 4 }} />}
          ListFooterComponent={<View style={{ height: 16 }} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.warmBg }]}>
                <Ionicons
                  name={tab === 'archived' ? 'archive-outline' : 'chatbubbles-outline'}
                  size={48}
                  color={colors.saffron}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.darkText }]}>
                {tab === 'archived' ? t.msgNoArchivedTitle : t.msgNoMessagesTitle}
              </Text>
              <Text style={[styles.emptySub, { color: colors.muted }]}>
                {tab === 'archived' ? t.msgNoArchivedSub : t.msgNoMessagesSub}
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
  header: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 0, borderBottomWidth: 0.5 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerTitle: { fontSize: 26, fontWeight: 'bold' },
  headerBadge: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  headerBadgeTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9,
    marginBottom: 12, borderWidth: 0.5,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  tabRow: { flexDirection: 'row', gap: 24, borderBottomWidth: 0.5 },
  tab: { paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  tabTxt: { fontSize: 13, letterSpacing: 0.5 },
  tabBadge: { borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  tabBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },
  swipeHint: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 6 },
  swipeHintTxt: { fontSize: 11 },
  actionContainer: { position: 'absolute', right: 0, top: 0, bottom: 0, flexDirection: 'row', borderRadius: 18, overflow: 'hidden' },
  actionBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 3 },
  actionBtnTxt: { color: '#fff', fontSize: 11, fontWeight: '600' },

  listContent: { paddingHorizontal: 16 },

  convItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 13,
    gap: 12, borderRadius: 18, borderWidth: 0.5,
    overflow: 'hidden',
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  avatarInit: { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center' },
  initTxt: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
  archivedDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 16, height: 16, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  convContent: { flex: 1 },
  convTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  convName: { fontSize: 15, fontWeight: '600' },
  convTime: { fontSize: 12 },
  convBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convLast: { fontSize: 13, flex: 1, marginRight: 8 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  badgeTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },

  loadingState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 16, paddingHorizontal: 40 },
  emptyIconWrap: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});