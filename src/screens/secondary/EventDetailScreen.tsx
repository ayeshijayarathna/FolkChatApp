import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, Alert, ActivityIndicator,
  FlatList, Modal,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';

interface Event {
  id: string; userId: string; title: string; description: string;
  location: string; date: any; imageUrl?: string; category: string;
  interestedUsers: string[]; createdAt: any;
  userName?: string; userAvatar?: string;
}

interface InterestedUser {
  uid: string; name: string; artistCategory: string; avatarUrl: string;
}

function formatFullDate(ts: any): string {
  if (!ts) return 'TBA';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function formatTime(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
function formatShortDate(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function initials(name: string) { return (name || 'A').charAt(0).toUpperCase(); }

// Ionicons per category
const CATEGORY_ICONS: Record<string, string> = {
  'Exhibition':  'color-palette-outline',
  'Workshop':    'construct-outline',
  'Festival':    'musical-notes-outline',
  'Concert':     'mic-outline',
  'Cultural':    'globe-outline',
  'Competition': 'trophy-outline',
  'Craft Fair':  'basket-outline',
  'default':     'calendar-outline',
};

// ── Interested People Modal ────────────────────────────────
function InterestedPeopleModal({ visible, onClose, interestedUids, navigation, colors }: {
  visible: boolean; onClose: () => void;
  interestedUids: string[]; navigation: any; colors: any;
}) {
  const [users, setUsers] = useState<InterestedUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || interestedUids.length === 0) { setUsers([]); return; }
    setLoading(true);
    Promise.all(
      interestedUids.map(async uid => {
        try {
          const doc = await firestore().collection('users').doc(uid).get();
          const d = doc.data();
          return { uid, name: d?.name || 'Artist', artistCategory: d?.artistCategory || 'Folk Artist', avatarUrl: d?.avatarUrl || '' };
        } catch { return { uid, name: 'Artist', artistCategory: 'Folk Artist', avatarUrl: '' }; }
      })
    ).then(list => { setUsers(list); setLoading(false); });
  }, [visible, interestedUids]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.darkText }]}>Interested People</Text>
              <Text style={[styles.modalSub, { color: colors.muted }]}>{interestedUids.length} {interestedUids.length === 1 ? 'person' : 'people'} interested</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.darkText} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={colors.saffron} />
            </View>
          ) : users.length === 0 ? (
            <View style={styles.modalEmpty}>
              <Ionicons name="people-outline" size={48} color={colors.muted} />
              <Text style={[styles.modalEmptyTxt, { color: colors.muted }]}>No one yet</Text>
            </View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={u => u.uid}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.personItem, { borderBottomColor: colors.border }]}
                  onPress={() => { onClose(); navigation.navigate('UserProfile', { userId: item.uid }); }}
                  activeOpacity={0.85}>
                  {item.avatarUrl
                    ? <Image source={{ uri: item.avatarUrl }} style={styles.personAvatar} />
                    : <View style={[styles.personAvatarInit, { backgroundColor: colors.saffron }]}>
                        <Text style={styles.personInitTxt}>{initials(item.name)}</Text>
                      </View>
                  }
                  <View style={styles.personInfo}>
                    <Text style={[styles.personName, { color: colors.darkText }]}>{item.name}</Text>
                    <Text style={[styles.personCat, { color: colors.saffron }]}>{item.artistCategory}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

