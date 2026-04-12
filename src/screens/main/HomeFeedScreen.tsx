import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Pressable, Image, FlatList,
  RefreshControl, Dimensions, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, Share,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import firestore from '@react-native-firebase/firestore';
import Video from 'react-native-video';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LanguageContext';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');
const CAPTION_LIMIT = 120;

interface Post {
  id: string; userId: string; imageUrl: string;
  mediaItems?: { url: string; type: 'image' | 'video' }[];
  title: string; caption: string; category: string;
  techniques?: string;
  likes: string[]; bookmarks: string[];
  commentCount: number; viewCount?: number; createdAt: any;
  userName?: string; userAvatar?: string; userCategory?: string;
}
interface Comment {
  id: string; userId: string; userName: string;
  userAvatar: string; text: string; createdAt: any; replyTo?: string;
}
interface Event {
  id: string; userId: string; title: string; description: string;
  location: string; date: any; imageUrl?: string; category: string;
  interestedUsers: string[]; createdAt: any;
  userName?: string; userAvatar?: string;
}

//helpers
const isVideoUrl = (url: string) =>
  url?.includes('/video/upload/') || url?.endsWith('.mp4') || url?.endsWith('.mov');

function initials(name: string) { return (name || 'A').charAt(0).toUpperCase(); }

function formatEventDate(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// card width
const CARD_WIDTH = width - 24;

// meadia swiper
function MediaSwiper({ mediaItems, imageUrl, colors, visible }: {
  mediaItems?: { url: string; type: 'image' | 'video' }[];
  imageUrl: string; colors: any; visible: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const items = (mediaItems && mediaItems.length > 0)
    ? mediaItems
    : [{ url: imageUrl, type: (isVideoUrl(imageUrl) ? 'video' : 'image') as 'image' | 'video' }];

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= items.length) return;
    flatListRef.current?.scrollToIndex({ index: idx, animated: true });
    setActiveIndex(idx);
  };

  const mediaStyle = { width: CARD_WIDTH, height: CARD_WIDTH };

  if (items.length === 1) {
    const item = items[0];
    return item.type === 'video'
      ? <Video source={{ uri: item.url }} style={mediaStyle} resizeMode="cover"
          controls paused={!visible} repeat={false} />
      : <Image source={{ uri: item.url }} style={mediaStyle} resizeMode="cover" />;
  }

  return (
    <View style={{ position: 'relative' }}>
      <FlatList
        ref={flatListRef}
        data={items} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        getItemLayout={(_, i) => ({ length: CARD_WIDTH, offset: CARD_WIDTH * i, index: i })}
        onMomentumScrollEnd={e => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH))}
        renderItem={({ item, index }) => (
          item.type === 'video'
            ? <Video source={{ uri: item.url }} style={mediaStyle} resizeMode="cover"
                controls paused={!(visible && index === activeIndex)} repeat={false} />
            : <Image source={{ uri: item.url }} style={mediaStyle} resizeMode="cover" />
        )}
      />

      {/* prev arrow */}
      {activeIndex > 0 && (
        <TouchableOpacity style={styles.swiperArrowLeft} onPress={() => goTo(activeIndex - 1)}>
          <View style={styles.swiperArrowBg}>
            <Ionicons name="chevron-back" size={18} color="#fff" />
          </View>
        </TouchableOpacity>
      )}

      {/* next arrow */}
      {activeIndex < items.length - 1 && (
        <TouchableOpacity style={styles.swiperArrowRight} onPress={() => goTo(activeIndex + 1)}>
          <View style={styles.swiperArrowBg}>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </View>
        </TouchableOpacity>
      )}

      {/* dots & counter */}
      <View style={styles.dotsRow}>
        {items.length <= 6
          ? items.map((_, i) => (
              <View key={i} style={[styles.dot,
                { backgroundColor: i === activeIndex ? colors.saffron : 'rgba(255,255,255,0.7)' },
                i === activeIndex && styles.dotActive]} />
            ))
          : (
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>{activeIndex + 1} / {items.length}</Text>
            </View>
          )
        }
      </View>
    </View>
  );
}

