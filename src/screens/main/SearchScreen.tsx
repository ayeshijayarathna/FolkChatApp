import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, Image, Dimensions, ActivityIndicator,
  ScrollView, Modal, Share,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import firestore from '@react-native-firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LanguageContext';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');
const GRID = Math.floor((width - 4) / 3);

//reusable PostGrid 
function PostGrid({ posts, colors, onPress }: { posts: Post[]; colors: any; onPress: (p: Post) => void }) {
  if (posts.length === 0) return null;
  return (
    <FlatList
      data={posts}
      keyExtractor={p => p.id}
      numColumns={3}
      scrollEnabled={false}
      columnWrapperStyle={{ gap: 2 }}
      ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={{ width: GRID, height: GRID, position: 'relative', overflow: 'hidden' }}
          onPress={() => onPress(item)}
          activeOpacity={0.85}>
          {item.imageUrl
            ? <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            : <View style={{ width: '100%', height: '100%', backgroundColor: colors.warmBg, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="image-outline" size={28} color={colors.muted} />
              </View>
          }
          {/* multiple media badge */}
          {(item as any).mediaItems?.length > 1 && (
            <View style={pgStyles.mediaCount}>
              <Ionicons name="copy-outline" size={11} color="#fff" />
              <Text style={pgStyles.mediaCountTxt}>{(item as any).mediaItems.length}</Text>
            </View>
          )}
          {/* likes badge */}
          {(item.likes || []).length > 0 && (
            <View style={pgStyles.likes}>
              <Ionicons name="heart" size={10} color="#fff" />
              <Text style={pgStyles.likesTxt}>{item.likes.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    />
  );
}

const pgStyles = StyleSheet.create({
  mediaCount: { position: 'absolute', top: 5, right: 5, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  mediaCountTxt: { fontSize: 10, color: '#fff', fontWeight: '600' },
  likes: { position: 'absolute', bottom: 5, left: 5, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  likesTxt: { fontSize: 10, color: '#fff', fontWeight: '600' },
});

interface Artist {
  uid: string; name: string; artistCategory: string;
  avatarUrl: string; followers: string[]; bio?: string;
}
interface Post {
  id: string; imageUrl: string; title: string; caption: string;
  userId: string; likes: string[]; bookmarks: string[];
  category: string; commentCount: number; createdAt: any;
  userName?: string; userAvatar?: string;
  mediaItems?: { url: string; type: 'image' | 'video' }[];
}

function initials(name: string) { return (name || 'A').charAt(0).toUpperCase(); }

//modal img swiper
function ModalSwiper({ post, colors }: { post: Post; colors: any }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const items: { url: string; type: 'image' | 'video' }[] =
    post.mediaItems && post.mediaItems.length > 0
      ? post.mediaItems
      : [{ url: post.imageUrl, type: 'image' }];

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
        renderItem={({ item }) => (
          <Image source={{ uri: item.url }} style={dm.image} resizeMode="cover" />
        )}
      />
      {/* prev arrow */}
      {activeIndex > 0 && (
        <TouchableOpacity style={dm.arrowLeft} onPress={() => goTo(activeIndex - 1)}>
          <View style={dm.arrowBg}>
            <Ionicons name="chevron-back" size={18} color="#fff" />
          </View>
        </TouchableOpacity>
      )}
      {/* next arrow */}
      {activeIndex < items.length - 1 && (
        <TouchableOpacity style={dm.arrowRight} onPress={() => goTo(activeIndex + 1)}>
          <View style={dm.arrowBg}>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </View>
        </TouchableOpacity>
      )}
      {/* dots & counter */}
      {items.length > 1 && (
        <View style={dm.dotsRow}>
          {items.length <= 6
            ? items.map((_, i) => (
                <View key={i} style={[dm.dot,
                  { backgroundColor: i === activeIndex ? colors.saffron : 'rgba(255,255,255,0.7)' },
                  i === activeIndex && dm.dotActive]} />
              ))
            : <View style={dm.counter}>
                <Text style={dm.counterTxt}>{activeIndex + 1} / {items.length}</Text>
              </View>
          }
        </View>
      )}
    </View>
  );
}

//post detail modal 
function PostDetailModal({ post, visible, onClose, navigation, colors, user, userProfile }: any) {
  const [liked, setLiked] = useState((post?.likes || []).includes(user?.uid));
  const [saved, setSaved] = useState((post?.bookmarks || []).includes(user?.uid));
  const [likesCount, setLikesCount] = useState(post?.likes?.length || 0);

  useEffect(() => {
    if (post) {
      setLiked((post.likes || []).includes(user?.uid));
      setSaved((post.bookmarks || []).includes(user?.uid));
      setLikesCount(post.likes?.length || 0);
    }
  }, [post]);

  const handleLike = async () => {
    if (!user?.uid || !post) return;
    const nowLiked = !liked;
    setLiked(nowLiked);
    setLikesCount((prev: number) => nowLiked ? prev + 1 : prev - 1);
    try {
      await firestore().collection('posts').doc(post.id).update({
        likes: nowLiked ? firestore.FieldValue.arrayUnion(user.uid) : firestore.FieldValue.arrayRemove(user.uid),
      });
      if (nowLiked && post.userId !== user.uid) {
        await firestore().collection('notifications').add({
          toUserId: post.userId, fromUserId: user.uid,
          fromUserName: userProfile?.name || 'Someone', fromUserAvatar: userProfile?.avatarUrl || '',
          type: 'like', postId: post.id, postImage: post.imageUrl,
          message: `${userProfile?.name || 'Someone'} liked your post`,
          read: false, createdAt: firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch { }
  };

  const handleSave = async () => {
    if (!user?.uid || !post) return;
    const nowSaved = !saved;
    setSaved(nowSaved);
    try {
      await firestore().collection('posts').doc(post.id).update({
        bookmarks: nowSaved ? firestore.FieldValue.arrayUnion(user.uid) : firestore.FieldValue.arrayRemove(user.uid),
      });
    } catch { }
  };

  if (!post) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={dm.overlay}>
        <View style={[dm.sheet, { backgroundColor: colors.card }]}>
          {/* header */}
          <View style={[dm.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={dm.userRow}
              onPress={() => { onClose(); navigation.navigate('UserProfile', { userId: post.userId }); }}>
              {post.userAvatar
                ? <Image source={{ uri: post.userAvatar }} style={dm.avatar} />
                : <View style={[dm.avatarInit, { backgroundColor: colors.saffron }]}>
                    <Text style={dm.initTxt}>{initials(post.userName || '')}</Text>
                  </View>
              }
              <View>
                <Text style={[dm.userName, { color: colors.darkText }]}>{post.userName || 'Artist'}</Text>
                <Text style={[dm.category, { color: colors.saffron }]}>{post.category}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.darkText} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* multi img swiper */}
            <ModalSwiper post={post} colors={colors} />

            {/* actions */}
            <View style={dm.actions}>
              <View style={dm.actionsLeft}>
                <TouchableOpacity style={dm.actionBtn} onPress={handleLike}>
                  <Ionicons name={liked ? 'heart' : 'heart-outline'} size={26} color={liked ? '#FF4444' : colors.darkText} />
                </TouchableOpacity>
                <TouchableOpacity style={dm.actionBtn} onPress={() => { onClose(); navigation.navigate('UserProfile', { userId: post.userId }); }}>
                  <Ionicons name="chatbubble-outline" size={24} color={colors.darkText} />
                </TouchableOpacity>
                <TouchableOpacity style={dm.actionBtn} onPress={async () => {
                  try { await Share.share({ title: post.title, message: `${post.title}\nShared from FolkChat` }); } catch { }
                }}>
                  <Ionicons name="paper-plane-outline" size={24} color={colors.darkText} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={handleSave}>
                <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={24} color={saved ? colors.saffron : colors.darkText} />
              </TouchableOpacity>
            </View>

            {/* info */}
            <View style={dm.info}>
              {likesCount > 0 && (
                <Text style={[dm.likes, { color: colors.darkText }]}>{likesCount} {likesCount > 1 ? 'likes' : 'like'}</Text>
              )}
              {post.title ? (
                <Text style={[dm.title, { color: colors.darkText }]}>{post.title}</Text>
              ) : null}
              {post.caption ? (
                <Text style={[dm.caption, { color: colors.muted }]}>{post.caption}</Text>
              ) : null}
              {post.category ? (
                <Text style={[dm.tag, { color: colors.saffron }]}># {post.category}</Text>
              ) : null}
              {post.commentCount > 0 && (
                <TouchableOpacity onPress={() => { onClose(); navigation.navigate('UserProfile', { userId: post.userId }); }}>
                  <Text style={[dm.commentsLink, { color: colors.muted }]}>View all {post.commentCount} comments</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const dm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 0.5 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarInit: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  initTxt: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  userName: { fontSize: 14, fontWeight: 'bold' },
  category: { fontSize: 12 },
  image: { width, height: width },
  arrowLeft: { position: 'absolute', left: 10, top: '50%', marginTop: -16, zIndex: 10 },
  arrowRight: { position: 'absolute', right: 10, top: '50%', marginTop: -16, zIndex: 10 },
  arrowBg: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  dotsRow: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { width: 18 },
  counter: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  counterTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  actionsLeft: { flexDirection: 'row', gap: 16 },
  actionBtn: { padding: 2 },
  info: { paddingHorizontal: 16, paddingBottom: 30 },
  likes: { fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  caption: { fontSize: 13, lineHeight: 20, marginBottom: 8 },
  tag: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  commentsLink: { fontSize: 13 },
});

//main SearchScreen
export default function SearchScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { t } = useLang();
  const { user, userProfile } = useAuthStore();

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'posts' | 'artists'>('posts');
  const [loading, setLoading] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [suggestedArtists, setSuggestedArtists] = useState<Artist[]>([]);
  const [followingList, setFollowingList] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // load all posts &  suggested artists on mount
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // my following list
        let myFollowing: string[] = [];
        if (user?.uid) {
          const me = await firestore().collection('users').doc(user.uid).get();
          myFollowing = me.data()?.following || [];
          setFollowingList(myFollowing);
        }

        // suggested: not following, sorted by follower count
        const usersSnap = await firestore().collection('users').get();
        const suggested = usersSnap.docs
          .map(d => ({ uid: d.id, ...d.data() } as Artist))
          .filter(a => a.uid !== user?.uid && !myFollowing.includes(a.uid))
          .sort((a, b) => (b.followers?.length || 0) - (a.followers?.length || 0))
          .slice(0, 15);
        setSuggestedArtists(suggested);

        // all recent posts enriched with user info
        const postsSnap = await firestore().collection('posts').orderBy('createdAt', 'desc').limit(50).get();
        const enriched = await Promise.all(postsSnap.docs.map(async d => {
          const data = d.data();
          try {
            const u = await firestore().collection('users').doc(data.userId).get();
            const ud = u.data();
            return { id: d.id, ...data, userName: ud?.name || 'Artist', userAvatar: ud?.avatarUrl || '' } as Post;
          } catch {
            return { id: d.id, ...data, userName: 'Artist', userAvatar: '' } as Post;
          }
        }));
        setAllPosts(enriched);
      } catch { } finally { setLoading(false); }
    };
    load();
  }, [user]);

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setHasSearched(false); setArtists([]); setPosts([]); return; }
    setHasSearched(true);
    const lower = q.toLowerCase();
    // filter from already loaded data
    const matchedPosts = allPosts.filter(p =>
      (p.title || '').toLowerCase().includes(lower) ||
      (p.category || '').toLowerCase().includes(lower) ||
      (p.caption || '').toLowerCase().includes(lower)
    );
    setPosts(matchedPosts);
    const matchedArtists = suggestedArtists.filter(a =>
      (a.name || '').toLowerCase().includes(lower) ||
      (a.artistCategory || '').toLowerCase().includes(lower) ||
      (a.bio || '').toLowerCase().includes(lower)
    );
    setArtists(matchedArtists);
  }, [allPosts, suggestedArtists]);

  const handleFollow = async (targetUid: string) => {
    if (!user?.uid) return;
    const isFollowing = followingList.includes(targetUid);
    setFollowingList(prev => isFollowing ? prev.filter(id => id !== targetUid) : [...prev, targetUid]);
    // also remove from suggested if followed
    if (!isFollowing) {
      setSuggestedArtists(prev => prev.filter(a => a.uid !== targetUid));
    }
    try {
      const myRef = firestore().collection('users').doc(user.uid);
      const targetRef = firestore().collection('users').doc(targetUid);
      if (isFollowing) {
        await myRef.update({ following: firestore.FieldValue.arrayRemove(targetUid) });
        await targetRef.update({ followers: firestore.FieldValue.arrayRemove(user.uid) });
      } else {
        await myRef.update({ following: firestore.FieldValue.arrayUnion(targetUid) });
        await targetRef.update({ followers: firestore.FieldValue.arrayUnion(user.uid) });
        await firestore().collection('notifications').add({
          toUserId: targetUid, fromUserId: user.uid,
          fromUserName: userProfile?.name || 'Someone', fromUserAvatar: userProfile?.avatarUrl || '',
          type: 'follow', message: `${userProfile?.name || 'Someone'} started following you`,
          read: false, createdAt: firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch { }
  };

  const displayPosts = hasSearched ? posts : allPosts;
  const displayArtists = hasSearched ? artists : suggestedArtists;

  const renderArtistCard = (item: Artist) => {
    const isFollowing = followingList.includes(item.uid);
    return (
      <TouchableOpacity
        key={item.uid}
        style={[styles.artistCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => navigation.navigate('UserProfile', { userId: item.uid })}
        activeOpacity={0.85}>
        {item.avatarUrl
          ? <Image source={{ uri: item.avatarUrl }} style={styles.artistAvatar} />
          : <View style={[styles.artistAvatarInit, { backgroundColor: colors.saffron }]}>
              <Text style={styles.initTxt}>{initials(item.name)}</Text>
            </View>
        }
        <View style={styles.artistInfo}>
          <Text style={[styles.artistName, { color: colors.darkText }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.artistCat, { color: colors.saffron }]} numberOfLines={1}>{item.artistCategory || 'Folk Artist'}</Text>
          <Text style={[styles.artistFollowers, { color: colors.muted }]}>{(item.followers || []).length} followers</Text>
        </View>
        <TouchableOpacity
          style={[styles.followBtn, { borderColor: colors.saffron }, isFollowing && { backgroundColor: colors.warmBg, borderColor: colors.border }]}
          onPress={() => handleFollow(item.uid)}>
          <Text style={[styles.followBtnTxt, { color: isFollowing ? colors.muted : colors.saffron }]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* search bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <Text style={[styles.screenTitle, { color: colors.darkText }]}>Search</Text>
        <View style={[styles.inputWrap, { backgroundColor: colors.offwhite, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput
            style={[styles.input, { color: colors.darkText }]}
            placeholder="Search artists, artworks..."
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={v => { setQuery(v); handleSearch(v); }}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setHasSearched(false); }}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        {(['posts', 'artists'] as const).map(tab => (
          <TouchableOpacity key={tab}
            style={[styles.tab, activeTab === tab && [styles.tabActive, { borderBottomColor: colors.saffron }]]}
            onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabTxt, { color: activeTab === tab ? colors.saffron : colors.muted }]}>
              {tab === 'posts' ? 'Posts' : 'Artists'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.saffron} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

          {/* Posts tab */}
          {activeTab === 'posts' && (
            <>
              {hasSearched && (
                <Text style={[styles.resultHint, { color: colors.muted }]}>
                  {displayPosts.length} post{displayPosts.length !== 1 ? 's' : ''} found
                </Text>
              )}
              {!hasSearched && (
                <Text style={[styles.sectionLabel, { color: colors.darkText }]}>All Posts</Text>
              )}
              {displayPosts.length === 0 && hasSearched ? (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={48} color={colors.muted} />
                  <Text style={[styles.emptyTxt, { color: colors.muted }]}>No posts found for "{query}"</Text>
                </View>
              ) : (
                <PostGrid posts={displayPosts} colors={colors} onPress={setSelectedPost} />
              )}
            </>
          )}

          {/* Artists tab */}
          {activeTab === 'artists' && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.darkText }]}>
                {hasSearched ? `${displayArtists.length} artist${displayArtists.length !== 1 ? 's' : ''} found` : 'Suggested for You'}
              </Text>
              {!hasSearched && (
                <Text style={[styles.sectionSub, { color: colors.muted }]}>Artists you don't follow yet</Text>
              )}
              {displayArtists.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color={colors.muted} />
                  <Text style={[styles.emptyTxt, { color: colors.muted }]}>
                    {hasSearched ? `No artists found for "${query}"` : 'No suggestions available'}
                  </Text>
                </View>
              ) : (
                <View style={{ paddingHorizontal: 16 }}>
                  {displayArtists.map(a => renderArtistCard(a))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Post detail modal */}
      <PostDetailModal
        post={selectedPost}
        visible={selectedPost !== null}
        onClose={() => setSelectedPost(null)}
        navigation={navigation}
        colors={colors}
        user={user}
        userProfile={userProfile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: { paddingTop: 52, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5 },
  screenTitle: { fontSize: 26, fontWeight: 'bold', marginBottom: 12 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderWidth: 1 },
  input: { flex: 1, fontSize: 15, padding: 0 },
  tabs: { flexDirection: 'row', borderBottomWidth: 0.5 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabActive: { borderBottomWidth: 2 },
  tabTxt: { fontSize: 14, fontWeight: '600' },
  loadingState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  resultHint: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, fontSize: 13 },
  sectionLabel: { fontSize: 16, fontWeight: '700', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  sectionSub: { fontSize: 13, paddingHorizontal: 16, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: { position: 'relative', overflow: 'hidden' },
  gridImg: { width: '100%', height: '100%' },
  artistCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10, gap: 12 },
  artistAvatar: { width: 52, height: 52, borderRadius: 26 },
  artistAvatarInit: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  initTxt: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
  artistInfo: { flex: 1 },
  artistName: { fontSize: 15, fontWeight: '700' },
  artistCat: { fontSize: 13, marginTop: 2 },
  artistFollowers: { fontSize: 12, marginTop: 2 },
  followBtn: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  followBtnTxt: { fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTxt: { fontSize: 14 },
});