//single event detail 
function SingleEventDetail({ event, navigation, colors, user, userProfile }: {
  event: Event; navigation: any; colors: any; user: any; userProfile: any;
}) {
  const [interested, setInterested] = useState((event.interestedUsers || []).includes(user?.uid));
  const [interestedUids, setInterestedUids] = useState<string[]>(event.interestedUsers || []);
  const [loading, setLoading] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const isOwn = event.userId === user?.uid;
  const count = interestedUids.length;
  const iconName = (CATEGORY_ICONS[event.category] || CATEGORY_ICONS['default']) as any;

  const toggleInterested = async () => {
    if (!user?.uid) return;
    setLoading(true);
    const nowInterested = !interested;
    setInterested(nowInterested);
    setInterestedUids(prev =>
      nowInterested ? [...prev, user.uid] : prev.filter(id => id !== user.uid)
    );
    try {
      await firestore().collection('events').doc(event.id).update({
        interestedUsers: nowInterested
          ? firestore.FieldValue.arrayUnion(user.uid)
          : firestore.FieldValue.arrayRemove(user.uid),
      });
      if (nowInterested && !isOwn) {
        await firestore().collection('notifications').add({
          toUserId: event.userId, fromUserId: user.uid,
          fromUserName: userProfile?.name || 'Someone', fromUserAvatar: userProfile?.avatarUrl || '',
          type: 'interested', eventId: event.id,
          message: `${userProfile?.name || 'Someone'} is interested in your event "${event.title}"`,
          read: false, createdAt: firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch {
      setInterested(!nowInterested);
      setInterestedUids(prev =>
        nowInterested ? prev.filter(id => id !== user.uid) : [...prev, user.uid]
      );
    } finally { setLoading(false); }
  };

  const handleDelete = () => {
    Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await firestore().collection('events').doc(event.id).delete(); navigation.goBack(); }
          catch { Alert.alert('Error', 'Failed to delete event'); }
        },
      },
    ]);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {event.imageUrl ? (
        <Image source={{ uri: event.imageUrl }} style={styles.heroImg} resizeMode="cover" />
      ) : (
        <View style={[styles.heroPlaceholder, { backgroundColor: colors.warmBg }]}>
          <Ionicons name={iconName} size={72} color={colors.saffron} />
        </View>
      )}

      {/* Category badge */}
      <View style={[styles.catBadgeWrap, { backgroundColor: colors.card }]}>
        <View style={[styles.catBadge, { backgroundColor: colors.saffron }]}>
          <Ionicons name={iconName} size={12} color="#fff" />
          <Text style={styles.catBadgeTxt}>{event.category || 'Event'}</Text>
        </View>
      </View>

      <View style={[styles.content, { backgroundColor: colors.card }]}>
        <Text style={[styles.eventTitle, { color: colors.darkText }]}>{event.title}</Text>

        {/* Date & Time */}
        <View style={[styles.infoRow, { borderColor: colors.border }]}>
          <View style={[styles.infoIcon, { backgroundColor: colors.offwhite }]}>
            <Ionicons name="calendar-outline" size={20} color={colors.saffron} />
          </View>
          <View style={styles.infoText}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Date & Time</Text>
            <Text style={[styles.infoValue, { color: colors.darkText }]}>{formatFullDate(event.date)}</Text>
            <Text style={[styles.infoSub, { color: colors.muted }]}>{formatTime(event.date)}</Text>
          </View>
        </View>

        {/* Location */}
        <View style={[styles.infoRow, { borderColor: colors.border }]}>
          <View style={[styles.infoIcon, { backgroundColor: colors.offwhite }]}>
            <Ionicons name="location-outline" size={20} color={colors.saffron} />
          </View>
          <View style={styles.infoText}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Location</Text>
            <Text style={[styles.infoValue, { color: colors.darkText }]}>{event.location || 'TBA'}</Text>
          </View>
        </View>

        {/* interested count  */}
        <TouchableOpacity
          style={[styles.infoRow, { borderColor: colors.border }]}
          onPress={() => isOwn && count > 0 && setShowPeople(true)}
          activeOpacity={isOwn && count > 0 ? 0.7 : 1}>
          <View style={[styles.infoIcon, { backgroundColor: colors.offwhite }]}>
            <Ionicons name="people-outline" size={20} color={colors.saffron} />
          </View>
          <View style={styles.infoText}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Interested</Text>
            <Text style={[styles.infoValue, { color: colors.darkText }]}>
              {count} {count === 1 ? 'person' : 'people'}
            </Text>
            {/* organizer hint */}
            {isOwn && count > 0 && (
              <Text style={[styles.infoSub, { color: colors.saffron }]}>Tap to see who's interested →</Text>
            )}
          </View>
          {isOwn && count > 0 && (
            <Ionicons name="chevron-forward" size={18} color={colors.saffron} />
          )}
        </TouchableOpacity>

        {/* Description */}
        {event.description ? (
          <View style={styles.descSection}>
            <Text style={[styles.descTitle, { color: colors.darkText }]}>About this Event</Text>
            <Text style={[styles.descText, { color: colors.muted }]}>{event.description}</Text>
          </View>
        ) : null}

        {/* Organizer */}
        <TouchableOpacity
          style={[styles.organizerRow, { backgroundColor: colors.offwhite, borderColor: colors.border }]}
          onPress={() => navigation.navigate('UserProfile', { userId: event.userId })}>
          {event.userAvatar
            ? <Image source={{ uri: event.userAvatar }} style={styles.organizerAvatar} />
            : <View style={[styles.organizerAvatarInit, { backgroundColor: colors.saffron }]}>
                <Text style={styles.initTxt}>{initials(event.userName || '')}</Text>
              </View>
          }
          <View style={styles.organizerInfo}>
            <Text style={[styles.organizerLabel, { color: colors.muted }]}>Organized by</Text>
            <Text style={[styles.organizerName, { color: colors.darkText }]}>{event.userName || 'Artist'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </TouchableOpacity>

        {/* Interested button*/}
        {!isOwn && (
          <TouchableOpacity
            style={[styles.interestedBtn,
              interested
                ? { backgroundColor: colors.warmBg, borderColor: colors.border, borderWidth: 1 }
                : { backgroundColor: colors.saffron }]}
            onPress={toggleInterested} disabled={loading}>
            {loading
              ? <ActivityIndicator color={interested ? colors.saffron : '#fff'} />
              : <>
                  <Ionicons name={interested ? 'star' : 'star-outline'} size={18} color={interested ? colors.saffron : '#fff'} />
                  <Text style={[styles.interestedBtnTxt, { color: interested ? colors.saffron : '#fff' }]}>
                    {interested ? "You're Interested" : "Mark as Interested"}
                  </Text>
                </>
            }
          </TouchableOpacity>
        )}

        {/* Organizer can see interested list button */}
        {isOwn && (
          <TouchableOpacity
            style={[styles.seeInterestedBtn, { backgroundColor: colors.offwhite, borderColor: colors.border }]}
            onPress={() => setShowPeople(true)}
            disabled={count === 0}>
            <Ionicons name="people-outline" size={18} color={count === 0 ? colors.muted : colors.saffron} />
            <Text style={[styles.seeInterestedTxt, { color: count === 0 ? colors.muted : colors.saffron }]}>
              {count === 0 ? 'No one interested yet' : `See all ${count} interested ${count === 1 ? 'person' : 'people'}`}
            </Text>
            {count > 0 && <Ionicons name="chevron-forward" size={16} color={colors.saffron} />}
          </TouchableOpacity>
        )}

        {/* Delete button (own events) */}
        {isOwn && (
          <TouchableOpacity style={[styles.deleteBtn, { borderColor: '#FF4444' }]} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={16} color="#FF4444" />
            <Text style={styles.deleteBtnTxt}>Delete Event</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 30 }} />
      </View>

      {/* interested People Modal */}
      <InterestedPeopleModal
        visible={showPeople}
        onClose={() => setShowPeople(false)}
        interestedUids={interestedUids}
        navigation={navigation}
        colors={colors}
      />
    </ScrollView>
  );
}