function CaptionText({ caption, techniques, colors }: { caption: string; techniques?: string; colors: any }) {
  const [exp, setExp] = useState(false);

  const parts: string[] = [];
  if (caption) parts.push(caption);
  if (techniques) parts.push(`🔧 ${techniques}`);
  const fullText = parts.join('\n');

  if (!fullText) return null;

  const isLong = fullText.length > CAPTION_LIMIT;
  const shown = exp ? fullText : fullText.slice(0, CAPTION_LIMIT);

  return (
    <Text style={[styles.captionDesc, { color: colors.muted }]}>
      {shown}
      {isLong && !exp && (
        <Text onPress={() => setExp(true)} style={{ color: colors.saffron, fontWeight: '600' }}>
          {'... '}read more
        </Text>
      )}
      {isLong && exp && (
        <Text onPress={() => setExp(false)} style={{ color: colors.saffron, fontWeight: '600' }}>
          {' '}show less
        </Text>
      )}
    </Text>
  );
}

// event bar
const CATEGORY_META: Record<string, { icon: string; grad: [string, string] }> = {
  'Exhibition': { icon: 'color-palette-outline',  grad: ['#D4651A', '#8B3A1A'] },
  'Workshop':   { icon: 'construct-outline',       grad: ['#1A6B5C', '#2D5016'] },
  'Festival':   { icon: 'musical-notes-outline',   grad: ['#7B3FA0', '#4A1A6B'] },
  'Concert':    { icon: 'mic-outline',             grad: ['#1A4D8B', '#0D2B4F'] },
  'Cultural':   { icon: 'globe-outline',           grad: ['#B8860B', '#7A5800'] },
  'Competition':{ icon: 'trophy-outline',          grad: ['#C4834A', '#8B3A1A'] },
  'Craft Fair': { icon: 'basket-outline',          grad: ['#2D8B5C', '#1A5C3A'] },
  'default':    { icon: 'calendar-outline',        grad: ['#D4651A', '#8B3A1A'] },
};

