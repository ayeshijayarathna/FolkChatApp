import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, Dimensions, RefreshControl,
  Modal, Alert, FlatList, Pressable, Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import Video from 'react-native-video';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LanguageContext';
import { useAuthStore } from '../../store/authStore';
import { COLORS } from '../../constants/colors';

const { width } = Dimensions.get('window');
const GRID_GAP = 2;
const GRID_SIZE = (width - GRID_GAP * 4) / 3;

function initials(name: string) { return (name || 'A').charAt(0).toUpperCase(); }

const isVideoUrl = (url: string) =>
  url?.includes('/video/upload/') || url?.endsWith('.mp4') || url?.endsWith('.mov');

function PostMediaSwiper({ post, colors }: { post: any; colors: any }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const items: { url: string; type: 'image' | 'video' }[] =
    post.mediaItems && post.mediaItems.length > 0
      ? post.mediaItems
      : [{ url: post.imageUrl, type: isVideoUrl(post.imageUrl) ? 'video' : 'image' }];

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= items.length) return;
    flatRef.current?.scrollToIndex({ index: idx, animated: true });
    setActiveIndex(idx);
  };

  return (
    <View style={{ position: 'relative' }}>
      <FlatList
        ref={flatRef}
        data={items}
        horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={e => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index }) => (
          item.type === 'video'
            ? <Video source={{ uri: item.url }} style={{ width, height: width, backgroundColor: '#000' }} resizeMode="contain" controls paused={index !== activeIndex} />
            : <Image source={{ uri: item.url }} style={{ width, height: width, backgroundColor: '#000' }} resizeMode="contain" />
        )}
      />
      {activeIndex > 0 && (
        <TouchableOpacity style={sw.arrowLeft} onPress={() => goTo(activeIndex - 1)}>
          <View style={sw.arrowBg}><Ionicons name="chevron-back" size={18} color="#fff" /></View>
        </TouchableOpacity>
      )}
      {activeIndex < items.length - 1 && (
        <TouchableOpacity style={sw.arrowRight} onPress={() => goTo(activeIndex + 1)}>
          <View style={sw.arrowBg}><Ionicons name="chevron-forward" size={18} color="#fff" /></View>
        </TouchableOpacity>
      )}
      {items.length > 1 && (
        <View style={sw.dotsRow}>
          {items.length <= 8
            ? items.map((_, i) => (
                <View key={i} style={[sw.dot,
                  { backgroundColor: i === activeIndex ? colors.saffron : 'rgba(255,255,255,0.6)' },
                  i === activeIndex && sw.dotActive]} />
              ))
            : <View style={sw.counter}><Text style={sw.counterTxt}>{activeIndex + 1} / {items.length}</Text></View>
          }
        </View>
      )}
    </View>
  );
}

const sw = StyleSheet.create({
  arrowLeft: { position: 'absolute', left: 10, top: '50%', marginTop: -16, zIndex: 10 },
  arrowRight: { position: 'absolute', right: 10, top: '50%', marginTop: -16, zIndex: 10 },
  arrowBg: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dotsRow: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { width: 18 },
  counter: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  counterTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },
});

//social link button
function SocialLinkButton({ platform, url, colors }: {
  platform: 'facebook' | 'instagram';
  url: string;
  colors: any;
}) {
  if (!url) return null;

  const config = {
    facebook: {
      icon: 'logo-facebook' as const,
      color: '#1877F2',
      bg: '#1877F210',
      label: 'Facebook ',
    },
    instagram: {
      icon: 'logo-instagram' as const,
      color: '#E1306C',
      bg: '#E1306C10',
      label: 'Instagram',
    },
  }[platform];

  const handleOpen = async () => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot open', `Could not open ${config.label} link.`);
      }
    } catch {
      Alert.alert('Error', `Failed to open ${config.label}`);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.socialBtn, { backgroundColor: config.bg }]}
      onPress={handleOpen}
      activeOpacity={0.75}>
      <Ionicons name={config.icon} size={17} color={config.color} />
      <Text style={[styles.socialBtnText, { color: config.color }]}>{config.label}</Text>
    </TouchableOpacity>
  );
}

