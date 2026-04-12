import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, Dimensions, RefreshControl, Modal, Alert,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import firestore from '@react-native-firebase/firestore';
import Video from 'react-native-video';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LanguageContext';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');
const GRID_SIZE = (width - 4) / 3;

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

  const isVideoUrl = (url: string) =>
    url?.includes('/video/upload/') || url?.endsWith('.mp4');

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
        .sort((a: any, b: any) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return bTime - aTime;
        });
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
      // follow notification
      await firestore().collection('notifications').add({
        toUserId: userId, fromUserId: user.uid,
        fromUserName: profile?.name || 'Someone', fromUserAvatar: profile?.avatarUrl || '',
        type: 'follow', message: `${profile?.name || 'Someone'} started following you`,
        read: false, createdAt: firestore.FieldValue.serverTimestamp(),
      }).catch(() => { });
    }
  };

  // delete post
  const handleDeletePost = (post: any) => {
    Alert.alert(
      'Delete Post',
      'This will permanently delete your post and all its comments.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await firestore().collection('posts').doc(post.id).delete();
              setPosts(prev => prev.filter(p => p.id !== post.id));
              setSavedPosts(prev => prev.filter(p => p.id !== post.id));
              setPostMenuPost(null);
              setSelectedPost(null);
            } catch (e) {
              Alert.alert('Error', 'Failed to delete post');
            }
          },
        },
      ]
    );
  };

  //grid item
  const renderGridItem = (post: any) => (
    <TouchableOpacity
      key={post.id}
      style={styles.gridItem}
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
      {/* own post indicator */}
      {isOwnProfile && (
        <TouchableOpacity
          style={styles.gridMenuBtn}
          onPress={() => setPostMenuPost(post)}>
          <Ionicons name="ellipsis-vertical" size={14} color="#fff" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.offwhite }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.saffron]} />}>

      {/* Header */}
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
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      {/* Cover */}
      <View style={styles.cover}>
        {profile?.coverUrl
          ? <Image source={{ uri: profile.coverUrl }} style={styles.coverImg} />
          : <View style={[styles.coverImg, { backgroundColor: colors.warmBg }]} />
        }
      </View>

      {/* Profile Info */}
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
        {profile?.bio ? <Text style={[styles.bio, { color: colors.muted }]}>{profile.bio}</Text> : null}

        {/* Stats */}
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

        {/* Action buttons */}
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
              onPress={() => navigation.navigate('Chat', { userId, userName: profile?.name || 'Artist', userAvatar: profile?.avatarUrl || '' })}>
              <Ionicons name="chatbubble-outline" size={16} color={colors.saffron} />
              <Text style={[styles.messageBtnText, { color: colors.saffron }]}>{t.message}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Tabs */}
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

      {/* Posts grid */}
      {activeTab === 'posts' && (
        posts.length > 0 ? (
          <>
            {isOwnProfile && (
              <Text style={[styles.gridHint, { color: colors.muted }]}>Tap ⋮ on a post to edit or delete</Text>
            )}
            <View style={styles.grid}>{posts.map(post => renderGridItem(post))}</View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="camera-outline" size={48} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>{t.noPostsYet}</Text>
          </View>
        )
      )}

      {activeTab === 'saved' && isOwnProfile && (
        savedPosts.length > 0 ? (
          <View style={styles.grid}>{savedPosts.map(post => renderGridItem(post))}</View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="bookmark-outline" size={48} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>{t.noSavedPosts}</Text>
          </View>
        )
      )}

      <View style={{ height: 40 }} />

      {/* post preview */}
      <Modal visible={selectedPost !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.darkText }]} numberOfLines={1}>
                {selectedPost?.title || 'Post'}
              </Text>
              <View style={styles.modalHeaderRight}>
                {/* Edit/Delete button inside preview(own posts only) */}
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
              {selectedPost && isVideoUrl(selectedPost.imageUrl) ? (
                <Video source={{ uri: selectedPost.imageUrl }} style={styles.modalMedia} resizeMode="contain" controls paused />
              ) : selectedPost?.imageUrl ? (
                <Image source={{ uri: selectedPost.imageUrl }} style={styles.modalMedia} resizeMode="contain" />
              ) : null}
              <View style={styles.modalInfo}>
                {selectedPost?.title && <Text style={[styles.modalPostTitle, { color: colors.darkText }]}>{selectedPost.title}</Text>}
                {selectedPost?.caption ? <Text style={[styles.modalCaption, { color: colors.muted }]}>{selectedPost.caption}</Text> : null}
                {selectedPost?.category && (
                  <View style={[styles.modalCategoryTag, { backgroundColor: colors.warmBg }]}>
                    <Text style={[styles.modalCategoryText, { color: colors.saffron }]}># {selectedPost.category}</Text>
                  </View>
                )}
                <View style={[styles.modalStats, { borderTopColor: colors.border }]}>
                  <View style={styles.modalStatItem}>
                    <Ionicons name="heart" size={16} color="#FF4444" />
                    <Text style={[styles.modalStatText, { color: colors.muted }]}>{selectedPost?.likes?.length || 0} {t.likes}</Text>
                  </View>
                  <View style={styles.modalStatItem}>
                    <Ionicons name="chatbubble-outline" size={16} color={colors.muted} />
                    <Text style={[styles.modalStatText, { color: colors.muted }]}>{selectedPost?.commentCount || 0} comments</Text>
                  </View>
                  <View style={styles.modalStatItem}>
                    <Ionicons name="bookmark" size={16} color={colors.saffron} />
                    <Text style={[styles.modalStatText, { color: colors.muted }]}>{selectedPost?.bookmarks?.length || 0} saves</Text>
                  </View>
                  {selectedPost?.viewCount > 0 && (
                    <View style={styles.modalStatItem}>
                      <Ionicons name="eye-outline" size={16} color={colors.muted} />
                      <Text style={[styles.modalStatText, { color: colors.muted }]}>{selectedPost.viewCount} views</Text>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* post mangement */}
      <Modal visible={postMenuPost !== null} animationType="slide" transparent>
        <Pressable style={styles.menuOverlay} onPress={() => setPostMenuPost(null)}>
          <Pressable style={[styles.menuSheet, { backgroundColor: colors.card }]}>
            {/* Post preview thumbnail */}
            {postMenuPost?.imageUrl && (
              <View style={[styles.menuPostPreview, { borderBottomColor: colors.border }]}>
                <Image source={{ uri: postMenuPost.imageUrl }} style={styles.menuPostThumb} resizeMode="cover" />
                <View style={styles.menuPostInfo}>
                  <Text style={[styles.menuPostTitle, { color: colors.darkText }]} numberOfLines={1}>
                    {postMenuPost?.title || 'Post'}
                  </Text>
                  <Text style={[styles.menuPostMeta, { color: colors.muted }]}>
                    {postMenuPost?.likes?.length || 0} likes · {postMenuPost?.commentCount || 0} comments
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.menuHandle} />
            <Text style={[styles.menuTitle, { color: colors.darkText }]}>Manage Post</Text>

            {/* View post */}
            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={() => { setSelectedPost(postMenuPost); setPostMenuPost(null); }}>
              <View style={[styles.menuItemIcon, { backgroundColor: '#E8F5F3' }]}>
                <Ionicons name="eye-outline" size={20} color="#1A6B5C" />
              </View>
              <View style={styles.menuItemText}>
                <Text style={[styles.menuItemTitle, { color: colors.darkText }]}>View Post</Text>
                <Text style={[styles.menuItemSub, { color: colors.muted }]}>See full post details</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </TouchableOpacity>

            {/* Share */}
            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={async () => {
                setPostMenuPost(null);
                try {
                  const { Share } = require('react-native');
                  await Share.share({ title: postMenuPost?.title || 'FolkChat', message: `${postMenuPost?.title || 'Folk art'}\n\nShared from FolkChat` });
                } catch { }
              }}>
              <View style={[styles.menuItemIcon, { backgroundColor: '#E8F0FE' }]}>
                <Ionicons name="paper-plane-outline" size={20} color="#1A4D8B" />
              </View>
              <View style={styles.menuItemText}>
                <Text style={[styles.menuItemTitle, { color: colors.darkText }]}>Share Post</Text>
                <Text style={[styles.menuItemSub, { color: colors.muted }]}>Share with others</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </TouchableOpacity>

            {/* Delete */}
            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: 'transparent' }]}
              onPress={() => handleDeletePost(postMenuPost)}>
              <View style={[styles.menuItemIcon, { backgroundColor: '#FEE8E8' }]}>
                <Ionicons name="trash-outline" size={20} color="#FF4444" />
              </View>
              <View style={styles.menuItemText}>
                <Text style={[styles.menuItemTitle, { color: '#FF4444' }]}>Delete Post</Text>
                <Text style={[styles.menuItemSub, { color: colors.muted }]}>Permanently remove this post</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#FF4444" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuCancelBtn, { backgroundColor: colors.offwhite }]}
              onPress={() => setPostMenuPost(null)}>
              <Text style={[styles.menuCancelTxt, { color: colors.darkText }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

import { Pressable } from 'react-native';

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
  bio: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, padding: 2 },
  gridItem: { width: GRID_SIZE, height: GRID_SIZE, position: 'relative' },
  gridImg: { width: '100%', height: '100%' },
  videoGridItem: { width: '100%', height: '100%', backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
  videoGridBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 4 },
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
  modalMedia: { width, height: width, backgroundColor: '#000' },
  modalInfo: { padding: 20 },
  modalPostTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  modalCaption: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
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
  menuCancelBtn: { margin: 16, padding: 14, borderRadius: 14, alignItems: 'center' },
  menuCancelTxt: { fontSize: 15, fontWeight: '600' },
});