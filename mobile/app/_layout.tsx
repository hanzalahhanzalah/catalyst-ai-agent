import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../constants/theme';

// ── In-app Splash Screen ───────────────────────────────────────────────────────
function AppSplash({ onDone }: { onDone: () => void }) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Fade + slide + scale in
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
    ]).start();

    // Wait then fade out and call done
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true })
        .start(() => onDone());
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={SP.container}>
      <Animated.View style={[SP.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

        {/* Logo mark */}
        <Animated.View style={[SP.logoMark, { transform: [{ scale: scaleAnim }] }]}>
          {/* Outer ring */}
          <View style={SP.logoRing}>
            {/* Inner diamond icon */}
            <Ionicons name="flash" size={28} color="#fff" />
          </View>
          {/* Green dot accent */}
          <View style={SP.logoDot} />
        </Animated.View>

        {/* App name */}
        <Text style={SP.appName}>Catalyst AI</Text>

        {/* Tagline */}
        <Text style={SP.tagline}>From insight to action — instantly</Text>

        {/* Powered by note */}
        <View style={SP.poweredBy}>
          <View style={SP.poweredDot} />
          <Text style={SP.poweredText}>Powered by Google Gemini</Text>
        </View>

      </Animated.View>
    </View>
  );
}

// ── Root Layout ────────────────────────────────────────────────────────────────
export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="#1E3A5F" />
        <AppSplash onDone={() => setSplashDone(true)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style="dark" backgroundColor={colors.background} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </View>
    </SafeAreaProvider>
  );
}

// ── Splash Styles ──────────────────────────────────────────────────────────────
const SP = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E3A5F',   // Brand navy
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 12,
  },

  // Logo
  logoMark: {
    position: 'relative',
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRing: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4ADE80',  // Green accent dot
    borderWidth: 2,
    borderColor: '#1E3A5F',
  },

  // Text
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '400',
    letterSpacing: 0.2,
    textAlign: 'center',
  },

  // Powered by
  poweredBy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 32,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  poweredDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  poweredText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
});
