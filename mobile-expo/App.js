import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar as RNStatusBar,
  Image
} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

const getManifestIP = () => {
  const hostUri = Constants.expoConfig?.hostUri || '';
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return ip;
  }
  return '192.168.1.35'; // Fallback
};

const DEFAULT_CLIENT_URL = 'http://jewellery.stafftrack.cloud';
const DEFAULT_API_URL = 'http://jewellery.stafftrack.cloud';

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

function MainApp() {
  const clientUrl = DEFAULT_CLIENT_URL;
  const apiUrl = DEFAULT_API_URL;
  const insets = useSafeAreaInsets();
  
  // Auth states
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both Username and Password');
      return;
    }

    setIsLoggingIn(true);
    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder': 'true',
          'bypass-tunnel-reminder': 'true'
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        // Save token
        await AsyncStorage.setItem('token', data.token);
        setToken(data.token);
        
        // Reset login form inputs
        setUsername('');
        setPassword('');
      } else {
        Alert.alert('Login Failed', data.message || 'Please verify credentials.');
      }
    } catch (err) {
      Alert.alert('Network Error', 'Could not connect to the API server. Please check your network connection.');
      console.error(err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      setToken('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleNavigationStateChange = (navState) => {
    // If the webview navigates back to /login (e.g. user clicked logout inside the website)
    if (navState.url.includes('/login')) {
      handleLogout();
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9c642b" />
        <Text style={styles.loadingText}>Loading environment...</Text>
      </View>
    );
  }

  // Inject token and server_url to localStorage when launching the WebView so user is logged in automatically
  const injectedJS = `
    localStorage.setItem('token', '${token}');
    localStorage.setItem('server_url', '${apiUrl}');
    true;
  `;

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <StatusBar style="dark" backgroundColor="#fffdfa" />
      
      {token && clientUrl ? (
        <View style={{ flex: 1 }}>
          <WebView 
            source={{ uri: `${clientUrl.replace(/\/$/, '')}/deal-master` }}
            originWhitelist={['*']}
            mixedContentMode="always"
            allowUniversalAccessFromFileURLs={true}
            allowFileAccess={true}
            injectedJavaScriptBeforeContentLoaded={injectedJS}
            onNavigationStateChange={handleNavigationStateChange}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView error: ', nativeEvent);
              Alert.alert(
                'Connection Error', 
                'Cannot reach the server. Please check if you are connected to the correct Wi-Fi network and if the server is running.',
                [
                  {
                    text: 'Go to Login',
                    onPress: () => handleLogout()
                  }
                ]
              );
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView HTTP error: ', nativeEvent);
              if (nativeEvent.statusCode >= 400) {
                Alert.alert(
                  'HTTP Error', 
                  `Server responded with error status: ${nativeEvent.statusCode}. Redirecting to login.`,
                  [
                    {
                      text: 'OK',
                      onPress: () => handleLogout()
                    }
                  ]
                );
              }
            }}
            style={{ flex: 1 }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            // Allow the in-app Print / Export PDF windows (Day Report & Customer statement)
            // to open in-place instead of being silently blocked by the Android WebView.
            setSupportMultipleWindows={false}
            javaScriptCanOpenWindowsAutomatically={true}
          />
        </View>
      ) : (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView contentContainerStyle={{flexGrow: 1, justifyContent: 'center'}} keyboardShouldPersistTaps="handled">
            <View style={styles.card}>
              <View style={styles.logoContainer}>
                <Image 
                  source={require('./assets/icon.png')} 
                  style={styles.logoImage} 
                />
                <Text style={styles.title}>Girvi Mortgage App</Text>
                <Text style={styles.subtitle}>Store Manager Panel</Text>
              </View>

              <View style={styles.form}>
                {/* Username Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Username / Login ID</Text>
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Enter login ID"
                    placeholderTextColor="#8c7b68"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                  />
                </View>

                {/* Password Input with Eye Icon */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.passwordWrapper}>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Enter password"
                      placeholderTextColor="#8c7b68"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={[styles.input, { flex: 1, borderWidth: 0 }]}
                    />
                    <TouchableOpacity 
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeBtn}
                      activeOpacity={0.6}
                    >
                      <Text style={styles.eyeBtnText}>
                        {showPassword ? 'HIDE' : 'SHOW'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Submit button */}
                <TouchableOpacity 
                  style={styles.btnPrimary} 
                  onPress={handleLogin}
                  disabled={isLoggingIn}
                  activeOpacity={0.8}
                >
                  {isLoggingIn ? (
                    <ActivityIndicator size="small" color="#fffdfa" />
                  ) : (
                    <Text style={styles.btnText}>Sign In</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fbf9f4',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fbf9f4',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#524434',
  },
  card: {
    backgroundColor: '#fffdfa',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#eaddcd',
    shadowColor: '#33281b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
  },
  topSettingsBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 8,
    zIndex: 10,
  },
  settingsCogText: {
    fontSize: 22,
    color: '#8c7b68',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 12,
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 18,
    marginBottom: 12,
  },
  coinOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(156, 100, 43, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(156, 100, 43, 0.2)',
    marginBottom: 12,
  },
  coinText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#9c642b',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1208',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8c7b68',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 4,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#524434',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    width: '100%',
    backgroundColor: '#fbf9f4',
    borderWidth: 1,
    borderColor: '#eaddcd',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1a1208',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fbf9f4',
    borderWidth: 1,
    borderColor: '#eaddcd',
    borderRadius: 14,
    paddingRight: 12,
  },
  eyeBtn: {
    padding: 8,
  },
  eyeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9c642b',
  },
  btnPrimary: {
    width: '100%',
    backgroundColor: '#9c642b',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9c642b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 10,
  },
  btnText: {
    color: '#fffdfa',
    fontSize: 14,
    fontWeight: '700',
  },
  webviewSpinner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 253, 250, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  floatingSettingsBtn: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 253, 250, 0.9)',
    borderWidth: 1,
    borderColor: '#eaddcd',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#33281b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gearText: {
    fontSize: 22,
    color: '#9c642b',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 100,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fffdfa',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#eaddcd',
    shadowColor: '#33281b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1208',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 12,
    color: '#8c7b68',
    lineHeight: 18,
    marginBottom: 20,
  },
  modalForm: {
    width: '100%',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  modalBtnCancel: {
    flex: 1,
    backgroundColor: '#fbf9f4',
    borderWidth: 1,
    borderColor: '#eaddcd',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancelText: {
    color: '#524434',
    fontSize: 14,
    fontWeight: '700',
  },
  logoutAppBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 72, 0.2)',
    backgroundColor: 'rgba(225, 29, 72, 0.05)',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutAppBtnText: {
    color: '#e11d48',
    fontSize: 12,
    fontWeight: '700',
  }
});
