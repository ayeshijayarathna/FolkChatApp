import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Image, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';

interface Notification {
  id: string;
  type: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar: string;
  message: string;
  postImage?: string;
  postId?: string;
  chatId?: string;
  callId?: string;
  read: boolean;
  createdAt: any;
}

const TYPE_ICON: Record<string, { name: string; color: string }> = {
  like:                 { name: 'heart',                color: '#FF4444' },
  comment:              { name: 'chatbubble',           color: '#4A90E2' },
  reply:                { name: 'return-down-forward',  color: '#7B61FF' },
  follow:               { name: 'person-add',           color: '#27AE60' },
  view_milestone:       { name: 'trending-up',          color: '#E07830' },
  message:              { name: 'chatbubble-ellipses',  color: '#D4651A' },
  interested:           { name: 'star',                 color: '#B8860B' },
  incoming_voice_call:  { name: 'call',                 color: '#27AE60' },
  incoming_video_call:  { name: 'videocam',             color: '#27AE60' },
  missed_voice_call:    { name: 'call',                 color: '#E74C3C' },
  missed_video_call:    { name: 'videocam',             color: '#E74C3C' },
  voice_call_ended:     { name: 'call',                 color: '#7A6A5A' },
  video_call_ended:     { name: 'videocam',             color: '#7A6A5A' },
};

const CALL_TYPES = [
  'incoming_voice_call', 'incoming_video_call',
  'missed_voice_call',   'missed_video_call',
  'voice_call_ended',    'video_call_ended',
];

function timeAgo(timestamp: any): string {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}

function getChatId(a: string, b: string) { return [a, b].sort().join('_'); }

export default function NotificationsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user?.uid) { setLoading(false); return; }
    try {
      const snap = await firestore()
        .collection('notifications')
        .where('toUserId', '==', user.uid)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
    } catch (e) {
      console.log('Notifications error:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchNotifications(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const markAllRead = async () => {
    if (!user?.uid) return;
    const unread = notifications.filter(n => !n.read);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await Promise.all(unread.map(n =>
        firestore().collection('notifications').doc(n.id).update({ read: true })
      ));
    } catch { }
  };

  const callBack = (notif: Notification) => {
    const screen = (notif.type === 'missed_video_call' || notif.type === 'incoming_video_call')
      ? 'VideoCall' : 'VoiceCall';
    navigation.navigate(screen, {
      userId: notif.fromUserId,
      userName: notif.fromUserName,
      userAvatar: notif.fromUserAvatar,
      chatId: getChatId(user?.uid || '', notif.fromUserId),
      isIncoming: false,
    });
  };

  const handleNotifPress = async (notif: Notification) => {
    if (!notif.read) {
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
      try {
        await firestore().collection('notifications').doc(notif.id).update({ read: true });
      } catch { }
    }

    if (CALL_TYPES.includes(notif.type)) {
      if (notif.type === 'missed_voice_call' || notif.type === 'missed_video_call') {
        Alert.alert(
          'Call back',
          `Call ${notif.fromUserName} back?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Call', onPress: () => callBack(notif) },
          ],
        );
        return;
      }
      navigation.navigate('Chat', {
        userId: notif.fromUserId,
        userName: notif.fromUserName,
        userAvatar: notif.fromUserAvatar,
      });
      return;
    }

    switch (notif.type) {
      case 'message':
        if (notif.chatId) {
          navigation.navigate('Chat', {
            chatId: notif.chatId,
            userId: notif.fromUserId,
            userName: notif.fromUserName,
            userAvatar: notif.fromUserAvatar,
          });
        }
        break;
      case 'like':
      case 'comment':
      case 'reply':
      case 'view_milestone':
      case 'follow':
      case 'interested':
      default:
        navigation.navigate('UserProfile', { userId: notif.fromUserId });
        break;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderItem = ({ item }: { item: Notification }) => {
    const icon = TYPE_ICON[item.type] || { name: 'notifications-outline', color: '#999' };
    const isMissedCall = item.type === 'missed_voice_call' || item.type === 'missed_video_call';

    return (
      <TouchableOpacity
        style={[
          styles.notifItem,
          { backgroundColor: item.read ? colors.card : colors.warmBg, borderBottomColor: colors.border },
        ]}
        onPress={() => handleNotifPress(item)}
        activeOpacity={0.8}>

        {/* Avatar & type badge */}
        <View style={styles.avatarWrap}>
          {item.fromUserAvatar ? (
            <Image source={{ uri: item.fromUserAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarInitial, { backgroundColor: colors.saffron }]}>
              <Text style={styles.initText}>{(item.fromUserName || 'A').charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={[styles.typeBadge, { backgroundColor: icon.color }]}>
            <Ionicons name={icon.name as any} size={10} color="#fff" />
          </View>
        </View>

        {/* Content */}
        <View style={styles.notifContent}>
          <Text style={[styles.notifMessage, { color: colors.darkText }]} numberOfLines={2}>
            <Text style={{ fontWeight: '700' }}>{item.fromUserName} </Text>
            {item.message.replace(item.fromUserName + ' ', '')}
          </Text>
          <Text style={[
            styles.notifTime,
            isMissedCall
              ? { color: '#E74C3C', fontWeight: '600' }
              : { color: colors.muted },
          ]}>
            {timeAgo(item.createdAt)}
            {isMissedCall && ' · Tap to call back'}
          </Text>
        </View>

        {isMissedCall ? (
          <TouchableOpacity
            style={[styles.callBackBtn, { backgroundColor: '#27AE60' }]}
            onPress={() => callBack(item)}
            activeOpacity={0.8}>
            <Ionicons
              name={item.type === 'missed_video_call' ? 'videocam' : 'call'}
              size={18}
              color="#fff"
            />
          </TouchableOpacity>
        ) : item.postImage ? (
          <Image source={{ uri: item.postImage }} style={styles.postThumb} />
        ) : null}

        {/* unread dot */}
        {!item.read && (
          <View style={[styles.unreadDot, { backgroundColor: colors.saffron }]} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.offwhite }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.darkText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.darkText }]}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={[styles.markAll, { color: colors.saffron }]}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {/* Unread banner */}
      {unreadCount > 0 && (
        <View style={[styles.unreadBanner, { backgroundColor: colors.saffron }]}>
          <Ionicons name="notifications" size={14} color="#fff" />
          <Text style={styles.unreadBannerText}>
            {unreadCount} new notification{unreadCount > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.saffron} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.saffron]} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="notifications-outline" size={56} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.darkText }]}>No notifications yet</Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                When someone likes, comments or follows you, it'll show up here.
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  markAll: { fontSize: 13, fontWeight: '600' },
  unreadBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  unreadBannerText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  loadingState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notifItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 0.5, position: 'relative',
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarInitial: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  initText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  typeBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  notifContent: { flex: 1 },
  notifMessage: { fontSize: 14, lineHeight: 20 },
  notifTime: { fontSize: 12, marginTop: 3 },
  postThumb: { width: 44, height: 44, borderRadius: 8 },
  callBackBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#27AE60', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  unreadDot: {
    position: 'absolute', top: '50%', right: 10,
    width: 8, height: 8, borderRadius: 4, marginTop: -4,
  },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});