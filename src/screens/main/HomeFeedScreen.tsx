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
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LanguageContext';
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
  replyTo?: string; 
}

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
            const userDoc = await firestore().collection('users').doc(data.userId).get();
            const userData = userDoc.data();
            return {
              id: doc.id, ...data,
              userName: userData?.name || 'Unknown Artist',
              userAvatar: userData?.avatarUrl || '',
              userCategory: userData?.artistCategory || 'Folk Artist',
            } as Post;
          } catch {
            return { id: doc.id, ...data, userName: 'Unknown Artist', userAvatar: '', userCategory: 'Folk Artist' } as Post;
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

  useEffect(() => { fetchPosts(); fetchFollowing(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    await fetchFollowing();
    setRefreshing(false);
  };

  const handleLike = async (post: Post) => {
    if (!user?.uid) return;
    const liked = (post.likes || []).includes(user.uid);
    setPosts(prev => prev.map(p =>
      p.id === post.id ? {
        ...p,
        likes: liked ? (p.likes || []).filter(id => id !== user.uid) : [...(p.likes || []), user.uid],
      } : p
    ));
    try {
      await firestore().collection('posts').doc(post.id).update({
        likes: liked ? firestore.FieldValue.arrayRemove(user.uid) : firestore.FieldValue.arrayUnion(user.uid),
      });
    } catch (e) { console.log('Like error:', e); fetchPosts(); }
  };

  const handleBookmark = async (post: Post) => {
    if (!user?.uid) return;
    const saved = (post.bookmarks || []).includes(user.uid);
    setPosts(prev => prev.map(p =>
      p.id === post.id ? {
        ...p,
        bookmarks: saved ? (p.bookmarks || []).filter(id => id !== user.uid) : [...(p.bookmarks || []), user.uid],
      } : p
    ));
    try {
      await firestore().collection('posts').doc(post.id).update({
        bookmarks: saved ? firestore.FieldValue.arrayRemove(user.uid) : firestore.FieldValue.arrayUnion(user.uid),
      });
    } catch (e) { console.log('Bookmark error:', e); fetchPosts(); }
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
      }
    } catch (e) { console.log('Follow error:', e); fetchFollowing(); }
  };

  const openComments = async (post: Post) => {
    setCommentPost(post);
    setComments([]);
    setReplyingTo(null);
    setCommentText('');
    setLoadingComments(true);
    try {
      const snap = await firestore()
        .collection('posts').doc(post.id)
        .collection('comments')
        .orderBy('createdAt', 'asc')
        .get();
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
    } catch (e) { console.log('Comments error:', e); }
    finally { setLoadingComments(false); }
  };

  const handleReply = (comment: Comment) => {
    setReplyingTo({ id: comment.id, userName: comment.userName });
    setCommentText(`@${comment.userName} `);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setCommentText('');
  };

  const sendComment = async () => {
    if (!commentText.trim() || !commentPost || !user?.uid) return;
    const text = commentText.trim();
    setCommentText('');
    const replyToUser = replyingTo?.userName || null;
    setReplyingTo(null);

    const tempComment: Comment = {
      id: `temp_${Date.now()}`, userId: user.uid,
      userName: userProfile?.name || 'User', userAvatar: userProfile?.avatarUrl || '',
      text, createdAt: new Date(),
      replyTo: replyToUser || undefined,
    };
    setComments(prev => [...prev, tempComment]);
    try {
      const ref = await firestore().collection('posts').doc(commentPost.id).collection('comments').add({
        userId: user.uid, userName: userProfile?.name || 'User',
        userAvatar: userProfile?.avatarUrl || '', text,
        replyTo: replyToUser || null,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      await firestore().collection('posts').doc(commentPost.id).update({ commentCount: firestore.FieldValue.increment(1) });
      setComments(prev => prev.map(c => c.id === tempComment.id ? { ...c, id: ref.id } : c));
      setPosts(prev => prev.map(p => p.id === commentPost.id ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p));
    } catch (e) {
      console.log('Comment error:', e);
      setComments(prev => prev.filter(c => c.id !== tempComment.id));
    }
  };

  const showPostMenu = (post: Post) => {
    if (post.userId === user?.uid) {
      Alert.alert(t.postOptions, '', [
        {
          text: t.deletePost, style: 'destructive',
          onPress: async () => {
            try {
              await firestore().collection('posts').doc(post.id).delete();
              setPosts(prev => prev.filter(p => p.id !== post.id));
            } catch (e) { console.log('Delete error:', e); }
          },
        },
        { text: t.cancel, style: 'cancel' },
      ]);
    } else {
      Alert.alert(t.postOptions, '', [
        { text: t.reportPost, onPress: () => Alert.alert(t.reported, t.thankYouReport) },
        { text: t.cancel, style: 'cancel' },
      ]);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return t.justNowText;
    if (diff < 3600) return `${Math.floor(diff / 60)}${t.mAgo}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}${t.hAgo}`;
    return `${Math.floor(diff / 86400)}${t.dAgo}`;
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
    const savedCount = item.bookmarks?.length || 0;

    return (
      <View style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* header */}
        <View style={styles.postHeader}>
          <TouchableOpacity
            style={styles.postUserInfo}
            onPress={() => navigation.navigate('UserProfile', { userId: item.userId })}>
            {item.userAvatar ? (
              <Image source={{ uri: item.userAvatar }} style={styles.postAvatar} />
            ) : (
              <View style={[styles.postAvatarPlaceholder, { backgroundColor: colors.warmBg }]}>
                <Ionicons name="person" size={16} color={colors.saffron} />
              </View>
            )}
            <View>
              <Text style={[styles.postUserName, { color: colors.darkText }]}>{item.userName}</Text>
              <Text style={[styles.postUserCategory, { color: colors.muted }]}>{item.userCategory}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.postHeaderRight}>
            {!isOwnPost && (
              <TouchableOpacity
                style={[styles.followBtn, { borderColor: colors.saffron }, isFollowing && { backgroundColor: colors.warmBg, borderColor: colors.border }]}
                onPress={() => handleFollow(item.userId)}>
                <Text style={[styles.followBtnText, { color: colors.saffron }, isFollowing && { color: colors.muted }]}>
                  {isFollowing ? t.following_btn : t.follow}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => showPostMenu(item)}>
              <Ionicons name="ellipsis-vertical" size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* media */}
        <View style={styles.mediaContainer}>
          {isVideo ? (
            <Video source={{ uri: item.imageUrl }} style={styles.postImage} resizeMode="cover" controls={true} paused={true} repeat={false} />
          ) : item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.postImage} resizeMode="cover" />
          ) : null}
          {item.mediaItems && item.mediaItems.length > 1 && (
            <View style={styles.mediaCountBadge}>
              <Ionicons name="copy-outline" size={14} color="#fff" />
              <Text style={styles.mediaCountText}>{item.mediaItems.length}</Text>
            </View>
          )}
        </View>

        {/* actions */}
        <View style={styles.postActions}>
          <View style={styles.postActionsLeft}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item)}>
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={24} color={liked ? '#FF4444' : colors.darkText} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => openComments(item)}>
              <Ionicons name="chatbubble-outline" size={22} color={colors.darkText} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={async () => {
                try {
                  await Share.share({ title: item.title || 'FolkChat Artwork', message: `${item.title || 'Check out this folk art!'}\n\nBy ${item.userName}\n\n${item.caption || ''}\n\nShared from FolkChat` });
                } catch (e) { console.log('Share error:', e); }
              }}>
              <Ionicons name="paper-plane-outline" size={22} color={colors.darkText} />
            </TouchableOpacity>
          </View>
         
          <View style={styles.bookmarkRow}>
            {isOwnPost && savedCount > 0 && (
              <Text style={[styles.savedCount, { color: colors.muted }]}>{savedCount}</Text>
            )}
            <TouchableOpacity onPress={() => handleBookmark(item)}>
              <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color={saved ? colors.saffron : colors.darkText} />
            </TouchableOpacity>
          </View>
        </View>
      
       {/*Likes*/}
        {(item.likes || []).length > 0 && (
          <Text style={[styles.likesCount, { color: colors.darkText }]}>
            {item.likes.length} {item.likes.length > 1 ? t.likes : t.like}
          </Text>
        )}

        {/*Title & Caption*/}
        {item.title && (
          <View style={styles.captionRow}>
            <Text style={[styles.captionUser, { color: colors.darkText }]}>{item.userName} </Text>
            <Text style={[styles.captionText, { color: colors.darkText }]}>{item.title}</Text>
          </View>
        )}
        {item.caption ? <Text style={[styles.captionDesc, { color: colors.muted }]}>{item.caption}</Text> : null}

        {item.category && (
          <View style={styles.categoryTag}>
            <Text style={[styles.categoryTagText, { color: colors.saffron }]}># {item.category}</Text>
          </View>
        )}

        {/*Comments*/}
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
      {/* header */}
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <Text style={[styles.logo, { color: colors.saffron }]}>Folk<Text style={{ color: colors.darkText}}>Chat</Text></Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notifications')}>
            <Ionicons name="notifications-outline" size={24} color={colors.darkText} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => setShowDropdown(true)}>
            {userProfile?.avatarUrl ? (
              <Image source={{ uri: userProfile.avatarUrl }} style={[styles.avatar, { borderColor: colors.saffron }]} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.warmBg, borderColor: colors.saffron }]}>
                <Ionicons name="person" size={18} color={colors.saffron} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* feed */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.saffron]} />}
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
                {loadingComments ? (
                  <Text style={[styles.loadingText, { color: colors.muted }]}>{t.loading}</Text>
                ) : comments.length === 0 ? (
                  <Text style={[styles.noComments, { color: colors.muted }]}>{t.beFirstComment}</Text>
                ) : (
                  comments.map(c => (
                    <View key={c.id} style={styles.commentItem}>
                      {c.userAvatar ? (
                        <Image source={{ uri: c.userAvatar }} style={styles.commentAvatar} />
                      ) : (
                        <View style={[styles.commentAvatarPlaceholder, { backgroundColor: colors.warmBg }]}>
                          <Ionicons name="person" size={14} color={colors.saffron} />
                        </View>
                      )}
                      <View style={styles.commentContent}>
                        <Text style={[styles.commentUser, { color: colors.darkText }]}>{c.userName}</Text>
                        {/* reply tag highlight */}
                        {c.replyTo ? (
                          <Text style={[styles.commentText, { color: colors.darkText }]}>
                            <Text style={{ color: colors.saffron, fontWeight: '600' }}>@{c.replyTo} </Text>
                            {c.text.replace(`@${c.replyTo} `, '').replace(`@${c.replyTo}`, '')}
                          </Text>
                        ) : (
                          <Text style={[styles.commentText, { color: colors.darkText }]}>{c.text}</Text>
                        )}
                        {/* reply button */}
                        <TouchableOpacity
                          style={styles.replyBtn}
                          onPress={() => handleReply(c)}>
                          <Text style={[styles.replyBtnText, { color: colors.muted }]}>Reply</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>

              {/* reply indicator */}
              {replyingTo && (
                <View style={[styles.replyIndicator, { backgroundColor: colors.warmBg, borderTopColor: colors.border }]}>
                  <Text style={[styles.replyIndicatorText, { color: colors.muted }]}>
                    Replying to <Text style={{ color: colors.saffron, fontWeight: '600' }}>@{replyingTo.userName}</Text>
                  </Text>
                  <TouchableOpacity onPress={cancelReply}>
                    <Ionicons name="close-circle" size={18} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              )}

              <View style={[styles.commentInput, { borderTopColor: colors.border }]}>
                {userProfile?.avatarUrl ? (
                  <Image source={{ uri: userProfile.avatarUrl }} style={styles.commentAvatar} />
                ) : (
                  <View style={[styles.commentAvatarPlaceholder, { backgroundColor: colors.warmBg }]}>
                    <Ionicons name="person" size={14} color={colors.saffron} />
                  </View>
                )}
                <TextInput
                  style={[styles.commentTextInput, { backgroundColor: colors.offwhite, color: colors.darkText }]}
                  placeholder={replyingTo ? `Reply to @${replyingTo.userName}...` : t.addComment}
                  placeholderTextColor={colors.muted}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  autoFocus={!!replyingTo}
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
            <TouchableOpacity style={styles.dropdownItem}
              onPress={() => { setShowDropdown(false); navigation.navigate('UserProfile', { userId: user?.uid }); }}>
              <Ionicons name="person-outline" size={18} color={colors.darkText} />
              <Text style={[styles.dropdownLabel, { color: colors.darkText }]}>{t.myProfile}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem}
              onPress={() => { setShowDropdown(false); navigation.navigate('Analytics'); }}>
              <Ionicons name="analytics-outline" size={18} color={colors.darkText} />
              <Text style={[styles.dropdownLabel, { color: colors.darkText }]}>{t.analytics}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem}
              onPress={() => { setShowDropdown(false); navigation.navigate('EditProfile'); }}>
              <Ionicons name="create-outline" size={18} color={colors.darkText} />
              <Text style={[styles.dropdownLabel, { color: colors.darkText }]}>{t.editProfile}</Text>
            </TouchableOpacity>
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
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8,
    borderBottomWidth: 0.5,
  },
  logo: { fontSize: 22, fontWeight: 'bold' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifBtn: { padding: 4 },
  avatarBtn: { padding: 2 },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2 },
  avatarPlaceholder: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  postCard: { marginBottom: 12, marginHorizontal: 12, borderRadius: 16, borderWidth: 1, overflow: 'hidden', elevation: 2 },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  postUserInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  postAvatar: { width: 40, height: 40, borderRadius: 20 },
  postAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  postUserName: { fontSize: 14, fontWeight: 'bold' },
  postUserCategory: { fontSize: 12 },
  postHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  followBtn: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 5 },
  followBtnText: { fontSize: 13, fontWeight: '600' },
  mediaContainer: { position: 'relative' },
  postImage: { width, height: width },
  mediaCountBadge: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4,
  },
  mediaCountText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  postActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  postActionsLeft: { flexDirection: 'row', gap: 16 },
  actionBtn: { padding: 2 },
  bookmarkRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  savedCount: { fontSize: 12, fontWeight: '600' },
  likesCount: { paddingHorizontal: 14, fontSize: 13, fontWeight: 'bold' },
  captionRow: { flexDirection: 'row', paddingHorizontal: 14, paddingTop: 4, flexWrap: 'wrap' },
  captionUser: { fontSize: 13, fontWeight: 'bold' },
  captionText: { fontSize: 13 },
  captionDesc: { paddingHorizontal: 14, fontSize: 13, marginTop: 2 },
  categoryTag: { paddingHorizontal: 14, paddingVertical: 4 },
  categoryTagText: { fontSize: 12, fontWeight: '500' },
  viewComments: { paddingHorizontal: 14, fontSize: 13, marginBottom: 2 },
  postTime: { paddingHorizontal: 14, paddingBottom: 12, fontSize: 11 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 100, gap: 12 },
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
  commentAvatarPlaceholder: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  commentContent: { flex: 1 },
  commentUser: { fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  commentText: { fontSize: 13, lineHeight: 18 },
  replyBtn: { marginTop: 4 },
  replyBtnText: { fontSize: 12, fontWeight: '600' },
  replyIndicator: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 0.5,
  },
  replyIndicatorText: { fontSize: 13 },
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