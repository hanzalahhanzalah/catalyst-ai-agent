import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_ICON_SIZE = 22;

// Minimum guaranteed clearance above Android system nav buttons (px)
// This covers both 3-button nav (~48px) and gesture nav (~24px) fallback
const ANDROID_MIN_BOTTOM = 24;

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Use whichever is larger: actual system inset OR our minimum guarantee.
  // This prevents overlap on devices where insets.bottom incorrectly returns 0.
  const safeBottom = Platform.OS === 'android'
    ? Math.max(insets.bottom, ANDROID_MIN_BOTTOM)
    : insets.bottom;

  const tabBarHeight = Platform.OS === 'ios' ? 80 : 56 + safeBottom;
  const tabBarPaddingBottom = Platform.OS === 'ios' ? 24 : safeBottom + 4;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          height: tabBarHeight,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 8,
          // Elevate above system nav on Android — critical for edge-to-edge
          elevation: 8,
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" size={TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color }) => (
            <Ionicons name="bulb-outline" size={TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="actions"
        options={{
          title: 'Actions',
          tabBarIcon: ({ color }) => (
            <Ionicons name="play-circle-outline" size={TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="outcome"
        options={{
          title: 'Outcome',
          tabBarIcon: ({ color }) => (
            <Ionicons name="checkmark-circle-outline" size={TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="trace"
        options={{
          title: 'Trace',
          tabBarIcon: ({ color }) => (
            <Ionicons name="list-outline" size={TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
