import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, Dimensions, RefreshControl, Modal,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import firestore from '@react-native-firebase/firestore';
import Video from 'react-native-video';
import { COLORS } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');
const GRID_SIZE = (width - 4) / 3;

export default function ProfileScreen({ navigation }: any) {
  const { user, userProfile, fetchUserProfile } = useAuthStore();
  const [posts, setPosts] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(userProfile);
  const [selectedPost, setSelectedPost] = useState<any>(null);

  const isVideoUrl = (url: string) =>
    url?.includes('/video/upload/') || url?.endsWith('.mp4');

  const loadData = async () => {
    if (!user?.uid) return;
    try {
      const userDoc = await firestore().collection('users').doc(user.uid).get();
      if (userDoc.exists()) setProfile(userDoc.data());

      const postsSnap = await firestore()
        .collection('posts')
        .where('userId', '==', user.uid)
        .get();
      const postsList = postsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return bTime - aTime;
        });
      setPosts(postsList);

      const savedSnap = await firestore()
        .collection('posts')
        .where('bookmarks', 'array-contains', user.uid)
        .get();
      setSavedPosts(savedSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.log('Profile load error:', e);
    }
  };

  useEffect(() => {
    if (userProfile) setProfile(userProfile);
    loadData();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    await fetchUserProfile(user?.uid);
    setRefreshing(false);
  };

  const renderGridItem = (post: any) => (
    <TouchableOpacity
      key={post.id}
      style={styles.gridItem}
      onPress={() => setSelectedPost(post)}>
      {isVideoUrl(post.imageUrl) ? (
        <View style={styles.videoGridItem}>
          <Ionicons name="play-circle" size={32} color={COLORS.white} />
        </View>
      ) : (
        <Image source={{ uri: post.imageUrl }} style={styles.gridImg} resizeMode="cover" />
      )}
      {post.likes?.length > 0 && (
        <View style={styles.gridLikes}>
          <Ionicons name="heart" size={12} color={COLORS.white} />
          <Text style={styles.gridLikesText}>{post.likes.length}</Text>
        </View>
      )}
      {isVideoUrl(post.imageUrl) && (
        <View style={styles.videoGridBadge}>
          <Ionicons name="videocam" size={12} color={COLORS.white} />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.saffron]} />
      }>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Settings' })}>
          <Ionicons name="settings-outline" size={24} color={COLORS.darkText} />
        </TouchableOpacity>
      </View>

      {/* Cover */}
      <View style={styles.cover}>
        {profile?.coverUrl ? (
          <Image source={{ uri: profile.coverUrl }} style={styles.coverImg} />
        ) : (
          <View style={[styles.coverImg, { backgroundColor: COLORS.warmBg }]} />
        )}
      </View>

      {/* Profile Info */}
      <View style={styles.profileSection}>
        <View style={styles.avatarWrapper}>
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={36} color={COLORS.saffron} />
            </View>
          )}
        </View>

        <Text style={styles.name}>{profile?.name || 'Artist Name'}</Text>
        <Text style={styles.category}>{profile?.artistCategory || 'Folk Artist'}</Text>
        {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{posts.length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{profile?.followers?.length || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{profile?.following?.length || 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.editBtn}
            onPress={() => navigation.navigate('EditProfile')}>
            <Ionicons name="create-outline" size={16} color={COLORS.white} />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.analyticsBtn}
            onPress={() => navigation.navigate('Analytics')}>
            <Ionicons name="analytics-outline" size={16} color={COLORS.saffron} />
            <Text style={styles.analyticsBtnText}>Analytics</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
          onPress={() => setActiveTab('posts')}>
          <Ionicons name="grid-outline" size={22}
            color={activeTab === 'posts' ? COLORS.saffron : COLORS.muted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'saved' && styles.tabActive]}
          onPress={() => setActiveTab('saved')}>
          <Ionicons name="bookmark-outline" size={22}
            color={activeTab === 'saved' ? COLORS.saffron : COLORS.muted} />
        </TouchableOpacity>
      </View>

      {activeTab === 'posts' && (
        posts.length > 0 ? (
          <View style={styles.grid}>
            {posts.map(post => renderGridItem(post))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="camera-outline" size={48} color={COLORS.muted} />
            <Text style={styles.emptyText}>No posts yet</Text>
          </View>
        )
      )}

      {activeTab === 'saved' && (
        savedPosts.length > 0 ? (
          <View style={styles.grid}>
            {savedPosts.map(post => renderGridItem(post))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="bookmark-outline" size={48} color={COLORS.muted} />
            <Text style={styles.emptyText}>No saved posts yet</Text>
          </View>
        )
      )}

      <View style={{ height: 40 }} />

      {/* Post Preview Modal */}
      <Modal visible={selectedPost !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedPost?.title || 'Post'}</Text>
              <TouchableOpacity onPress={() => setSelectedPost(null)}>
                <Ionicons name="close" size={24} color={COLORS.darkText} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedPost && isVideoUrl(selectedPost.imageUrl) ? (
                <Video
                  source={{ uri: selectedPost.imageUrl }}
                  style={styles.modalMedia}
                  resizeMode="contain"
                  controls={true}
                  paused={true}
                />
              ) : selectedPost?.imageUrl ? (
                <Image
                  source={{ uri: selectedPost.imageUrl }}
                  style={styles.modalMedia}
                  resizeMode="contain"
                />
              ) : null}

              <View style={styles.modalInfo}>
                {selectedPost?.title && (
                  <Text style={styles.modalPostTitle}>{selectedPost.title}</Text>
                )}
                {selectedPost?.caption ? (
                  <Text style={styles.modalCaption}>{selectedPost.caption}</Text>
                ) : null}
                {selectedPost?.techniques ? (
                  <View style={styles.modalRow}>
                    <Ionicons name="brush-outline" size={14} color={COLORS.muted} />
                    <Text style={styles.modalMeta}>{selectedPost.techniques}</Text>
                  </View>
                ) : null}
                {selectedPost?.category && (
                  <View style={styles.modalCategoryTag}>
                    <Text style={styles.modalCategoryText}># {selectedPost.category}</Text>
                  </View>
                )}
                <View style={styles.modalStats}>
                  <View style={styles.modalStatItem}>
                    <Ionicons name="heart" size={16} color="#FF4444" />
                    <Text style={styles.modalStatText}>
                      {selectedPost?.likes?.length || 0} likes
                    </Text>
                  </View>
                  <View style={styles.modalStatItem}>
                    <Ionicons name="chatbubble-outline" size={16} color={COLORS.muted} />
                    <Text style={styles.modalStatText}>
                      {selectedPost?.commentCount || 0} comments
                    </Text>
                  </View>
                  <View style={styles.modalStatItem}>
                    <Ionicons name="bookmark" size={16} color={COLORS.saffron} />
                    <Text style={styles.modalStatText}>
                      {selectedPost?.bookmarks?.length || 0} saves
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.offwhite },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: COLORS.white,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.darkText },
  cover: { height: 140 },
  coverImg: { width: '100%', height: '100%' },
  profileSection: {
    backgroundColor: COLORS.white, paddingHorizontal: 20,
    paddingBottom: 20, marginBottom: 8,
  },
  avatarWrapper: { marginTop: -50, marginBottom: 12 },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: COLORS.white },
  avatarPlaceholder: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: COLORS.warmBg, justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: COLORS.white,
  },
  name: { fontSize: 20, fontWeight: 'bold', color: COLORS.darkText, marginBottom: 4 },
  category: { fontSize: 14, color: COLORS.saffron, fontWeight: '500', marginBottom: 8 },
  bio: { fontSize: 14, color: COLORS.muted, lineHeight: 20, marginBottom: 16 },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.offwhite, borderRadius: 12,
    padding: 16, marginBottom: 16, marginTop: 8,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: 'bold', color: COLORS.darkText },
  statLabel: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: COLORS.border },
  btnRow: { flexDirection: 'row', gap: 10 },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: COLORS.saffron, padding: 12, borderRadius: 10,
  },
  editBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  analyticsBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: COLORS.warmBg, padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  analyticsBtnText: { color: COLORS.saffron, fontWeight: '600', fontSize: 14 },
  tabs: {
    flexDirection: 'row', backgroundColor: COLORS.white,
    borderBottomWidth: 0.5, borderBottomColor: COLORS.border,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.saffron },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, padding: 2 },
  gridItem: { width: GRID_SIZE, height: GRID_SIZE, position: 'relative' },
  gridImg: { width: '100%', height: '100%' },
  videoGridItem: {
    width: '100%', height: '100%', backgroundColor: '#1a1a1a',
    justifyContent: 'center', alignItems: 'center',
  },
  videoGridBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 4,
  },
  gridLikes: {
    position: 'absolute', bottom: 6, left: 6,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  gridLikesText: { fontSize: 11, color: COLORS.white, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: COLORS.muted },
  uploadBtn: {
    backgroundColor: COLORS.saffron, paddingHorizontal: 24,
    paddingVertical: 12, borderRadius: 10, marginTop: 4,
  },
  uploadBtnText: { color: COLORS.white, fontWeight: '600' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 24,
    borderTopRightRadius: 24, maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 0.5, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.darkText, flex: 1 },
  modalMedia: { width, height: width, backgroundColor: '#000' },
  modalInfo: { padding: 20 },
  modalPostTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.darkText, marginBottom: 8 },
  modalCaption: { fontSize: 14, color: COLORS.muted, lineHeight: 20, marginBottom: 12 },
  modalRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  modalMeta: { fontSize: 13, color: COLORS.muted, flex: 1 },
  modalCategoryTag: {
    alignSelf: 'flex-start', backgroundColor: COLORS.warmBg,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 16,
  },
  modalCategoryText: { color: COLORS.saffron, fontSize: 13, fontWeight: '600' },
  modalStats: {
    flexDirection: 'row', gap: 20, paddingTop: 16,
    borderTopWidth: 0.5, borderTopColor: COLORS.border,
  },
  modalStatItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modalStatText: { fontSize: 13, color: COLORS.muted },
});