export default function UserProfileScreen({ navigation, route }: any) {
  const { userId } = route.params;
  const { colors } = useTheme();
  const { t } = useLang();
  const { user } = useAuthStore();
  const isOwnProfile = userId === user?.uid;

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [postMenuPost, setPostMenuPost] = useState<any>(null);

  const loadData = async () => {
    try {
      const userDoc = await firestore().collection('users').doc(userId).get();
      if (userDoc.exists()) {
        const data = userDoc.data();
        setProfile(data);
        setIsFollowing(data?.followers?.includes(user?.uid) || false);
      }
      const postsSnap = await firestore().collection('posts').where('userId', '==', userId).get();
      const postsList = postsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => (b.createdAt?.toDate?.() || new Date(0)) - (a.createdAt?.toDate?.() || new Date(0)));
      setPosts(postsList);
      if (isOwnProfile) {
        const savedSnap = await firestore().collection('posts').where('bookmarks', 'array-contains', userId).get();
        setSavedPosts(savedSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (e) { console.log('UserProfile error:', e); }
  };

  useEffect(() => { loadData(); }, [userId]);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const handleFollow = async () => {
    if (!user?.uid) return;
    const myRef = firestore().collection('users').doc(user.uid);
    const targetRef = firestore().collection('users').doc(userId);
    if (isFollowing) {
      await myRef.update({ following: firestore.FieldValue.arrayRemove(userId) });
      await targetRef.update({ followers: firestore.FieldValue.arrayRemove(user.uid) });
      setIsFollowing(false);
      setProfile((prev: any) => ({ ...prev, followers: (prev.followers || []).filter((id: string) => id !== user.uid) }));
    } else {
      await myRef.update({ following: firestore.FieldValue.arrayUnion(userId) });
      await targetRef.update({ followers: firestore.FieldValue.arrayUnion(user.uid) });
      setIsFollowing(true);
      setProfile((prev: any) => ({ ...prev, followers: [...(prev.followers || []), user.uid] }));
      await firestore().collection('notifications').add({
        toUserId: userId, fromUserId: user.uid,
        fromUserName: profile?.name || 'Someone', fromUserAvatar: profile?.avatarUrl || '',
        type: 'follow', message: `${profile?.name || 'Someone'} started following you`,
        read: false, createdAt: firestore.FieldValue.serverTimestamp(),
      }).catch(() => { });
    }
  };

  const handleDeletePost = (post: any) => {
    Alert.alert('Delete Post', 'Permanently delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await firestore().collection('posts').doc(post.id).delete();
          setPosts(prev => prev.filter(p => p.id !== post.id));
          setSavedPosts(prev => prev.filter(p => p.id !== post.id));
          setPostMenuPost(null); setSelectedPost(null);
        } catch { Alert.alert('Error', 'Failed to delete post'); }
      }},
    ]);
  };

  const renderGridItem = ({ item: post }: { item: any }) => {
    const hasMultiple = post.mediaItems && post.mediaItems.length > 1;
    return (
      <TouchableOpacity style={styles.gridItem}
        onPress={() => setSelectedPost(post)}
        onLongPress={() => isOwnProfile && setPostMenuPost(post)}
        activeOpacity={0.85}>
        {isVideoUrl(post.imageUrl) ? (
          <View style={styles.videoGridItem}>
            <Ionicons name="play-circle" size={32} color="#fff" />
          </View>
        ) : (
          <Image source={{ uri: post.imageUrl }} style={styles.gridImg} resizeMode="cover" />
        )}
        {hasMultiple && (
          <View style={styles.multiMediaBadge}>
            <Ionicons name="copy-outline" size={11} color="#fff" />
            <Text style={styles.multiMediaTxt}>{post.mediaItems.length}</Text>
          </View>
        )}
        {post.likes?.length > 0 && (
          <View style={styles.gridLikes}>
            <Ionicons name="heart" size={12} color="#fff" />
            <Text style={styles.gridLikesText}>{post.likes.length}</Text>
          </View>
        )}
        {isVideoUrl(post.imageUrl) && (
          <View style={styles.videoGridBadge}>
            <Ionicons name="videocam" size={12} color="#fff" />
          </View>
        )}
        {isOwnProfile && (
          <TouchableOpacity style={styles.gridMenuBtn} onPress={() => setPostMenuPost(post)}>
            <Ionicons name="ellipsis-vertical" size={14} color="#fff" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const hasFacebook = !!profile?.socialLinks?.facebook;
  const hasInstagram = !!profile?.socialLinks?.instagram;
  const hasSocialLinks = hasFacebook || hasInstagram;

  const renderHeader = () => (
    <>
      <View style={[styles.header, { backgroundColor: colors.header }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.darkText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.darkText }]}>
          {isOwnProfile ? t.myProfile : (profile?.name || 'Profile')}
        </Text>
        {isOwnProfile ? (
          <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Settings' })}>
            <Ionicons name="settings-outline" size={24} color={colors.darkText} />
          </TouchableOpacity>
        ) : <View style={{ width: 24 }} />}
      </View>

      <View style={styles.cover}>
        {profile?.coverUrl
          ? <Image source={{ uri: profile.coverUrl }} style={styles.coverImg} />
          : <View style={[styles.coverImg, { backgroundColor: colors.warmBg }]} />
        }
      </View>

      <View style={[styles.profileSection, { backgroundColor: colors.card }]}>
        <View style={styles.avatarWrapper}>
          {profile?.avatarUrl
            ? <Image source={{ uri: profile.avatarUrl }} style={[styles.avatar, { borderColor: colors.card }]} />
            : <View style={[styles.avatarPlaceholder, { backgroundColor: colors.warmBg, borderColor: colors.card }]}>
                <Ionicons name="person" size={36} color={colors.saffron} />
              </View>
          }
        </View>
        <Text style={[styles.name, { color: colors.darkText }]}>{profile?.name || 'Artist Name'}</Text>
        <Text style={[styles.category, { color: colors.saffron }]}>{profile?.artistCategory || 'Folk Artist'}</Text>

        {profile?.bio ? (
          <Text style={[styles.bio, { color: colors.muted }]}>{profile.bio}</Text>
        ) : null}

        {hasSocialLinks && (
          <View style={styles.socialLinksRow}>
            {hasFacebook && (
              <SocialLinkButton
                platform="facebook"
                url={profile.socialLinks.facebook}
                colors={colors}
              />
            )}
            {hasInstagram && (
              <SocialLinkButton
                platform="instagram"
                url={profile.socialLinks.instagram}
                colors={colors}
              />
            )}
          </View>
        )}

        <View style={[styles.statsRow, { backgroundColor: colors.offwhite }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.darkText }]}>{posts.length}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>{t.posts}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.statItem}
            onPress={() => navigation.navigate('FollowList', { userId, type: 'followers', list: profile?.followers || [] })}>
            <Text style={[styles.statNum, { color: colors.darkText }]}>{profile?.followers?.length || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>{t.followers}</Text>
          </TouchableOpacity>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.statItem}
            onPress={() => navigation.navigate('FollowList', { userId, type: 'following', list: profile?.following || [] })}>
            <Text style={[styles.statNum, { color: colors.darkText }]}>{profile?.following?.length || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>{t.following}</Text>
          </TouchableOpacity>
        </View>

        {isOwnProfile ? (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.saffron }]}
              onPress={() => navigation.navigate('EditProfile')}>
              <Ionicons name="create-outline" size={16} color="#fff" />
              <Text style={styles.editBtnText}>{t.editProfile}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.analyticsBtn, { backgroundColor: colors.warmBg, borderColor: colors.border }]}
              onPress={() => navigation.navigate('Analytics')}>
              <Ionicons name="analytics-outline" size={16} color={colors.saffron} />
              <Text style={[styles.analyticsBtnText, { color: colors.saffron }]}>{t.analytics}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.followBtn, { borderColor: colors.saffron }, isFollowing && { backgroundColor: colors.warmBg, borderColor: colors.border }]}
              onPress={handleFollow}>
              <Text style={[styles.followBtnText, { color: isFollowing ? colors.muted : colors.saffron }]}>
                {isFollowing ? t.following_btn : t.follow}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.messageBtn, { borderColor: colors.saffron }]}
              onPress={async () => {
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                const chatBg = await AsyncStorage.getItem('chatTheme').catch(() => 'default');
                navigation.navigate('Chat', { userId, userName: profile?.name || 'Artist', userAvatar: profile?.avatarUrl || '', chatBg: chatBg || 'default' });
              }}>
              <Ionicons name="chatbubble-outline" size={16} color={colors.saffron} />
              <Text style={[styles.messageBtnText, { color: colors.saffron }]}>{t.message}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && [styles.tabActive, { borderBottomColor: colors.saffron }]]}
          onPress={() => setActiveTab('posts')}>
          <Ionicons name="grid-outline" size={22} color={activeTab === 'posts' ? colors.saffron : colors.muted} />
        </TouchableOpacity>
        {isOwnProfile && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'saved' && [styles.tabActive, { borderBottomColor: colors.saffron }]]}
            onPress={() => setActiveTab('saved')}>
            <Ionicons name="bookmark-outline" size={22} color={activeTab === 'saved' ? colors.saffron : colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {isOwnProfile && (
        <Text style={[styles.gridHint, { color: colors.muted, backgroundColor: colors.offwhite }]}>
          Long press or tap ⋮ to manage posts
        </Text>
      )}
    </>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name={activeTab === 'posts' ? 'camera-outline' : 'bookmark-outline'} size={48} color={colors.muted} />
      <Text style={[styles.emptyText, { color: colors.muted }]}>
        {activeTab === 'posts' ? t.noPostsYet : t.noSavedPosts}
      </Text>
    </View>
  );

  const dataToShow = activeTab === 'posts' ? posts : savedPosts;

  return (
    <View style={[styles.container, { backgroundColor: colors.offwhite }]}>
      <FlatList
        data={dataToShow}
        keyExtractor={(item) => item.id}
        renderItem={renderGridItem}
        numColumns={3}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.saffron]} />}
        contentContainerStyle={{ paddingBottom: 40 }}
        columnWrapperStyle={dataToShow.length > 0 ? styles.gridRow : undefined}
      />

      {/* Post preview modal */}
      <Modal visible={selectedPost !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.darkText }]} numberOfLines={1}>
                {selectedPost?.title || 'Post'}
              </Text>
              <View style={styles.modalHeaderRight}>
                {isOwnProfile && selectedPost && (
                  <TouchableOpacity
                    style={[styles.modalMenuBtn, { backgroundColor: colors.offwhite }]}
                    onPress={() => { setPostMenuPost(selectedPost); setSelectedPost(null); }}>
                    <Ionicons name="ellipsis-horizontal" size={18} color={colors.darkText} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setSelectedPost(null)}>
                  <Ionicons name="close" size={24} color={colors.darkText} />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedPost && <PostMediaSwiper post={selectedPost} colors={colors} />}
              <View style={styles.modalInfo}>
                {selectedPost?.title && <Text style={[styles.modalPostTitle, { color: colors.darkText }]}>{selectedPost.title}</Text>}
                {selectedPost?.caption ? <Text style={[styles.modalCaption, { color: colors.muted }]}>{selectedPost.caption}</Text> : null}
                {selectedPost?.techniques ? (
                  <Text style={[styles.modalCaption, { color: colors.muted }]}>{selectedPost.techniques}</Text>
                ) : null}
                {selectedPost?.category && (
                  <View style={[styles.modalCategoryTag, { backgroundColor: colors.warmBg }]}>
                    <Text style={[styles.modalCategoryText, { color: colors.saffron }]}># {selectedPost.category}</Text>
                  </View>
                )}
                <View style={[styles.modalStats, { borderTopColor: colors.border }]}>
                  {[
                    { icon: 'heart', color: '#FF4444', val: selectedPost?.likes?.length || 0, label: t.likes },
                    { icon: 'chatbubble-outline', color: colors.muted, val: selectedPost?.commentCount || 0, label: 'comments' },
                    { icon: 'bookmark', color: colors.saffron, val: selectedPost?.bookmarks?.length || 0, label: 'saves' },
                    ...(selectedPost?.viewCount > 0 ? [{ icon: 'eye-outline', color: colors.muted, val: selectedPost.viewCount, label: 'views' }] : []),
                  ].map((s, i) => (
                    <View key={i} style={styles.modalStatItem}>
                      <Ionicons name={s.icon as any} size={16} color={s.color} />
                      <Text style={[styles.modalStatText, { color: colors.muted }]}>{s.val} {s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Post Management */}
      <Modal visible={postMenuPost !== null} animationType="slide" transparent>
        <Pressable style={styles.menuOverlay} onPress={() => setPostMenuPost(null)}>
          <Pressable style={[styles.menuSheet, { backgroundColor: colors.card }]}>
            {postMenuPost?.imageUrl && (
              <View style={[styles.menuPostPreview, { borderBottomColor: colors.border }]}>
                <Image source={{ uri: postMenuPost.imageUrl }} style={styles.menuPostThumb} resizeMode="cover" />
                <View style={styles.menuPostInfo}>
                  <Text style={[styles.menuPostTitle, { color: colors.darkText }]} numberOfLines={1}>{postMenuPost?.title || 'Post'}</Text>
                  <Text style={[styles.menuPostMeta, { color: colors.muted }]}>{postMenuPost?.likes?.length || 0} likes · {postMenuPost?.commentCount || 0} comments</Text>
                </View>
              </View>
            )}
            <View style={styles.menuHandle} />
            <Text style={[styles.menuTitle, { color: colors.darkText }]}>Manage Post</Text>
            {[
              { icon: 'eye-outline', label: 'View Post', sub: 'See full post details', bg: '#E8F5F3', color: '#1A6B5C',
                onPress: () => { setSelectedPost(postMenuPost); setPostMenuPost(null); } },
              { icon: 'paper-plane-outline', label: 'Share Post', sub: 'Share with others', bg: '#E8F0FE', color: '#1A4D8B',
                onPress: async () => { setPostMenuPost(null); try { const { Share } = require('react-native'); await Share.share({ title: postMenuPost?.title || 'FolkChat', message: `${postMenuPost?.title || 'Folk art'}\n\nShared from FolkChat` }); } catch { } } },
              { icon: 'trash-outline', label: 'Delete Post', sub: 'Permanently remove', bg: '#FEE8E8', color: '#FF4444',
                onPress: () => handleDeletePost(postMenuPost) },
            ].map((item, i) => (
              <TouchableOpacity key={i}
                style={[styles.menuItem, { borderBottomColor: i < 2 ? colors.border : 'transparent' }]}
                onPress={item.onPress}>
                <View style={[styles.menuItemIcon, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <View style={styles.menuItemText}>
                  <Text style={[styles.menuItemTitle, { color: item.icon === 'trash-outline' ? '#FF4444' : colors.darkText }]}>{item.label}</Text>
                  <Text style={[styles.menuItemSub, { color: colors.muted }]}>{item.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={item.icon === 'trash-outline' ? '#FF4444' : colors.muted} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.menuCancelBtn}
              onPress={() => setPostMenuPost(null)}
              activeOpacity={0.85}>
              <View style={styles.menuCancelInner}>
                <Ionicons name="close" size={18} color="#fff" />
                <Text style={styles.menuCancelTxt}>Cancel</Text>
              </View>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  cover: { height: 140 },
  coverImg: { width: '100%', height: '100%' },
  profileSection: { paddingHorizontal: 20, paddingBottom: 20, marginBottom: 8 },
  avatarWrapper: { marginTop: -50, marginBottom: 12 },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3 },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', borderWidth: 3 },
  name: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  category: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  bio: { fontSize: 14, lineHeight: 20, marginBottom: 10 },

  socialLinksRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  socialBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  statsRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 16, marginBottom: 16, marginTop: 8 },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 30 },
  actionButtons: { flexDirection: 'row', gap: 10 },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 10 },
  editBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  analyticsBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 10, borderWidth: 1 },
  analyticsBtnText: { fontWeight: '600', fontSize: 14 },
  followBtn: { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  followBtnText: { fontSize: 14, fontWeight: '600' },
  messageBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderRadius: 10, paddingVertical: 12 },
  messageBtnText: { fontSize: 14, fontWeight: '600' },
  tabs: { flexDirection: 'row', borderBottomWidth: 0.5 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabActive: { borderBottomWidth: 2 },
  gridHint: { fontSize: 11, textAlign: 'center', paddingVertical: 6 },
  gridRow: { paddingHorizontal: GRID_GAP, gap: GRID_GAP, marginBottom: GRID_GAP },
  gridItem: { width: GRID_SIZE, height: GRID_SIZE, position: 'relative' },
  gridImg: { width: '100%', height: '100%' },
  videoGridItem: { width: '100%', height: '100%', backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
  videoGridBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 4 },
  multiMediaBadge: { position: 'absolute', top: 5, right: 5, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  multiMediaTxt: { fontSize: 10, color: '#fff', fontWeight: '600' },
  gridLikes: { position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  gridLikesText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  gridMenuBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 10, padding: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 0.5 },
  modalHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalMenuBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  modalInfo: { padding: 20 },
  modalPostTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  modalCaption: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  modalCategoryTag: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 16 },
  modalCategoryText: { fontSize: 13, fontWeight: '600' },
  modalStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingTop: 16, borderTopWidth: 0.5 },
  modalStatItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modalStatText: { fontSize: 13 },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  menuSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 30 },
  menuHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  menuPostPreview: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 0.5 },
  menuPostThumb: { width: 56, height: 56, borderRadius: 10 },
  menuPostInfo: { flex: 1 },
  menuPostTitle: { fontSize: 14, fontWeight: '700' },
  menuPostMeta: { fontSize: 12, marginTop: 2 },
  menuTitle: { fontSize: 16, fontWeight: '700', paddingHorizontal: 20, paddingVertical: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5 },
  menuItemIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuItemText: { flex: 1 },
  menuItemTitle: { fontSize: 15, fontWeight: '600' },
  menuItemSub: { fontSize: 12, marginTop: 2 },
  menuCancelBtn: { marginHorizontal: 20, marginTop: 16, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14, backgroundColor: COLORS.muted, alignItems: 'center', justifyContent: 'center' },
  menuCancelInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  menuCancelTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
});