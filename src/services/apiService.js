/**
 * Backend Cloud Functions API Client
 * Connects React frontend to Cloud Functions (or functions/localServer.js on Spark).
 */
import { auth } from '../config/firebase';

const defaultDevUrl = import.meta.env.DEV ? 'http://localhost:5001/api' : '';
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || defaultDevUrl;

export const isBackendConfigured = Boolean(
  rawBaseUrl &&
    !rawBaseUrl.includes('your-app-id') &&
    (rawBaseUrl.startsWith('http://') || rawBaseUrl.startsWith('https://'))
);

export function getApiBaseUrl() {
  return rawBaseUrl.replace(/\/+$/, '');
}

async function requestBackend(endpoint, { method = 'POST', body = null, requireAuth = true } = {}) {
  if (!isBackendConfigured) {
    const err = new Error(
      'Backend API URL (VITE_API_BASE_URL) is not configured. Start local backend (`node functions/localServer.js`) and set VITE_API_BASE_URL=http://localhost:5001/api.'
    );
    err.code = 'BACKEND_NOT_CONFIGURED';
    throw err;
  }

  const headers = { 'Content-Type': 'application/json' };
  if (requireAuth) {
    const currentUser = auth?.currentUser;
    if (!currentUser) {
      throw new Error('Please sign in with your account first.');
    }
    let token = '';
    try {
      token = await currentUser.getIdToken(true);
    } catch {
      token = await currentUser.getIdToken();
    }
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${getApiBaseUrl()}/${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      const err = new Error(data.error || `Backend HTTP ${res.status}`);
      err.code = data.code || `HTTP_${res.status}`;
      err.errorDetails = data.errorDetails || null;
      throw err;
    }
    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      const netErr = new Error(
        'Unable to reach InstaFlow backend server. Please verify that the local backend is running on port 5001 (`node functions/localServer.js`).'
      );
      netErr.code = 'BACKEND_CONNECTION_FAILED';
      throw netErr;
    }
    throw err;
  }
}

export function getBackendHealth() {
  return requestBackend('apiHealth', { method: 'GET', requireAuth: false });
}

export function exchangeMetaOAuthCode(code, redirectUri, refInfo = {}) {
  return requestBackend('exchangeMetaCode', {
    body: {
      code,
      redirectUri,
      referenceUsername: refInfo?.referenceUsername,
      selectedAccountType: refInfo?.selectedAccountType,
      displayName: refInfo?.displayName,
      bio: refInfo?.bio,
      followers: refInfo?.followers,
      mediaCount: refInfo?.mediaCount,
    },
  });
}

export function convertAccountToProfessionalRemote(payload) {
  return requestBackend('convertToProfessional', {
    body: payload,
  });
}

export function disconnectAccountRemote(igUserId) {
  return requestBackend('disconnectInstagramAccount', {
    body: { igUserId },
  });
}

export function publishMediaRemote(payload) {
  return requestBackend('publishInstagramMedia', {
    body: payload,
  });
}

export function processScheduledMediaRemote(payload = {}) {
  return requestBackend('processScheduledMedia', {
    body: payload,
  });
}

export function retryPublishMediaRemote(payload) {
  return requestBackend('retryPublishMedia', {
    body: payload,
  });
}

export function validateScheduleRemote(payload) {
  return requestBackend('validateSchedule', {
    body: payload,
    requireAuth: false,
  });
}

export function saveTestVaultTokenRemote(payload) {
  return requestBackend('saveTestVaultToken', {
    body: payload,
  });
}

export function generateAiStudioRemote(payload) {
  return requestBackend('aiGenerateContent', {
    body: payload,
  });
}

export function askAiAssistantRemote(payload) {
  return requestBackend('aiChatAssistant', {
    body: payload,
  });
}

