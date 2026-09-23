import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:4000/api';
const TOKEN_KEY = 'feedants_auth_token';

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token) {
  return AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken() {
  return AsyncStorage.removeItem(TOKEN_KEY);
}

/**
 * Thin fetch wrapper: attaches the bearer token when present, normalizes
 * error responses into a thrown Error with the server's message so screens
 * can show something meaningful instead of a generic failure.
 */
export async function apiRequest(path, { method = 'GET', body, timeoutMs = 10000 } = {}) {
  const token = await getToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const message = json?.error?.message || `Request failed (${res.status})`;
      const error = new Error(message);
      error.statusCode = res.status;
      throw error;
    }

    return json?.data;
  } finally {
    clearTimeout(timeout);
  }
}
