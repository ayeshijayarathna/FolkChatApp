import { create } from 'zustand';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

interface AuthState {
  user: any;
  userProfile: any;
  loading: boolean;
  setUser: (user: any) => void;
  setUserProfile: (profile: any) => void;
  setLoading: (loading: boolean) => void;
  fetchUserProfile: (uid: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userProfile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setUserProfile: (profile) => set({ userProfile: profile }),
  setLoading: (loading) => set({ loading }),
  fetchUserProfile: async (uid) => {
    try {
      const doc = await firestore().collection('users').doc(uid).get();
      if (doc.exists()) {
        set({ userProfile: doc.data() });
      } else {
        // Document or empty profile is set.
        set({
          userProfile: {
            name: '',
            email: '',
            bio: '',
            artistCategory: '',
            avatarUrl: '',
            coverUrl: '',
            followers: [],
            following: [],
          }
        });
      }
    } catch (e) {
      console.log('fetchUserProfile error:', e);
    }
  },
  logout: async () => {
    await auth().signOut();
    set({ user: null, userProfile: null });
  },
}));