// all event list
function AllEventsList({ navigation, colors, user }: any) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    firestore().collection('events').orderBy('date', 'asc').get()
      .then(async snap => {
        const list = await Promise.all(snap.docs.map(async d => {
          const e = { id: d.id, ...d.data() } as Event;
          try {
            const u = await firestore().collection('users').doc(e.userId).get();
            return { ...e, userName: u.data()?.name || 'Artist', userAvatar: u.data()?.avatarUrl || '' };
          } catch { return e; }
        }));
        setEvents(list);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator size="large" color={colors.saffron} style={{ marginTop: 60 }} />;

  return (
    <FlatList
      data={events}
      keyExtractor={e => e.id}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={56} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.darkText }]}>No events yet</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>Be the first to add an event!</Text>
        </View>
      }
      renderItem={({ item }) => {
        const iconName = (CATEGORY_ICONS[item.category] || CATEGORY_ICONS['default']) as any;
        const isInterested = (item.interestedUsers || []).includes(user?.uid);
        const isOwn = item.userId === user?.uid;
        return (
          <TouchableOpacity
            style={[styles.eventListCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate('EventDetail', { event: item })}
            activeOpacity={0.85}>
            {item.imageUrl
              ? <Image source={{ uri: item.imageUrl }} style={styles.eventListImg} />
              : <View style={[styles.eventListImgPlaceholder, { backgroundColor: colors.warmBg }]}>
                  <Ionicons name={iconName} size={32} color={colors.saffron} />
                </View>
            }
            <View style={styles.eventListInfo}>
              <View style={[styles.eventListDateBadge, { backgroundColor: colors.saffron }]}>
                <Text style={styles.eventListDateTxt}>{formatShortDate(item.date)}</Text>
              </View>
              <Text style={[styles.eventListTitle, { color: colors.darkText }]} numberOfLines={2}>{item.title}</Text>
              <View style={styles.eventListMeta}>
                <Ionicons name="location-outline" size={12} color={colors.muted} />
                <Text style={[styles.eventListLocation, { color: colors.muted }]} numberOfLines={1}>{item.location || 'TBA'}</Text>
              </View>
              <View style={styles.eventListMeta}>
                <Ionicons name="people-outline" size={12} color={colors.muted} />
                <Text style={[styles.eventListLocation, { color: colors.muted }]}>
                  {item.interestedUsers?.length || 0} interested
                </Text>
                {isInterested && <Ionicons name="checkmark-circle" size={12} color={colors.saffron} />}
                {isOwn && (
                  <View style={[styles.myEventTag, { backgroundColor: colors.saffron }]}>
                    <Text style={styles.myEventTagTxt}>My Event</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

// main export
export default function EventDetailScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { user, userProfile } = useAuthStore();
  const showAll = route.params?.showAll;
  const eventParam = route.params?.event;

  return (
    <View style={[styles.container, { backgroundColor: colors.offwhite }]}>
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.darkText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.darkText }]}>
          {showAll ? 'All Events' : 'Event Details'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {showAll
        ? <AllEventsList navigation={navigation} colors={colors} user={user} userProfile={userProfile} />
        : eventParam
          ? <SingleEventDetail event={eventParam} navigation={navigation} colors={colors} user={user} userProfile={userProfile} />
          : null
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  heroImg: { width: '100%', height: 240, resizeMode: 'cover' },
  heroPlaceholder: { width: '100%', height: 180, justifyContent: 'center', alignItems: 'center' },
  catBadgeWrap: { paddingHorizontal: 16, paddingTop: 16 },
  catBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  catBadgeTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  content: { margin: 12, borderRadius: 16, padding: 20, gap: 16 },
  eventTitle: { fontSize: 22, fontWeight: 'bold', lineHeight: 30 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingBottom: 16, borderBottomWidth: 0.5 },
  infoIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 12, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600' },
  infoSub: { fontSize: 13, marginTop: 2 },
  descSection: { gap: 8 },
  descTitle: { fontSize: 16, fontWeight: '700' },
  descText: { fontSize: 14, lineHeight: 22 },
  organizerRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, gap: 12, borderWidth: 1 },
  organizerAvatar: { width: 44, height: 44, borderRadius: 22 },
  organizerAvatarInit: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  initTxt: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  organizerInfo: { flex: 1 },
  organizerLabel: { fontSize: 12 },
  organizerName: { fontSize: 15, fontWeight: '600' },
  interestedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 14 },
  interestedBtnTxt: { fontSize: 16, fontWeight: '700' },
  seeInterestedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 14, borderWidth: 1 },
  seeInterestedTxt: { fontSize: 15, fontWeight: '600', flex: 1 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  deleteBtnTxt: { color: '#FF4444', fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%', minHeight: 300 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 0.5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalSub: { fontSize: 13, marginTop: 2 },
  modalLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  modalEmpty: { alignItems: 'center', paddingVertical: 50, gap: 12 },
  modalEmptyTxt: { fontSize: 15 },
  personItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5 },
  personAvatar: { width: 48, height: 48, borderRadius: 24 },
  personAvatarInit: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  personInitTxt: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  personInfo: { flex: 1 },
  personName: { fontSize: 15, fontWeight: '700' },
  personCat: { fontSize: 13, marginTop: 2 },
  eventListCard: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, overflow: 'hidden', gap: 12 },
  eventListImg: { width: 100, height: 110, resizeMode: 'cover' },
  eventListImgPlaceholder: { width: 100, height: 110, justifyContent: 'center', alignItems: 'center' },
  eventListInfo: { flex: 1, padding: 12, gap: 4 },
  eventListDateBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  eventListDateTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },
  eventListTitle: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  eventListMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventListLocation: { fontSize: 12, flex: 1 },
  myEventTag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  myEventTagTxt: { color: '#fff', fontSize: 9, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold' },
  emptyText: { fontSize: 14 },
});