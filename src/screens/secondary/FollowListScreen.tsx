import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Image, ActivityIndicator,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import firestore from '@react-native-firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LanguageContext';
import { useAuthStore } from '../../store/authStore';

export default function FollowListScreen({ navigation, route }: any) {
  const { type, list } = route.params;
  const { colors } = useTheme();
  const { t } = useLang();
  const { user } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      if (!list || list.length === 0) { setLoading(false); return; }
      try {
        const usersData = await Promise.all(
          list.map(async (uid: string) => {
            const doc = await firestore().collection('users').doc(uid).get();
            return { uid, ...doc.data() };
          })
        );
        setUsers(usersData);
      } catch (e) { console.log('FollowList error:', e); }
      finally { setLoading(false); }
    };
    loadUsers();
  }, [list]);

  const handleUserPress = (uid: string) => {
    navigation.navigate('UserProfile', { userId: uid });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.offwhite }]}>
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.darkText} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.darkText }]}>
          {type === 'followers' ? t.followers : t.following}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.saffron} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.uid}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.userItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
              onPress={() => handleUserPress(item.uid)}>
              {item.avatarUrl ? (
                <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.warmBg, borderColor: colors.border }]}>
                  <Ionicons name="person" size={20} color={colors.saffron} />
                </View>
              )}
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.darkText }]}>
                  {item.name || 'Artist'}
                  {item.uid === user?.uid && (
                    <Text style={[styles.youBadge, { color: colors.muted }]}> (You)</Text>
                  )}
                </Text>
                <Text style={[styles.userCategory, { color: colors.muted }]}>
                  {item.artistCategory || 'Folk Artist'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                {type === 'followers' ? 'No followers yet' : 'Not following anyone'}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, borderBottomWidth: 0.5 },
  title: { fontSize: 18, fontWeight: 'bold' },
  loadingState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  userItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 0.5 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: 'bold' },
  youBadge: { fontSize: 13, fontWeight: 'normal' },
  userCategory: { fontSize: 13, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15 },
});