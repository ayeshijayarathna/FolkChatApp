import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID',
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

export const signInWithGoogle = async () => {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  try { await GoogleSignin.signOut(); } catch {}

  const response = await GoogleSignin.signIn();
  const idToken = response.data?.idToken;
  if (!idToken) throw new Error('No ID token found');

  const googleCredential = auth.GoogleAuthProvider.credential(idToken);
  const result = await auth().signInWithCredential(googleCredential);

  const userDoc = await firestore()
    .collection('users').doc(result.user.uid).get();
  if (!userDoc.exists()) {
    await firestore().collection('users').doc(result.user.uid).set({
      name: result.user.displayName || '',
      email: result.user.email || '',
      avatarUrl: result.user.photoURL || '',
      artistCategory: '',
      createdAt: new Date(),
      followers: [],
      following: [],
      bio: '',
      coverUrl: '',
    });
  }
  return result;
};

export const signInWithEmail = (email: string, password: string) =>
  auth().signInWithEmailAndPassword(email, password);

export const signUpWithEmail = (email: string, password: string) =>
  auth().createUserWithEmailAndPassword(email, password);

export const signOut = () => auth().signOut();

export const getCurrentUser = () => auth().currentUser;

export const createUserProfile = (uid: string, data: object) =>
  firestore().collection('users').doc(uid).set(data, { merge: true });

export const getUserProfile = (uid: string) =>
  firestore().collection('users').doc(uid).get();

export { auth, firestore };