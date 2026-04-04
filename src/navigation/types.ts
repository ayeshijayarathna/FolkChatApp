export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Upload: undefined;
  Messages: undefined;
  Settings: undefined;
};

export type RootStackNavigatorParamList = {
  MainTabs: undefined;
  Profile: { userId: string };
  EditProfile: undefined;
  Analytics: undefined;
  Chat: { userId: string; userName: string };
  Notifications: undefined;
};