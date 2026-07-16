import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { createPasswordResetRedirectUrl, extractAuthLinkParams } from '../lib/authRedirect';
import { signOutUser } from '../lib/signOutUser';
import { supabase } from '../lib/supabase';

type ResetState = 'preparing' | 'ready' | 'saving' | 'success' | 'error';

async function createRecoverySession(url: string | null) {
  const params = extractAuthLinkParams(url);

  if (params.errorDescription) {
    throw new Error(params.errorDescription);
  }

  if (params.accessToken && params.refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: params.accessToken,
      refresh_token: params.refreshToken,
    });

    if (error) {
      throw error;
    }

    return;
  }

  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);

    if (error) {
      throw error;
    }

    return;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Please open the reset link from your email again.');
  }
}

export default function ResetPasswordScreen() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isDesktop = Platform.OS === 'web' && width >= 980;
  const incomingUrl = Linking.useLinkingURL();
  const expectedResetUrl = useMemo(() => createPasswordResetRedirectUrl(), []);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [state, setState] = useState<ResetState>('preparing');
  const [message, setMessage] = useState('Preparing your password reset...');
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const prepareReset = async () => {
      const urlToProcess = incomingUrl || (await Linking.getInitialURL());

      if (!urlToProcess || urlToProcess === processedUrl) {
        return;
      }

      setProcessedUrl(urlToProcess);
      setState('preparing');
      setMessage('Preparing your password reset...');

      try {
        await createRecoverySession(urlToProcess);

        if (!active) {
          return;
        }

        setState('ready');
        setMessage('Choose your new password below.');
      } catch (error: any) {
        if (!active) {
          return;
        }

        setState('error');
        setMessage(error?.message || 'We could not open your password reset link.');
      }
    };

    prepareReset();

    return () => {
      active = false;
    };
  }, [incomingUrl, processedUrl]);

  const handleSavePassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Missing password', 'Please enter your new password in both fields.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Password too short', 'Please use at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please make sure both passwords match.');
      return;
    }

    setState('saving');

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setState('ready');
      Alert.alert('Could not save password', error.message);
      return;
    }

    setState('success');
    setMessage('Your password has been updated. You can now sign in with your new password.');
  };

  const handleBackToLogin = async () => {
    await signOutUser();
    router.replace('/login');
  };

  const form = (
    <KeyboardAvoidingView
      style={styles.formWrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.formCard, isDesktop ? styles.formCardDesktop : null]}>
        <Text style={styles.heading}>Choose New Password</Text>
        <Text style={styles.subheading}>{message}</Text>

        {state === 'preparing' ? (
          <View style={styles.messageCard}>
            <ActivityIndicator color="#C9A84C" />
          </View>
        ) : null}

        {state === 'error' ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageTitle}>Reset link needed</Text>
            <Text style={styles.messageText}>
              Open the password reset email on this device and tap the reset button again. Keep the app running while you do it.
            </Text>
            <Text style={styles.technicalHint}>Expected app link: {expectedResetUrl}</Text>
          </View>
        ) : null}

        {state === 'ready' || state === 'saving' ? (
          <>
            <TextInput
              placeholder="New password"
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={state !== 'saving'}
              style={styles.input}
            />

            <TextInput
              placeholder="Confirm new password"
              placeholderTextColor="#888"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={state !== 'saving'}
              style={styles.input}
            />

            <TouchableOpacity
              onPress={handleSavePassword}
              disabled={state === 'saving'}
              style={[styles.primaryButton, state === 'saving' ? styles.buttonDisabled : null]}
            >
              {state === 'saving' ? (
                <ActivityIndicator color="#0D0407" />
              ) : (
                <Text style={styles.primaryButtonText}>Save New Password</Text>
              )}
            </TouchableOpacity>
          </>
        ) : null}

        {state === 'success' ? (
          <TouchableOpacity onPress={handleBackToLogin} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Back to Login</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );

  if (isWeb) {
    return (
      <PublicWebFrame
        activeRoute="/login"
        eyebrow="Account Recovery"
        title="Choose a new password and return to your account"
        description="Finish account recovery here, then sign back in to the same tours, plans, and permissions."
        asideTitle="Before you continue"
        asideText="This password change applies to the same account you already use across the platform."
        asideItems={[
          'Open the reset link from your email on this device',
          'Choose a password with at least 8 characters',
          'Sign back in to the same tours, plans, and account tools',
        ]}
      >
        <View style={isDesktop ? styles.desktopSection : styles.webSection}>
          {isDesktop ? (
            <View style={styles.desktopInfo}>
              <Text style={styles.desktopInfoLabel}>Final Step</Text>
              <Text style={styles.desktopInfoTitle}>Finish recovery and get back into your tours</Text>
              <Text style={styles.desktopInfoText}>
                Set your new password here, then continue with the same account across web, iPhone, and Android.
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
  messageCard: {
    backgroundColor: '#120408',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    alignItems: 'flex-start',
  },
  messageTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 8,
  },
  messageText: {
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 21,
    marginBottom: 10,
  },
  technicalHint: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#120408',
    color: '#FFFFFF',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#C9A84C',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#0D0407',
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
