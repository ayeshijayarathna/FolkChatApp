import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LanguageContext';
import { useAuthStore } from '../store/authStore';
import HomeFeedScreen from '../screens/main/HomeFeedScreen';
import SearchScreen from '../screens/main/SearchScreen';
import UploadScreen from '../screens/main/UploadScreen';
import MessagesScreen from '../screens/main/MessagesScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');

//Custom Tab Bar
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLang();
  const { user } = useAuthStore();
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = firestore()
      .collection('chats')
      .where('participants', 'array-contains', user.uid)
      .onSnapshot(snap => {
        let count = 0;
        snap.docs.forEach(doc => {
          count += doc.data().unreadCount?.[user.uid] || 0;
        });
        setTotalUnread(count);
      }, () => { });
    return () => unsub();
  }, [user]);

  // Tab order-Search, Upload, Home (center), Messages, Settings
  const getIcon = (routeName: string, focused: boolean) => {
    const color = focused ? colors.saffron : colors.muted;
    const size = 22;
    if (routeName === 'Home')     return <Ionicons name={focused ? 'home' : 'home-outline'} size={28} color="#fff" />;
    if (routeName === 'Search')   return <Ionicons name={focused ? 'search' : 'search-outline'} size={size} color={color} />;
    if (routeName === 'Upload')   return <Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} size={size + 2} color={color} />;
    if (routeName === 'Messages') return <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={size} color={color} />;
    if (routeName === 'Settings') return <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />;
    return null;
  };

  const getLabel = (routeName: string) => {
    const labels: Record<string, string> = {
      Home: t.home,
      Search: t.search,
      Upload: t.upload || 'Upload',
      Messages: t.messages,
      Settings: t.settings_title,
    };
    return labels[routeName] || routeName;
  };

  //find home route index
  const homeIdx = state.routes.findIndex(r => r.name === 'Home');
  const homeRoute = state.routes[homeIdx];
  const homeFocused = state.index === homeIdx;

  const leftRoutes  = state.routes.filter((r, i) => r.name !== 'Home' && i < homeIdx);
  const rightRoutes = state.routes.filter((r, i) => r.name !== 'Home' && i > homeIdx);

  const renderTab = (route: any, isFocused: boolean) => {
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
    };

    return (
      <TouchableOpacity
        key={route.key}
        accessibilityRole="button"
        onPress={onPress}
        activeOpacity={0.7}
        style={s.tabBtn}>
        <View style={{ position: 'relative' }}>
          {getIcon(route.name, isFocused)}
          {route.name === 'Messages' && totalUnread > 0 && (
            <View style={[s.badge, { backgroundColor: colors.saffron }]}>
              <Text style={s.badgeTxt}>{totalUnread > 9 ? '9+' : totalUnread}</Text>
            </View>
          )}
        </View>
        <Text style={[s.tabLabel, { color: isFocused ? colors.saffron : colors.muted }]}>
          {getLabel(route.name)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.wrap}>
      {/* bar background with curved top corners */}
      <View style={[s.bar, {
        backgroundColor: isDark ? colors.tabBar : '#F5E6CC', 
        borderColor: isDark ? colors.saffron : 'white',
        borderTopWidth: 1.5,     
        borderLeftWidth: 1.5,
        borderRightWidth: 1.5,
      }]}>
        {/* left side */}
        <View style={s.side}>
          {leftRoutes.map(route => {
            const idx = state.routes.findIndex(r => r.key === route.key);
            return renderTab(route, state.index === idx);
          })}
        </View>

        {/* Spacer for floating button */}
        <View style={s.centerSpacer} />

        {/* Right side */}
        <View style={s.side}>
          {rightRoutes.map(route => {
            const idx = state.routes.findIndex(r => r.key === route.key);
            return renderTab(route, state.index === idx);
          })}
        </View>
      </View>

      {/* floating home button */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={[s.floatBtn, { backgroundColor: colors.saffron, shadowColor: colors.saffron }]}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: homeRoute.key, canPreventDefault: true });
          if (!homeFocused && !event.defaultPrevented) navigation.navigate(homeRoute.name);
        }}>
        <View style={[s.floatRing, { borderColor: isDark ? colors.tabBar : '#F5E6CC' }]}>
          {getIcon('Home', homeFocused)}
        </View>
      </TouchableOpacity>
    </View>
  );
}

//tab navigator
export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Search"   component={SearchScreen} />
      <Tab.Screen name="Upload"   component={UploadScreen} />
      <Tab.Screen name="Home"     component={HomeFeedScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const FLOAT_SIZE = 64;

const s = StyleSheet.create({
  wrap: {
    position: 'relative',
    height: 70,
  },
  bar: {
    flexDirection: 'row',
    height: 64,
    paddingBottom: 6,
    paddingTop: 6,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  centerSpacer: {
    width: FLOAT_SIZE + 12,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeTxt: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  floatBtn: {
    position: 'absolute',
    top: -22,
    left: width / 2 - FLOAT_SIZE / 2,
    width: FLOAT_SIZE,
    height: FLOAT_SIZE,
    borderRadius: FLOAT_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  floatRing: {
    width: FLOAT_SIZE - 6,
    height: FLOAT_SIZE - 6,
    borderRadius: (FLOAT_SIZE - 6) / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
  },
});