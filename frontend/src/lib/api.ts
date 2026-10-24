export interface HealthCheckData {
  status: string;
  app_name: string;
  version: string;
  timestamp: string;
  database: string;
  environment: string;
}

export interface UserAuthResponse {
  id: string;
  name: string;
  email: string;
  daily_study_minutes: number;
  auth_provider: string;
  created_at: string;
  updated_at: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export async function checkBackendHealth(): Promise<{
  ok: boolean;
  data?: HealthCheckData;
  error?: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { ok: false, error: `HTTP error ${response.status}` };
    }

    const data: HealthCheckData = await response.json();
    return { ok: true, data };
  } catch (err: any) {
    return {
      ok: false,
      error: err.name === 'AbortError' ? 'Connection timeout' : err.message || 'Cannot reach API',
    };
  }
}

/**
 * Register a new user and receive httpOnly JWT cookie.
 */
export async function registerUser(
  name: string,
  email: string,
  password: string,
  dailyStudyMinutes: number = 180
): Promise<{ ok: boolean; user?: UserAuthResponse; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Sends & receives httpOnly cookies
      body: JSON.stringify({
        name,
        email,
        password,
        daily_study_minutes: dailyStudyMinutes,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { ok: false, error: data.detail || 'Registration failed.' };
    }

    return { ok: true, user: data.user };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error during registration.' };
  }
}

/**
 * Login user via email & password and receive httpOnly JWT cookie.
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ ok: boolean; user?: UserAuthResponse; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Sends & receives httpOnly cookies
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { ok: false, error: data.detail || 'Invalid email or password.' };
    }

    return { ok: true, user: data.user };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error during login.' };
  }
}

/**
 * Fetch authenticated user details from /api/me using httpOnly cookie.
 */
export async function getMe(): Promise<UserAuthResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/me`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const user: UserAuthResponse = await response.json();
    return user;
  } catch (err) {
    return null;
  }
}

/**
 * Logout user and clear httpOnly cookie.
 */
export async function logoutUser(): Promise<boolean> {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    return true;
  } catch (err) {
    return false;
  }
}
