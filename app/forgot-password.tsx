import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PublicWebFrame from '../components/PublicWebFrame';
import { createPasswordResetRedirectUrl } from '../lib/authRedirect';
import { supabase } from '../lib/supabase';

export default function ForgotPasswordScreen() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isDesktop = Platform.OS === 'web' && width >= 980;
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const redirectTo = useMemo(() => createPasswordResetRedirectUrl(), []);

  const handleSendReset = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      Alert.alert('Missing email', 'Please enter the email you use for your account.');
      return;
    }

    setSent(false);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    });

    setLoading(false);

    if (error) {
      setSent(false);
      Alert.alert(
        'Could not send email',
        error.message === 'Network request failed'
          ? 'We could not reach the account service just now. Please try again in a moment.'
          : error.message,
      );
      return;
    }

    setSent(true);
  };

  const form = (
    <KeyboardAvoidingView
      style={styles.formWrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.formCard, isDesktop ? styles.formCardDesktop : null]}>
        <Text style={styles.heading}>Reset Password</Text>
        <Text style={styles.subheading}>
          Enter your email address and we will send you a password reset link.
        </Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
          style={styles.input}
        />

        <TouchableOpacity
          onPress={handleSendReset}
          disabled={loading}
          style={[styles.primaryButton, loading ? styles.buttonDisabled : null]}
        >
          {loading ? (
            <ActivityIndicator color="#0D0407" />
          ) : (
            <Text style={styles.primaryButtonText}>Send Reset Link</Text>
          )}
        </TouchableOpacity>

        {sent ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageTitle}>Check your email</Text>
            <Text style={styles.messageText}>
              We sent a password reset link to {email.trim() || 'your email address'}. If you do not
              see it soon, check your spam folder too.
            </Text>
            <Text style={styles.messageText}>Open the link from your email on this device to continue.</Text>
          </View>
        ) : null}

        <View style={styles.linkRow}>
          <Text style={styles.linkText}>Remembered your password? </Text>
          <Link href="/login" style={styles.linkAction}>
            Back to login
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );

  if (isWeb) {
    return (
      <PublicWebFrame
        activeRoute="/login"
        eyebrow="Account Recovery"
        title="Reset your password and get back into your account"
        description="Use your account email to receive a reset link, then continue with the same tours, plans, and access."
        asideTitle="What happens next"
        asideText="The reset link takes you back into the same account so your work and permissions stay connected."
        asideItems={[
          'Send the reset link to the email tied to your account',
          'Open the link on this device to continue securely',
          'Return to the same tours, plans, and account access',
        ]}
      >
        <View style={isDesktop ? styles.desktopSection : styles.webSection}>
          {isDesktop ? (
            <View style={styles.desktopInfo}>
              <Text style={styles.desktopInfoLabel}>Recovery</Text>
              <Text style={styles.desktopInfoTitle}>A simple path back into your account</Text>
              <Text style={styles.desktopInfoText}>
                Use this page when you need quick account recovery and want to get back into your tours without delay.
              </Text>
            </View>
          ) : null}
          <View style={styles.desktopFormColumn}>{form}</View>
        </View>
      </PublicWebFrame>
    );
  }

  return <SafeAreaView style={styles.safeArea}>{form}</SafeAreaView>;
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
    gap: 28,
    paddingBottom: 24,
  },
  desktopInfo: {
    flex: 1,
    backgroundColor: 'rgba(17,5,8,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.12)',
    borderRadius: 30,
    padding: 28,
  },
  desktopInfoLabel: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 10,
  },
  desktopInfoTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    marginBottom: 12,
    maxWidth: 520,
  },
  desktopInfoText: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 620,
  },
  desktopFormColumn: {
    flex: 0.9,
    justifyContent: 'center',
  },
  formCard: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 28,
    padding: 24,
  },
  formCardDesktop: {
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
    marginBottom: 22,
    lineHeight: 21,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#120408',
    color: '#FFFFFF',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#C9A84C',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 18,
  },
  primaryButtonText: {
    color: '#0D0407',
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  messageCard: {
    backgroundColor: '#120408',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
  },
  messageTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 8,
  },
  messageText: {
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 21,
    marginBottom: 8,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  linkText: {
    color: '#FFFFFF',
  },
  linkAction: {
    color: '#C9A84C',
    fontWeight: '800',
  },
});