function EventsBar({ navigation, colors, currentUserId }: { navigation: any; colors: any; currentUserId?: string }) {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    firestore().collection('events').orderBy('date', 'asc').limit(15).get()
      .then(snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Event));
        Promise.all(list.map(async e => {
          try {
            const u = await firestore().collection('users').doc(e.userId).get();
            return { ...e, userName: u.data()?.name || 'Artist', userAvatar: u.data()?.avatarUrl || '' };
          } catch { return e; }
        })).then(setEvents);
      }).catch(() => { });
  }, []);

  if (events.length === 0) return null;

  // parse day & month separately
  const parseDate = (ts: any) => {
    if (!ts) return { day: '', month: '' };
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return {
      day: d.toLocaleDateString('en-US', { day: 'numeric' }),
      month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    };
  };

  return (
    <View style={[styles.eventsSection, { borderBottomColor: colors.border }]}>
      {/* Header */}
      <View style={styles.eventsSectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[styles.eventsHeaderDot, { backgroundColor: colors.saffron }]} />
          <Text style={[styles.eventsSectionTitle, { color: colors.darkText }]}>Upcoming Events</Text>
        </View>
        <TouchableOpacity
          style={[styles.seeAllBtn, { borderColor: colors.saffron }]}
          onPress={() => navigation.navigate('EventDetail', { showAll: true })}>
          <Text style={[styles.seeAllTxt, { color: colors.saffron }]}>See all</Text>
          <Ionicons name="arrow-forward" size={12} color={colors.saffron} />
        </TouchableOpacity>
      </View>

      {/* Cards */}
      <FlatList
        data={events} horizontal showsHorizontalScrollIndicator={false}
        keyExtractor={e => e.id}
        contentContainerStyle={{ paddingHorizontal: 14, gap: 12, paddingBottom: 16 }}
        renderItem={({ item }) => {
          const meta = CATEGORY_META[item.category] || CATEGORY_META['default'];
          const isOrganizer = item.userId === currentUserId;
          const interestedCount = (item.interestedUsers || []).length;
          const iAmInterested = (item.interestedUsers || []).includes(currentUserId || '');
          const { day, month } = parseDate(item.date);

          return (
            <TouchableOpacity
              style={styles.eventCard}
              onPress={() => navigation.navigate('EventDetail', { event: item })}
              activeOpacity={0.88}>

              <View style={[styles.eventCardBg, { backgroundColor: meta.grad[1] }]}>
                {/* background */}
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.eventCardBgImg} />
                ) : (
                  <View style={[styles.eventCardNoBg, { backgroundColor: meta.grad[0] }]}>
                    <Ionicons name={meta.icon as any} size={56} color="rgba(255,255,255,0.55)" />
                  </View>
                )}

                <View style={styles.eventCardGradient} />

                <View style={[styles.eventDatePill, { backgroundColor: meta.grad[0] }]}>
                  <Text style={styles.eventDateDay}>{day}</Text>
                  <Text style={styles.eventDateMonth}>{month}</Text>
                </View>

                <View style={styles.eventTopRight}>
                  {isOrganizer && (
                    <View style={[styles.organizerBadge, { backgroundColor: meta.grad[0] }]}>
                      <Ionicons name="star" size={9} color="#fff" />
                      <Text style={styles.organizerBadgeTxt}>My Event</Text>
                    </View>
                  )}
                  {iAmInterested && !isOrganizer && (
                    <View style={styles.eventInterestedCheck}>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    </View>
                  )}
                </View>

                {/*bottom content */}
                <View style={styles.eventCardBottom}>
                  <View style={styles.eventCatTag}>
                    <Ionicons name={meta.icon as any} size={10} color="#fff" />
                    <Text style={styles.eventCatTagTxt}>{item.category}</Text>
                  </View>
                  <Text style={styles.eventCardTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={styles.eventCardLocRow}>
                    <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.eventCardLoc} numberOfLines={1}>{item.location || 'TBA'}</Text>
                  </View>
                  {/* Interested count — show only to organizer OR if > 0 */}
                  {(isOrganizer || interestedCount > 0) && (
                    <View style={styles.eventInterestedRow}>
                      <Ionicons name="star-outline" size={11} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.eventInterestedCountTxt}>
                        {isOrganizer
                          ? `${interestedCount} interested`
                          : `${interestedCount} interested`}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

//main screen
export default function HomeFeedScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { t } = useLang();
  const { userProfile, user, logout } = useAuthStore();

  const [showDropdown, setShowDropdown] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [followingList, setFollowingList] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<{ id: string; userName: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [visiblePostIds, setVisiblePostIds] = useState<Set<string>>(new Set());

  // notification badge listner
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = firestore()
      .collection('notifications')
      .where('toUserId', '==', user.uid)
      .where('read', '==', false)
      .onSnapshot(snap => setUnreadCount(snap.size), () => { });
    return () => unsub();
  }, [user]);

  const fetchPosts = useCallback(async () => {
    try {
      const snap = await firestore().collection('posts').orderBy('createdAt', 'desc').limit(20).get();
      const postsData = await Promise.all(snap.docs.map(async doc => {
        const data = doc.data();
        try {
          const u = await firestore().collection('users').doc(data.userId).get();
          const ud = u.data();
          return { id: doc.id, ...data, userName: ud?.name || 'Unknown Artist', userAvatar: ud?.avatarUrl || '', userCategory: ud?.artistCategory || 'Folk Artist' } as Post;
        } catch {
          return { id: doc.id, ...data, userName: 'Unknown Artist', userAvatar: '', userCategory: 'Folk Artist' } as Post;
        }
      }));
      setPosts(postsData);
    } catch (e) { console.log('Feed error:', e); }
  }, []);

  const fetchFollowing = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const doc = await firestore().collection('users').doc(user.uid).get();
      setFollowingList(doc.data()?.following || []);
    } catch { }
  }, [user]);

  useEffect(() => { fetchPosts(); fetchFollowing(); }, []);

  const onRefresh = async () => { setRefreshing(true); await fetchPosts(); await fetchFollowing(); setRefreshing(false); };

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    setVisiblePostIds(new Set(viewableItems.map((v: any) => v.item.id)));
  }, []);
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

  // views &  milestone
  const incrementViews = async (postId: string, postUserId: string) => {
    if (!user?.uid || postUserId === user.uid) return;
    try {
      await firestore().collection('posts').doc(postId).update({ viewCount: firestore.FieldValue.increment(1) });
      const snap = await firestore().collection('posts').doc(postId).get();
      const views = snap.data()?.viewCount || 0;
      if ([10, 50, 100, 500, 1000].includes(views)) {
        await firestore().collection('notifications').add({
          toUserId: postUserId, fromUserId: user.uid,
          fromUserName: userProfile?.name || 'Someone', fromUserAvatar: userProfile?.avatarUrl || '',
          type: 'view_milestone', postId,
          message: `Your post reached ${views} views! 🎉`,
          read: false, createdAt: firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch { }
  };

  const handleLike = async (post: Post) => {
    if (!user?.uid) return;
    const liked = (post.likes || []).includes(user.uid);
    setPosts(prev => prev.map(p => p.id === post.id ? {
      ...p, likes: liked ? p.likes.filter(id => id !== user.uid) : [...(p.likes || []), user.uid],
    } : p));
    try {
      await firestore().collection('posts').doc(post.id).update({
        likes: liked ? firestore.FieldValue.arrayRemove(user.uid) : firestore.FieldValue.arrayUnion(user.uid),
      });
      if (!liked && post.userId !== user.uid) {
        await firestore().collection('notifications').add({
          toUserId: post.userId, fromUserId: user.uid,
          fromUserName: userProfile?.name || 'Someone', fromUserAvatar: userProfile?.avatarUrl || '',
          type: 'like', postId: post.id, postImage: post.imageUrl,
          message: `${userProfile?.name || 'Someone'} liked your post`,
          read: false, createdAt: firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (e) { fetchPosts(); }
  };

  const handleBookmark = async (post: Post) => {
    if (!user?.uid) return;
    const saved = (post.bookmarks || []).includes(user.uid);
    setPosts(prev => prev.map(p => p.id === post.id ? {
      ...p, bookmarks: saved ? p.bookmarks.filter(id => id !== user.uid) : [...(p.bookmarks || []), user.uid],
    } : p));
    try {
      await firestore().collection('posts').doc(post.id).update({
        bookmarks: saved ? firestore.FieldValue.arrayRemove(user.uid) : firestore.FieldValue.arrayUnion(user.uid),
      });
    } catch { fetchPosts(); }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!user?.uid || targetUserId === user.uid) return;
    const isFollowing = followingList.includes(targetUserId);
    setFollowingList(prev => isFollowing ? prev.filter(id => id !== targetUserId) : [...prev, targetUserId]);
    try {
      const myRef = firestore().collection('users').doc(user.uid);
      const targetRef = firestore().collection('users').doc(targetUserId);
      if (isFollowing) {
        await myRef.update({ following: firestore.FieldValue.arrayRemove(targetUserId) });
        await targetRef.update({ followers: firestore.FieldValue.arrayRemove(user.uid) });
      } else {
        await myRef.update({ following: firestore.FieldValue.arrayUnion(targetUserId) });
        await targetRef.update({ followers: firestore.FieldValue.arrayUnion(user.uid) });
        await firestore().collection('notifications').add({
          toUserId: targetUserId, fromUserId: user.uid,
          fromUserName: userProfile?.name || 'Someone', fromUserAvatar: userProfile?.avatarUrl || '',
          type: 'follow', message: `${userProfile?.name || 'Someone'} started following you`,
          read: false, createdAt: firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch { fetchFollowing(); }
  };

  const openComments = async (post: Post) => {
    setCommentPost(post); setComments([]); setReplyingTo(null); setCommentText(''); setLoadingComments(true);
    try {
      const snap = await firestore().collection('posts').doc(post.id).collection('comments').orderBy('createdAt', 'asc').get();
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
    } catch { } finally { setLoadingComments(false); }
  };

  const handleReply = (c: Comment) => { setReplyingTo({ id: c.id, userName: c.userName }); setCommentText(`@${c.userName} `); };
  const cancelReply = () => { setReplyingTo(null); setCommentText(''); };

  const sendComment = async () => {
    if (!commentText.trim() || !commentPost || !user?.uid) return;
    const text = commentText.trim();
    const replyToUser = replyingTo?.userName || null;
    const replyToId = replyingTo?.id || null;
    setCommentText(''); setReplyingTo(null);

    const tempId = `temp_${Date.now()}`;
    const tempComment: Comment = {
      id: tempId, userId: user.uid,
      userName: userProfile?.name || 'User', userAvatar: userProfile?.avatarUrl || '',
      text, createdAt: new Date(), replyTo: replyToUser || undefined,
    };
    setComments(prev => [...prev, tempComment]);
    try {
      const ref = await firestore().collection('posts').doc(commentPost.id).collection('comments').add({
        userId: user.uid, userName: userProfile?.name || 'User',
        userAvatar: userProfile?.avatarUrl || '', text,
        replyTo: replyToUser || null, createdAt: firestore.FieldValue.serverTimestamp(),
      });
      await firestore().collection('posts').doc(commentPost.id).update({ commentCount: firestore.FieldValue.increment(1) });
      setComments(prev => prev.map(c => c.id === tempId ? { ...c, id: ref.id } : c));
      setPosts(prev => prev.map(p => p.id === commentPost.id ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p));

      if (commentPost.userId !== user.uid) {
        await firestore().collection('notifications').add({
          toUserId: commentPost.userId, fromUserId: user.uid,
          fromUserName: userProfile?.name || 'Someone', fromUserAvatar: userProfile?.avatarUrl || '',
          type: 'comment', postId: commentPost.id, postImage: commentPost.imageUrl,
          message: `${userProfile?.name || 'Someone'} commented: ${text.slice(0, 60)}`,
          read: false, createdAt: firestore.FieldValue.serverTimestamp(),
        });
      }
      if (replyToId) {
        const original = comments.find(c => c.id === replyToId);
        if (original && original.userId !== user.uid) {
          await firestore().collection('notifications').add({
            toUserId: original.userId, fromUserId: user.uid,
            fromUserName: userProfile?.name || 'Someone', fromUserAvatar: userProfile?.avatarUrl || '',
            type: 'reply', postId: commentPost.id, postImage: commentPost.imageUrl,
            message: `${userProfile?.name || 'Someone'} replied to your comment`,
            read: false, createdAt: firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    } catch { setComments(prev => prev.filter(c => c.id !== tempId)); }
  };

  const formatTime = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return t.justNowText;
    if (diff < 3600) return `${Math.floor(diff / 60)}${t.mAgo}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}${t.hAgo}`;
    return `${Math.floor(diff / 86400)}${t.dAgo}`;
  };

  const handleLogout = async () => { setShowDropdown(false); await logout(); };

  const renderPost = ({ item }: { item: Post }) => {
    const liked = (item.likes || []).includes(user?.uid || '');
    const saved = (item.bookmarks || []).includes(user?.uid || '');
    const isFollowing = followingList.includes(item.userId);
    const isOwnPost = item.userId === user?.uid;
    const savedCount = item.bookmarks?.length || 0;
    const isVisible = visiblePostIds.has(item.id);

    return (
      <View style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Header */}
        <TouchableOpacity style={styles.postHeader} activeOpacity={0.85}
          onPress={() => { incrementViews(item.id, item.userId); navigation.navigate('UserProfile', { userId: item.userId }); }}>
          {item.userAvatar
            ? <Image source={{ uri: item.userAvatar }} style={styles.postAvatar} />
            : <View style={[styles.postAvatarInit, { backgroundColor: colors.saffron }]}>
                <Text style={styles.initTxt}>{initials(item.userName || '')}</Text>
              </View>
          }
          <View style={{ flex: 1 }}>
            <Text style={[styles.postUserName, { color: colors.darkText }]}>{item.userName}</Text>
            <Text style={[styles.postUserCat, { color: colors.muted }]}>{item.userCategory}</Text>
          </View>
          {!isOwnPost && (
            <TouchableOpacity
              style={[styles.followBtn, { borderColor: colors.saffron }, isFollowing && { backgroundColor: colors.warmBg, borderColor: colors.border }]}
              onPress={e => { (e as any).stopPropagation?.(); handleFollow(item.userId); }}>
              <Text style={[styles.followBtnTxt, { color: isFollowing ? colors.muted : colors.saffron }]}>
                {isFollowing ? t.following_btn : t.follow}
              </Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* media swiper */}
        <TouchableOpacity activeOpacity={1} onPress={() => incrementViews(item.id, item.userId)}>
          <MediaSwiper mediaItems={item.mediaItems} imageUrl={item.imageUrl} colors={colors} visible={isVisible} />
        </TouchableOpacity>

        {/* Actions */}
        <View style={styles.postActions}>
          <View style={styles.postActionsLeft}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item)}>
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={26} color={liked ? '#FF4444' : colors.darkText} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => openComments(item)}>
              <Ionicons name="chatbubble-outline" size={24} color={colors.darkText} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={async () => {
              try { await Share.share({ title: item.title || 'FolkChat', message: `${item.title || 'Folk art'}\nBy ${item.userName}\n\nShared from FolkChat` }); } catch { }
            }}>
              <Ionicons name="paper-plane-outline" size={24} color={colors.darkText} />
            </TouchableOpacity>
          </View>
          <View style={styles.bookmarkRow}>
            {isOwnPost && savedCount > 0 && <Text style={[styles.savedCount, { color: colors.muted }]}>{savedCount}</Text>}
            <TouchableOpacity onPress={() => handleBookmark(item)}>
              <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={24} color={saved ? colors.saffron : colors.darkText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Likes */}
        {(item.likes || []).length > 0 && (
          <Text style={[styles.likesCount, { color: colors.darkText }]}>
            {item.likes.length} {item.likes.length > 1 ? t.likes : t.like}
          </Text>
        )}

        {/* Title below likes */}
        {item.title ? (
          <View style={styles.captionRow}>
            <Text style={[styles.captionUser, { color: colors.darkText }]}>{item.userName} </Text>
            <Text style={[styles.captionTitle, { color: colors.darkText }]}>{item.title}</Text>
          </View>
        ) : null}

        {/*techniques &read more */}
        <View style={styles.captionWrap}>
          <CaptionText caption={item.caption} techniques={item.techniques} colors={colors} />
        </View>

        {item.category && (
          <View style={styles.categoryTag}>
            <Text style={[styles.categoryTagTxt, { color: colors.saffron }]}># {item.category}</Text>
          </View>
        )}

        {item.commentCount > 0 && (
          <TouchableOpacity onPress={() => openComments(item)}>
            <Text style={[styles.viewComments, { color: colors.muted }]}>
              {t.viewAllComments} {item.commentCount} {item.commentCount > 1 ? `${t.comment}s` : t.comment}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.postTime, { color: colors.muted }]}>{formatTime(item.createdAt)}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.warmBg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <Text style={[styles.logo, { color: colors.saffron }]}>Folk<Text style={{ color: colors.darkText }}>Chat</Text></Text>
        <View style={styles.headerRight}>
          {/* bell with badge */}
          <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notifications')}>
            <Ionicons name="notifications-outline" size={24} color={colors.darkText} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.saffron }]}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => setShowDropdown(true)}>
            {userProfile?.avatarUrl
              ? <Image source={{ uri: userProfile.avatarUrl }} style={[styles.avatar, { borderColor: colors.saffron }]} />
              : <View style={[styles.avatarInit, { backgroundColor: colors.saffron }]}>
                  <Text style={styles.avatarInitTxt}>{initials(userProfile?.name || user?.email || '')}</Text>
                </View>
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* feed with Events at top */}
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={renderPost}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 20 }}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.saffron]} />}
        ListHeaderComponent={<EventsBar navigation={navigation} colors={colors} currentUserId={user?.uid} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={56} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.darkText }]}>{t.noPostsYet}</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>{t.noPostsYetOwn}</Text>
          </View>
        }
      />

      {/* Comments Modal */}
      <Modal visible={commentPost !== null} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={styles.commentOverlay} onPress={() => { setCommentPost(null); setReplyingTo(null); }}>
            <Pressable style={[styles.commentSheet, { backgroundColor: colors.card }]}>
              <View style={[styles.commentHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.commentTitle, { color: colors.darkText }]}>Comments</Text>
                <TouchableOpacity onPress={() => { setCommentPost(null); setReplyingTo(null); }}>
                  <Ionicons name="close" size={24} color={colors.darkText} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.commentList} showsVerticalScrollIndicator={false}>
                {loadingComments
                  ? <Text style={[styles.loadingText, { color: colors.muted }]}>{t.loading}</Text>
                  : comments.length === 0
                    ? <Text style={[styles.noComments, { color: colors.muted }]}>{t.beFirstComment}</Text>
                    : comments.map(c => (
                        <View key={c.id} style={styles.commentItem}>
                          {c.userAvatar
                            ? <Image source={{ uri: c.userAvatar }} style={styles.commentAvatar} />
                            : <View style={[styles.commentAvatarInit, { backgroundColor: colors.saffron }]}>
                                <Text style={styles.initTxt}>{initials(c.userName)}</Text>
                              </View>
                          }
                          <View style={styles.commentContent}>
                            <Text style={[styles.commentUser, { color: colors.darkText }]}>{c.userName}</Text>
                            {c.replyTo
                              ? <Text style={[styles.commentText, { color: colors.darkText }]}>
                                  <Text style={{ color: colors.saffron, fontWeight: '600' }}>@{c.replyTo} </Text>
                                  {c.text.replace(`@${c.replyTo} `, '').replace(`@${c.replyTo}`, '')}
                                </Text>
                              : <Text style={[styles.commentText, { color: colors.darkText }]}>{c.text}</Text>
                            }
                            <TouchableOpacity style={styles.replyBtn} onPress={() => handleReply(c)}>
                              <Text style={[styles.replyBtnTxt, { color: colors.muted }]}>Reply</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                }
              </ScrollView>
              {replyingTo && (
                <View style={[styles.replyIndicator, { backgroundColor: colors.warmBg, borderTopColor: colors.border }]}>
                  <Text style={[styles.replyIndicatorTxt, { color: colors.muted }]}>
                    Replying to <Text style={{ color: colors.saffron, fontWeight: '600' }}>@{replyingTo.userName}</Text>
                  </Text>
                  <TouchableOpacity onPress={cancelReply}>
                    <Ionicons name="close-circle" size={18} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              )}
              <View style={[styles.commentInput, { borderTopColor: colors.border }]}>
                {userProfile?.avatarUrl
                  ? <Image source={{ uri: userProfile.avatarUrl }} style={styles.commentAvatar} />
                  : <View style={[styles.commentAvatarInit, { backgroundColor: colors.saffron }]}>
                      <Text style={styles.initTxt}>{initials(userProfile?.name || '')}</Text>
                    </View>
                }
                <TextInput
                  style={[styles.commentTextInput, { backgroundColor: colors.offwhite, color: colors.darkText }]}
                  placeholder={replyingTo ? `Reply to @${replyingTo.userName}...` : t.addComment}
                  placeholderTextColor={colors.muted}
                  value={commentText} onChangeText={setCommentText}
                  multiline autoFocus={!!replyingTo}
                />
                <TouchableOpacity onPress={sendComment} disabled={!commentText.trim()}>
                  <Ionicons name="send" size={22} color={commentText.trim() ? colors.saffron : colors.muted} />
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* dropdown */}
      <Modal visible={showDropdown} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowDropdown(false)}>
          <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.dropdownHeader}>
              <Text style={[styles.dropdownName, { color: colors.darkText }]}>{userProfile?.name || 'Your Name'}</Text>
              <Text style={[styles.dropdownEmail, { color: colors.muted }]}>{user?.email || ''}</Text>
            </View>
            <View style={[styles.dropdownDivider, { backgroundColor: colors.border }]} />
            {[
              { icon: 'person-outline', label: t.myProfile, onPress: () => { setShowDropdown(false); navigation.navigate('UserProfile', { userId: user?.uid }); } },
              { icon: 'analytics-outline', label: t.analytics, onPress: () => { setShowDropdown(false); navigation.navigate('Analytics'); } },
              { icon: 'create-outline', label: t.editProfile, onPress: () => { setShowDropdown(false); navigation.navigate('EditProfile'); } },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={styles.dropdownItem} onPress={item.onPress}>
                <Ionicons name={item.icon as any} size={18} color={colors.darkText} />
                <Text style={[styles.dropdownLabel, { color: colors.darkText }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={[styles.dropdownDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color="#FF4444" />
              <Text style={[styles.dropdownLabel, { color: '#FF4444' }]}>{t.logout}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, borderBottomWidth: 0.5 },
  logo: { fontSize: 22, fontWeight: 'bold' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifBtn: { padding: 4, position: 'relative' },
  badge: { position: 'absolute', top: -1, right: -1, minWidth: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  avatarBtn: { padding: 2 },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2 },
  avatarInit: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarInitTxt: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  eventsSection: { marginBottom: 10, borderBottomWidth: 0.5, paddingTop: 4 },
  eventsSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  eventsHeaderDot: { width: 8, height: 8, borderRadius: 4 },
  eventsSectionTitle: { fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  seeAllTxt: { fontSize: 12, fontWeight: '600' },
  eventCard: { width: 160, height: 200, borderRadius: 18, overflow: 'hidden', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8 },
  eventCardBg: { flex: 1, position: 'relative' },
  eventCardBgImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', resizeMode: 'cover' },
  eventCardNoBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  eventCardGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, backgroundColor: 'transparent', borderBottomLeftRadius: 18, borderBottomRightRadius: 18,
  },
  eventDatePill: { position: 'absolute', top: 12, left: 12, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, alignItems: 'center', minWidth: 38 },
  eventDateDay: { color: '#fff', fontSize: 16, fontWeight: '900', lineHeight: 18 },
  eventDateMonth: { color: 'rgba(255,255,255,0.85)', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  eventTopRight: { position: 'absolute', top: 10, right: 10, gap: 4, alignItems: 'flex-end' },
  organizerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  organizerBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },
  eventInterestedCheck: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 2 },
  eventCardBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10, gap: 3, backgroundColor: 'rgba(0,0,0,0.42)', borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  eventCatTag: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginBottom: 2 },
  eventCatTagTxt: { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  eventCardTitle: { color: '#fff', fontSize: 13, fontWeight: '800', lineHeight: 17 },
  eventCardLocRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  eventCardLoc: { color: 'rgba(255,255,255,0.85)', fontSize: 10, flex: 1 },
  eventInterestedRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  eventInterestedCountTxt: { color: 'rgba(255,255,255,0.85)', fontSize: 10 },
  postCard: { marginBottom: 12, marginHorizontal: 12, borderRadius: 16, borderWidth: 1, overflow: 'hidden', elevation: 2 },
  postHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  postAvatar: { width: 42, height: 42, borderRadius: 21 },
  postAvatarInit: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  initTxt: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  postUserName: { fontSize: 14, fontWeight: 'bold' },
  postUserCat: { fontSize: 12 },
  followBtn: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 5 },
  followBtnTxt: { fontSize: 13, fontWeight: '600' },
  dotsRow: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { width: 18 },
  swiperArrowLeft: { position: 'absolute', left: 10, top: '50%', marginTop: -16, zIndex: 10 },
  swiperArrowRight: { position: 'absolute', right: 10, top: '50%', marginTop: -16, zIndex: 10 },
  swiperArrowBg: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  counterBadge: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  counterText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  postActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  postActionsLeft: { flexDirection: 'row', gap: 18 },
  actionBtn: { padding: 2 },
  bookmarkRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  savedCount: { fontSize: 12, fontWeight: '600' },
  likesCount: { paddingHorizontal: 14, fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  captionRow: { flexDirection: 'row', paddingHorizontal: 14, paddingTop: 2, flexWrap: 'wrap' },
  captionUser: { fontSize: 13, fontWeight: 'bold' },
  captionTitle: { fontSize: 13 },
  captionWrap: { paddingHorizontal: 14 },
  captionDesc: { fontSize: 13, lineHeight: 20, marginTop: 2 },
  categoryTag: { paddingHorizontal: 14, paddingVertical: 4 },
  categoryTagTxt: { fontSize: 12, fontWeight: '500' },
  viewComments: { paddingHorizontal: 14, fontSize: 13, marginBottom: 2 },
  postTime: { paddingHorizontal: 14, paddingBottom: 12, fontSize: 11 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold' },
  emptyText: { fontSize: 14 },
  commentOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  commentSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '75%' },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 0.5 },
  commentTitle: { fontSize: 16, fontWeight: 'bold' },
  commentList: { flex: 1, padding: 16 },
  loadingText: { textAlign: 'center', marginTop: 20 },
  noComments: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  commentItem: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18 },
  commentAvatarInit: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  commentContent: { flex: 1 },
  commentUser: { fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  commentText: { fontSize: 13, lineHeight: 18 },
  replyBtn: { marginTop: 4 },
  replyBtnTxt: { fontSize: 12, fontWeight: '600' },
  replyIndicator: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 0.5 },
  replyIndicatorTxt: { fontSize: 13 },
  commentInput: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: 0.5 },
  commentTextInput: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, maxHeight: 80 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  dropdown: { position: 'absolute', top: 80, right: 16, borderRadius: 16, width: 220, elevation: 8, borderWidth: 0.5 },
  dropdownHeader: { padding: 16, paddingBottom: 12 },
  dropdownName: { fontSize: 15, fontWeight: 'bold' },
  dropdownEmail: { fontSize: 12, marginTop: 2 },
  dropdownDivider: { height: 0.5 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingHorizontal: 16 },
  dropdownLabel: { fontSize: 14, fontWeight: '500' },
});