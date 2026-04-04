import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Pressable, Image, FlatList,
  RefreshControl, Dimensions, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Share,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import firestore from '@react-native-firebase/firestore';
import Video from 'react-native-video';
import { COLORS } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');

interface Post {
  id: string;
  userId: string;
  imageUrl: string;
  mediaItems?: { url: string; type: 'image' | 'video' }[];
  title: string;
  caption: string;
  category: string;
  likes: string[];
  bookmarks: string[];
  commentCount: number;
  createdAt: any;
  userName?: string;
  userAvatar?: string;
  userCategory?: string;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: any;
}

export default function HomeFeedScreen({ navigation }: any) {
  const { userProfile, user, logout } = useAuthStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [followingList, setFollowingList] = useState<string[]>([]);

  const isVideoUrl = (url: string) =>
    url?.includes('/video/upload/') || url?.endsWith('.mp4');

  const fetchPosts = useCallback(async () => {
    try {
      const snap = await firestore()
        .collection('posts')
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

      const postsData = await Promise.all(
        snap.docs.map(async (doc) => {
          const data = doc.data();
          try {
            const userDoc = await firestore()
              .collection('users').doc(data.userId).get();
            const userData = userDoc.data();
            return {
              id: doc.id, ...data,
              userName: userData?.name || 'Unknown Artist',
              userAvatar: userData?.avatarUrl || '',
              userCategory: userData?.artistCategory || 'Folk Artist',
            } as Post;
          } catch {
            return {
              id: doc.id, ...data,
              userName: 'Unknown Artist',
              userAvatar: '',
              userCategory: 'Folk Artist',
            } as Post;
          }
        })
      );
      setPosts(postsData);
    } catch (e) { console.log('Feed error:', e); }
  }, []);

  const fetchFollowing = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const doc = await firestore().collection('users').doc(user.uid).get();
      setFollowingList(doc.data()?.following || []);
    } catch (e) { console.log('Following error:', e); }
  }, [user]);

  useEffect(() => {
    fetchPosts();
    fetchFollowing();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    await fetchFollowing();
    setRefreshing(false);
  };

  const handleLike = async (post: Post) => {
    if (!user?.uid) return;
    const liked = post.likes?.includes(user.uid);

    setPosts(prev => prev.map(p =>
      p.id === post.id ? {
        ...p,
        likes: liked
          ? (p.likes || []).filter(id => id !== user.uid)
          : [...(p.likes || []), user.uid],
      } : p
    ));
    try {
      await firestore().collection('posts').doc(post.id).update({
        likes: liked
          ? firestore.FieldValue.arrayRemove(user.uid)
          : firestore.FieldValue.arrayUnion(user.uid),
      });
    } catch (e) {
      console.log('Like error:', e);
      fetchPosts(); 
    }
  };

  const handleBookmark = async (post: Post) => {
    if (!user?.uid) return;
    const saved = (post.bookmarks || []).includes(user.uid);

    setPosts(prev => prev.map(p =>
      p.id === post.id ? {
        ...p,
        bookmarks: saved
          ? (p.bookmarks || []).filter(id => id !== user.uid)
          : [...(p.bookmarks || []), user.uid],
      } : p
    ));
    try {
      await firestore().collection('posts').doc(post.id).update({
        bookmarks: saved
          ? firestore.FieldValue.arrayRemove(user.uid)
          : firestore.FieldValue.arrayUnion(user.uid),
      });
    } catch (e) {
      console.log('Bookmark error:', e);
      fetchPosts();
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!user?.uid || targetUserId === user.uid) return;
    const isFollowing = followingList.includes(targetUserId);

    setFollowingList(prev =>
      isFollowing
        ? prev.filter(id => id !== targetUserId)
        : [...prev, targetUserId]
    );
    try {
      const myRef = firestore().collection('users').doc(user.uid);
      const targetRef = firestore().collection('users').doc(targetUserId);
      if (isFollowing) {
        await myRef.update({ following: firestore.FieldValue.arrayRemove(targetUserId) });
        await targetRef.update({ followers: firestore.FieldValue.arrayRemove(user.uid) });
      } else {
        await myRef.update({ following: firestore.FieldValue.arrayUnion(targetUserId) });
        await targetRef.update({ followers: firestore.FieldValue.arrayUnion(user.uid) });
      }
    } catch (e) {
      console.log('Follow error:', e);
      fetchFollowing(); 
    }
  };

  const openComments = async (post: Post) => {
    setCommentPost(post);
    setComments([]);
    setLoadingComments(true);
    try {
      const snap = await firestore()
        .collection('posts').doc(post.id)
        .collection('comments')
        .orderBy('createdAt', 'asc')
        .get();
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
    } catch (e) {
      console.log('Comments error:', e);
    } finally {
      setLoadingComments(false);
    }
  };

  const sendComment = async () => {
    if (!commentText.trim() || !commentPost || !user?.uid) return;
    const text = commentText.trim();
    setCommentText('');
    const tempComment: Comment = {
      id: `temp_${Date.now()}`,
      userId: user.uid,
      userName: userProfile?.name || 'User',
      userAvatar: userProfile?.avatarUrl || '',
      text,
      createdAt: new Date(),
    };
    setComments(prev => [...prev, tempComment]);
    try {
      const ref = await firestore()
        .collection('posts').doc(commentPost.id)
        .collection('comments').add({
          userId: user.uid,
          userName: userProfile?.name || 'User',
          userAvatar: userProfile?.avatarUrl || '',
          text,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      await firestore().collection('posts').doc(commentPost.id).update({
        commentCount: firestore.FieldValue.increment(1),
      });
      setComments(prev =>
        prev.map(c => c.id === tempComment.id ? { ...c, id: ref.id } : c)
      );
      setPosts(prev => prev.map(p =>
        p.id === commentPost.id
          ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p
      ));
    } catch (e) {
      console.log('Comment error:', e);
      setComments(prev => prev.filter(c => c.id !== tempComment.id));
    }
  };

  const showPostMenu = (post: Post) => {
    if (post.userId === user?.uid) {
      Alert.alert('Post Options', '', [
        {
          text: 'Delete Post', style: 'destructive',
          onPress: async () => {
            try {
              await firestore().collection('posts').doc(post.id).delete();
              setPosts(prev => prev.filter(p => p.id !== post.id));
            } catch (e) { console.log('Delete error:', e); }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      Alert.alert('Post Options', '', [
        { text: 'Report Post', onPress: () => Alert.alert('Reported', 'Thank you for your report') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const handleLogout = async () => {
    setShowDropdown(false);
    await logout();
  };

  const renderPost = ({ item }: { item: Post }) => {
    const liked = (item.likes || []).includes(user?.uid || '');
    const saved = (item.bookmarks || []).includes(user?.uid || '');
    const isFollowing = followingList.includes(item.userId);
    const isOwnPost = item.userId === user?.uid;
    const isVideo = isVideoUrl(item.imageUrl);

    return (
      <View style={styles.postCard}>
        {/* Header */}
        <View style={styles.postHeader}>
          <View style={styles.postUserInfo}>
            {item.userAvatar ? (
              <Image source={{ uri: item.userAvatar }} style={styles.postAvatar} />
            ) : (
              <View style={styles.postAvatarPlaceholder}>
                <Ionicons name="person" size={16} color={COLORS.saffron} />
              </View>
            )}
            <View>
              <Text style={styles.postUserName}>{item.userName}</Text>
              <Text style={styles.postUserCategory}>{item.userCategory}</Text>
            </View>
          </View>
          <View style={styles.postHeaderRight}>
            {!isOwnPost && (
              <TouchableOpacity
                style={[styles.followBtn, isFollowing && styles.followingBtn]}
                onPress={() => handleFollow(item.userId)}>
                <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => showPostMenu(item)}>
              <Ionicons name="ellipsis-vertical" size={18} color={COLORS.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Media */}
        <View style={styles.mediaContainer}>
          {isVideo ? (
            <Video
              source={{ uri: item.imageUrl }}
              style={styles.postImage}
              resizeMode="cover"
              controls={true}
              paused={true}
              repeat={false}
            />
          ) : item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.postImage}
              resizeMode="cover"
            />
          ) : null}
          {item.mediaItems && item.mediaItems.length > 1 && (
            <View style={styles.mediaCountBadge}>
              <Ionicons name="copy-outline" size={14} color={COLORS.white} />
              <Text style={styles.mediaCountText}>{item.mediaItems.length}</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.postActions}>
          <View style={styles.postActionsLeft}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item)}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={24}
                color={liked ? '#FF4444' : COLORS.darkText}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => openComments(item)}>
              <Ionicons name="chatbubble-outline" size={22} color={COLORS.darkText} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={async () => {
                try {
                  await Share.share({
                    title: item.title || 'FolkChat Artwork',
                    message: ` ${item.title || 'Check out this folk art!'}\n\nBy ${item.userName} · ${item.category}\n\n${item.caption || ''}\n\nShared from FolkChat — Sri Lankan Folk Arts Platform`,
                  });
                } catch (e) {
                  console.log('Share error:', e);
                }
              }}>
              <Ionicons name="paper-plane-outline" size={22} color={COLORS.darkText} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => handleBookmark(item)}>
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={saved ? COLORS.saffron : COLORS.darkText}
            />
          </TouchableOpacity>
        </View>

        {/* Likes */}
        {(item.likes || []).length > 0 && (
          <Text style={styles.likesCount}>
            {item.likes.length} like{item.likes.length > 1 ? 's' : ''}
          </Text>
        )}

        {/* Title & Caption */}
        {item.title && (
          <View style={styles.captionRow}>
            <Text style={styles.captionUser}>{item.userName} </Text>
            <Text style={styles.captionText}>{item.title}</Text>
          </View>
        )}
        {item.caption ? (
          <Text style={styles.captionDesc}>{item.caption}</Text>
        ) : null}

        {/* Category */}
        {item.category && (
          <View style={styles.categoryTag}>
            <Text style={styles.categoryTagText}># {item.category}</Text>
          </View>
        )}

        {/* Comments */}
        {item.commentCount > 0 && (
          <TouchableOpacity onPress={() => openComments(item)}>
            <Text style={styles.viewComments}>
              View all {item.commentCount} comment{item.commentCount > 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.postTime}>{formatTime(item.createdAt)}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>FolkChat</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.notifBtn}
            onPress={() => navigation.navigate('Notifications')}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.darkText} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => setShowDropdown(true)}>
            {userProfile?.avatarUrl ? (
              <Image source={{ uri: userProfile.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={18} color={COLORS.saffron} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Feed */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.saffron]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={56} color={COLORS.muted} />
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyText}>Be the first to share your folk art!</Text>
          </View>
        }
      />

      {/* Comments Modal */}
      <Modal visible={commentPost !== null} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}>
          <Pressable style={styles.commentOverlay} onPress={() => setCommentPost(null)}>
            <Pressable style={styles.commentSheet}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentTitle}>Comments</Text>
                <TouchableOpacity onPress={() => setCommentPost(null)}>
                  <Ionicons name="close" size={24} color={COLORS.darkText} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.commentList} showsVerticalScrollIndicator={false}>
                {loadingComments ? (
                  <Text style={styles.loadingText}>Loading...</Text>
                ) : comments.length === 0 ? (
                  <Text style={styles.noComments}>No comments yet. Be first!</Text>
                ) : (
                  comments.map(c => (
                    <View key={c.id} style={styles.commentItem}>
                      {c.userAvatar ? (
                        <Image source={{ uri: c.userAvatar }} style={styles.commentAvatar} />
                      ) : (
                        <View style={styles.commentAvatarPlaceholder}>
                          <Ionicons name="person" size={14} color={COLORS.saffron} />
                        </View>
                      )}
                      <View style={styles.commentContent}>
                        <Text style={styles.commentUser}>{c.userName}</Text>
                        <Text style={styles.commentText}>{c.text}</Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
              <View style={styles.commentInput}>
                {userProfile?.avatarUrl ? (
                  <Image source={{ uri: userProfile.avatarUrl }} style={styles.commentAvatar} />
                ) : (
                  <View style={styles.commentAvatarPlaceholder}>
                    <Ionicons name="person" size={14} color={COLORS.saffron} />
                  </View>
                )}
                <TextInput
                  style={styles.commentTextInput}
                  placeholder="Add a comment..."
                  placeholderTextColor={COLORS.muted}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                />
                <TouchableOpacity onPress={sendComment} disabled={!commentText.trim()}>
                  <Ionicons name="send" size={22}
                    color={commentText.trim() ? COLORS.saffron : COLORS.muted} />
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Dropdown */}
      <Modal visible={showDropdown} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowDropdown(false)}>
          <View style={styles.dropdown}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownName}>{userProfile?.name || 'Your Name'}</Text>
              <Text style={styles.dropdownEmail}>{user?.email || ''}</Text>
            </View>
            <View style={styles.dropdownDivider} />
            <TouchableOpacity style={styles.dropdownItem}
              onPress={() => { setShowDropdown(false); navigation.navigate('Profile'); }}>
              <Ionicons name="person-outline" size={18} color={COLORS.darkText} />
              <Text style={styles.dropdownLabel}>My Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem}
              onPress={() => { setShowDropdown(false); navigation.navigate('Analytics'); }}>
              <Ionicons name="analytics-outline" size={18} color={COLORS.darkText} />
              <Text style={styles.dropdownLabel}>Analytics</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem}
              onPress={() => { setShowDropdown(false); navigation.navigate('EditProfile'); }}>
              <Ionicons name="create-outline" size={18} color={COLORS.darkText} />
              <Text style={styles.dropdownLabel}>Edit Profile</Text>
            </TouchableOpacity>
            <View style={styles.dropdownDivider} />
            <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color="#FF4444" />
              <Text style={[styles.dropdownLabel, { color: '#FF4444' }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.offwhite },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: COLORS.white, borderBottomWidth: 0.5, borderBottomColor: COLORS.border,
  },
  logo: { fontSize: 22, fontWeight: 'bold', color: COLORS.darkText },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifBtn: { padding: 4 },
  avatarBtn: { padding: 2 },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: COLORS.saffron },
  avatarPlaceholder: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.warmBg, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.saffron,
  },
  postCard: {
    backgroundColor: COLORS.white, marginBottom: 8,
    borderBottomWidth: 0.5, borderBottomColor: COLORS.border,
  },
  postHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 12,
  },
  postUserInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  postAvatar: { width: 40, height: 40, borderRadius: 20 },
  postAvatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.warmBg, justifyContent: 'center', alignItems: 'center',
  },
  postUserName: { fontSize: 14, fontWeight: 'bold', color: COLORS.darkText },
  postUserCategory: { fontSize: 12, color: COLORS.muted },
  postHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  followBtn: {
    borderWidth: 1, borderColor: COLORS.saffron,
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 5,
  },
  followingBtn: { backgroundColor: COLORS.warmBg, borderColor: COLORS.border },
  followBtnText: { color: COLORS.saffron, fontSize: 13, fontWeight: '600' },
  followingBtnText: { color: COLORS.muted },
  mediaContainer: { position: 'relative' },
  postImage: { width, height: width },
  mediaCountBadge: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  mediaCountText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
  postActions: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
  },
  postActionsLeft: { flexDirection: 'row', gap: 16 },
  actionBtn: { padding: 2 },
  likesCount: { paddingHorizontal: 14, fontSize: 13, fontWeight: 'bold', color: COLORS.darkText },
  captionRow: { flexDirection: 'row', paddingHorizontal: 14, paddingTop: 4, flexWrap: 'wrap' },
  captionUser: { fontSize: 13, fontWeight: 'bold', color: COLORS.darkText },
  captionText: { fontSize: 13, color: COLORS.darkText },
  captionDesc: { paddingHorizontal: 14, fontSize: 13, color: COLORS.muted, marginTop: 2 },
  categoryTag: { paddingHorizontal: 14, paddingVertical: 4 },
  categoryTagText: { fontSize: 12, color: COLORS.saffron, fontWeight: '500' },
  viewComments: { paddingHorizontal: 14, fontSize: 13, color: COLORS.muted, marginBottom: 2 },
  postTime: { paddingHorizontal: 14, paddingBottom: 12, fontSize: 11, color: COLORS.muted },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 100, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.darkText },
  emptyText: { fontSize: 14, color: COLORS.muted },
  uploadBtn: {
    backgroundColor: COLORS.saffron, paddingHorizontal: 24,
    paddingVertical: 12, borderRadius: 10, marginTop: 4,
  },
  uploadBtnText: { color: COLORS.white, fontWeight: '600' },
  commentOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  commentSheet: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 24,
    borderTopRightRadius: 24, height: '70%',
  },
  commentHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 0.5, borderBottomColor: COLORS.border,
  },
  commentTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.darkText },
  commentList: { flex: 1, padding: 16 },
  loadingText: { textAlign: 'center', color: COLORS.muted, marginTop: 20 },
  noComments: { textAlign: 'center', color: COLORS.muted, marginTop: 40, fontSize: 14 },
  commentItem: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16 },
  commentAvatarPlaceholder: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.warmBg, justifyContent: 'center', alignItems: 'center',
  },
  commentContent: { flex: 1 },
  commentUser: { fontSize: 13, fontWeight: 'bold', color: COLORS.darkText, marginBottom: 2 },
  commentText: { fontSize: 13, color: COLORS.darkText, lineHeight: 18 },
  commentInput: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderTopWidth: 0.5, borderTopColor: COLORS.border,
  },
  commentTextInput: {
    flex: 1, backgroundColor: COLORS.offwhite, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, fontSize: 14,
    color: COLORS.darkText, maxHeight: 80,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  dropdown: {
    position: 'absolute', top: 90, right: 16,
    backgroundColor: COLORS.white, borderRadius: 16, width: 220,
    elevation: 8, borderWidth: 0.5, borderColor: COLORS.border,
  },
  dropdownHeader: { padding: 16, paddingBottom: 12 },
  dropdownName: { fontSize: 15, fontWeight: 'bold', color: COLORS.darkText },
  dropdownEmail: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  dropdownDivider: { height: 0.5, backgroundColor: COLORS.border },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, paddingHorizontal: 16,
  },
  dropdownLabel: { fontSize: 14, color: COLORS.darkText, fontWeight: '500' },
});