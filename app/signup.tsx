import { Link } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PublicWebFrame from '../components/PublicWebFrame';
import { supabase } from '../lib/supabase';
import MotionButton from '../components/ui/MotionButton';

const SIGNUP_HIGHLIGHTS = [
  {
    title: 'Start once, use everywhere',
    text: 'Create the account on the web, then keep the same tours and limits on browser, iPhone, and Android.',
  },
  {
    title: 'Pick the plan that fits',
    text: 'Compare tour, scene, storage, share-link, and embed limits before you commit to a workflow.',
  },
  {
    title: 'Built for real operations',
    text: 'The same account can later open plans, admin tools, and daily tour work from the same product.',
  },
];

export default function SignupScreen() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isDesktop = Platform.OS === 'web' && width >= 980;
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'Please fill all fields.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      Alert.alert('Signup failed', error.message);
      setLoading(false);
      return;
    }

    Alert.alert('Success', 'Account created. Check your email to confirm your account.');
    setFullName('');
    setEmail('');
    setPassword('');
    setLoading(false);
  };

  const formCard = (
    <View style={[styles.formCard, isDesktop ? styles.formCardDesktop : null]}>
      <Text style={styles.heading}>Create Account</Text>
      <Text style={styles.subheading}>
        Start building immersive tours and choose the plan that fits your work.
      </Text>

      <TextInput
        placeholder="Full name"
        placeholderTextColor="#888"
        value={fullName}
        onChangeText={setFullName}
        style={styles.input}
      />

      <TextInput
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <MotionButton
        onPress={handleSignup}
        loading={loading}
        variant="primary"
        style={{ marginTop: 6, marginBottom: 18 }}
      >
        Create Account
      </MotionButton>

      <View style={styles.linkRow}>
        <Text style={styles.linkText}>Want to compare plans first? </Text>
        <Link href="/pricing" style={styles.linkAction}>
          View Pricing
        </Link>
      </View>

      <View style={styles.linkRow}>
        <Text style={styles.linkText}>Already have an account? </Text>
        <Link href="/login" style={styles.linkAction}>
          Sign in
        </Link>
      </View>
    </View>
  );

  if (isWeb) {
    return (
      <PublicWebFrame
        activeRoute="/signup"
        eyebrow="Create Account"
        title="Create your account and start building tours"
        description="Open your account, choose the plan that fits your work, and keep the same tours and limits across web, iPhone, and Android."
        asideTitle="What carries into the platform"
        asideText="Your account setup, plan choice, and access rules stay aligned across the product."
        asideItems={[
          'Shared pricing flow for browser, iPhone, and Android',
          'Strict tour, scene, storage, share-link, and embed rules',
          'The same account continues into tours, profile, and admin tools',
        ]}
      >
        <View style={isDesktop ? styles.desktopSection : styles.webSection}>
          {isDesktop ? (
            <View style={styles.desktopStory}>
              <Text style={styles.desktopStoryLabel}>Getting Started</Text>
              <Text style={styles.desktopStoryTitle}>Start once and keep the same account everywhere</Text>
              <Text style={styles.desktopStoryText}>
                Create the account here, compare plan limits clearly, and continue into the same product experience across all supported platforms.
              </Text>

              <View style={styles.desktopFeatureGrid}>
                {SIGNUP_HIGHLIGHTS.map(item => (
                  <View key={item.title} style={styles.desktopFeatureCard}>
                    <Text style={styles.desktopFeatureTitle}>{item.title}</Text>
                    <Text style={styles.desktopFeatureText}>{item.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.mobileWebHighlightCard}>
              {SIGNUP_HIGHLIGHTS.map(item => (
                <View key={item.title} style={styles.mobileWebHighlightRow}>
                  <Text style={styles.mobileWebHighlightTitle}>{item.title}</Text>
                  <Text style={styles.mobileWebHighlightText}>{item.text}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.desktopFormColumn}>{formCard}</View>
        </View>
      </PublicWebFrame>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.formWrap}>{formCard}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0D0407',
  },
  formWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  webSection: {
    gap: 18,
  },
  desktopSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 28,
    paddingBottom: 24,
  },
  desktopStory: {
    flex: 1.05,
    backgroundColor: 'rgba(17,5,8,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.12)',
    borderRadius: 30,
    padding: 28,
  },
  desktopStoryLabel: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 10,
  },
  desktopStoryTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    marginBottom: 12,
    maxWidth: 560,
  },
  desktopStoryText: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 620,
    marginBottom: 20,
  },
  desktopFeatureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  desktopFeatureCard: {
    width: '48.4%',
    backgroundColor: '#130408',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 18,
  },
  desktopFeatureTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  desktopFeatureText: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 13,
    lineHeight: 20,
  },
  mobileWebHighlightCard: {
    backgroundColor: '#130408',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.12)',
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  mobileWebHighlightRow: {
    gap: 6,
  },
  mobileWebHighlightTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  mobileWebHighlightText: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 13,
    lineHeight: 20,
  },
  desktopFormColumn: {
    flex: 0.9,
    justifyContent: 'center',
  },
  formCard: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 28,
    padding: 24,
  },
  formCardDesktop: {
    maxWidth: 560,
    padding: 28,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 10,
  },
  subheading: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 22,
  },
  input: {
    backgroundColor: '#120408',
    color: '#FFFFFF',
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#C9A84C',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
  primaryButtonText: {
    color: '#0D0407',
    fontWeight: '900',
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  linkText: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  linkAction: {
    color: '#C9A84C',
    fontSize: 13,
    fontWeight: '800',
  },
});
