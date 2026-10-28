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
  is_pro?: boolean;
  pro_until?: string | null;
  created_at: string;
  updated_at: string;
}

export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Helper to build auth headers.
 * Attaches Authorization: Bearer <token> if student_os_jwt is saved in localStorage.
 * Complements httpOnly cookie authentication for environments where cookies are restricted,
 * blocked by browsers, or lost across origins.
 */
export function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extraHeaders };
  const token = localStorage.getItem('student_os_jwt');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

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
 * Register a new user and receive httpOnly JWT cookie & token backup.
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

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const errDetail = data?.detail;
      const formattedError = typeof errDetail === 'string'
        ? errDetail
        : Array.isArray(errDetail) && errDetail.length > 0
          ? errDetail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
          : data?.message || data?.error || 'Registration failed.';
      return { ok: false, error: formattedError };
    }

    if (data?.token) {
      localStorage.setItem('student_os_jwt', data.token);
    }

    return { ok: true, user: data?.user };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error during registration.' };
  }
}

/**
 * Login user via email & password and receive httpOnly JWT cookie & token backup.
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

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const errDetail = data?.detail;
      const formattedError = typeof errDetail === 'string'
        ? errDetail
        : Array.isArray(errDetail) && errDetail.length > 0
          ? errDetail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
          : data?.message || data?.error || 'Invalid email or password.';
      return { ok: false, error: formattedError };
    }

    if (data?.token) {
      localStorage.setItem('student_os_jwt', data.token);
    }

    return { ok: true, user: data?.user };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error during login.' };
  }
}

/**
 * Fetch authenticated user details from /api/me using httpOnly cookie + bearer token fallback.
 */
export async function getMe(): Promise<UserAuthResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/me`, {
      method: 'GET',
      headers: getAuthHeaders({
        'Accept': 'application/json',
      }),
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
 * Logout user, clear httpOnly cookie and localStorage JWT, and wipe CacheStorage & push subscription for shared lab PCs.
 */
export async function logoutUser(): Promise<boolean> {
  try {
    localStorage.removeItem('student_os_jwt');
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
  } catch (err) {
    console.warn("Backend logout request failed:", err);
  } finally {
    localStorage.removeItem('student_os_jwt');
    // 1. Wipe all Cache Storage entries to avoid data leakage on shared computers
    if ('caches' in window) {
      try {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      } catch (cacheErr) {
        console.warn("Cache cleanup failed on logout:", cacheErr);
      }
    }

    // 2. Unsubscribe Web Push notifications
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg.pushManager) {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            await sub.unsubscribe();
          }
        }
      } catch (pushErr) {
        console.warn("Push unsubscribe failed on logout:", pushErr);
      }
    }
  }
  return true;
}

// ---------------------- PHASE 3 ACADEMIC CORE API CLIENT ----------------------

export interface ApiSubject {
  id: string;
  user_id: string;
  name: string;
  code: string;
  semester?: string;
  color_theme: string;
  created_at: string;
  updated_at: string;
  units_count: number;
  topics_count: number;
  exams_count: number;
}

export interface ApiExam {
  id: string;
  user_id: string;
  subject_id: string;
  subject_name?: string;
  title: string;
  exam_date: string;
  total_marks: number;
  type: string;
  created_at: string;
  updated_at: string;
  topic_ids?: string[];
  topics_count?: number;
}

export interface ApiTask {
  id: string;
  user_id: string;
  subject_id?: string;
  subject_name?: string;
  title: string;
  priority: number;
  status: string;
  due_date?: string;
  estimated_minutes: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export async function fetchSubjects(): Promise<ApiSubject[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/subjects`, {
      method: 'GET',
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
      credentials: 'include',
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function createSubject(data: {
  name: string;
  code: string;
  semester?: string;
  color_theme?: string;
}): Promise<{ ok: boolean; data?: ApiSubject; error?: string; status?: number }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/subjects`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json.detail || 'Failed to create subject', status: res.status };
    }
    return { ok: true, data: json, status: res.status };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error while creating subject', status: 500 };
  }
}

export async function deleteSubject(subjectId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/subjects/${subjectId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface ApiUnitDetail {
  id: string;
  subject_id: string;
  name: string;
  order_no: number;
  exam_weight: number;
  topics: ApiTopicDetail[];
}

export interface ApiTopicDetail {
  id: string;
  unit_id: string;
  name: string;
  importance: number;
  difficulty: number;
  order_no: number;
}

export interface ApiSubjectDetail extends ApiSubject {
  units: ApiUnitDetail[];
  topics: ApiTopicDetail[];
}

export async function fetchSubjectDetails(subjectId: string): Promise<ApiSubjectDetail | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/subjects/${subjectId}`, {
      method: 'GET',
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
      credentials: 'include',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchExams(subjectId?: string): Promise<ApiExam[]> {
  try {
    const url = subjectId
      ? `${API_BASE_URL}/api/exams?subject_id=${encodeURIComponent(subjectId)}`
      : `${API_BASE_URL}/api/exams`;
    const res = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
      credentials: 'include',
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function createExam(data: {
  subject_id: string;
  title: string;
  exam_date: string;
  total_marks?: number;
  type?: string;
  topic_ids?: string[];
  unit_ids?: string[];
}): Promise<ApiExam | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/exams`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function updateUserProfile(data: {
  name?: string;
  daily_study_minutes?: number;
}): Promise<UserAuthResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/me`, {
      method: 'PATCH',
      headers: getAuthHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function deleteExam(examId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/exams/${examId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchTasks(filters?: { status?: string; subject_id?: string }): Promise<ApiTask[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.subject_id) params.append('subject_id', filters.subject_id);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(`${API_BASE_URL}/api/tasks${qs}`, {
      method: 'GET',
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
      credentials: 'include',
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function createTask(data: {
  title: string;
  subject_id?: string;
  priority?: number;
  status?: string;
  due_date?: string;
  estimated_minutes?: number;
}): Promise<ApiTask | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function updateTask(taskId: string, updates: Partial<ApiTask>): Promise<ApiTask | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: getAuthHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function deleteTask(taskId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------- PHASE 5 SYLLABUS AI API CLIENT ----------------------

export interface SyllabusTopicDraft {
  name: string;
  importance: number;
  difficulty: number;
  order_no: number;
}

export interface SyllabusUnitDraft {
  name: string;
  order_no: number;
  exam_weight: number;
  topics: SyllabusTopicDraft[];
}

export interface SyllabusDraftResponse {
  subject_id?: string;
  units: SyllabusUnitDraft[];
  raw_text_hash: string;
  cached: boolean;
  token_count?: number;
  message?: string;
}

export interface SyllabusLimits {
  limit: number;
  used_today: number;
  remaining_today: number;
}

export async function getSyllabusLimits(): Promise<SyllabusLimits | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/syllabus/limits`, {
      method: 'GET',
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
      credentials: 'include',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function extractSyllabusText(
  text: string,
  subject_id?: string
): Promise<{ ok: boolean; data?: SyllabusDraftResponse; error?: string; status?: number }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/syllabus/extract`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ text, subject_id }),
    });
    const json = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        return {
          ok: false,
          error: 'Your session has expired. Please log in again to extract syllabus units.',
          status: 401,
        };
      }
      return { ok: false, error: json.detail || 'Failed to extract syllabus.', status: res.status };
    }
    return { ok: true, data: json, status: res.status };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error during syllabus extraction.' };
  }
}

export async function uploadSyllabusPdf(
  file: File,
  subject_id?: string
): Promise<{ ok: boolean; data?: SyllabusDraftResponse; error?: string; status?: number }> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (subject_id) {
      formData.append('subject_id', subject_id);
    }

    const res = await fetch(`${API_BASE_URL}/api/syllabus/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        return {
          ok: false,
          error: 'Your session has expired. Please log in again to upload syllabus.',
          status: 401,
        };
      }
      return { ok: false, error: json.detail || 'Failed to upload syllabus PDF.', status: res.status };
    }
    return { ok: true, data: json, status: res.status };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error during PDF upload.' };
  }
}

export async function confirmSyllabus(
  subject_id: string,
  units: SyllabusUnitDraft[],
  exam_id?: string
): Promise<{ ok: boolean; data?: any; error?: string; status?: number }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/syllabus/confirm`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ subject_id, units, exam_id }),
    });
    const json = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        return {
          ok: false,
          error: 'Your session has expired. Please log in again to save syllabus.',
          status: 401,
        };
      }
      return { ok: false, error: json.detail || 'Failed to save confirmed syllabus.', status: res.status };
    }
    return { ok: true, data: json, status: res.status };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error during syllabus confirmation.' };
  }
}

// ---------------------- PHASE 6 LEARNING LOOP API CLIENT ----------------------

export interface ApiTopicReview {
  id: string;
  topic_id: string;
  user_id: string;
  reviewed_at: string;
  rating: string;
  self_level?: string;
  quiz_score?: number;
  stability_days: number;
  retention_estimate: number;
}

export interface ApiExamReadinessTopic {
  id: string;
  name: string;
  importance: number;
  mastery: number;
  retention: number;
  effective_score: number;
  latest_rating?: string;
  self_level?: string;
  days_since_review?: number;
  is_weak: boolean;
}

export interface ApiExamReadiness {
  exam_id: string;
  exam_title: string;
  subject_id: string;
  subject_name: string;
  exam_date: string;
  days_to_exam: number;
  readiness_pct: number;
  coverage_pct: number;
  total_topics: number;
  reviewed_topics: number;
  weak_topics: ApiExamReadinessTopic[];
  strong_topics: ApiExamReadinessTopic[];
  all_topics: ApiExamReadinessTopic[];
  label: string;
}

export interface ApiStudySession {
  id: string;
  user_id: string;
  subject_id?: string;
  topic_id?: string;
  duration_minutes: number;
  started_at: string;
  created_at: string;
}

export async function submitTopicReview(
  topicId: string,
  rating: 'easy' | 'good' | 'hard' | 'fail',
  selfLevel?: 'strong' | 'okay' | 'weak',
  quizScore?: number
): Promise<ApiTopicReview | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/topics/${topicId}/review`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({
        rating,
        self_level: selfLevel,
        quiz_score: quizScore,
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchExamReadiness(examId: string): Promise<ApiExamReadiness | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/exams/${examId}/readiness`, {
      method: 'GET',
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
      credentials: 'include',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function logStudySession(
  durationMinutes: number,
  topicId?: string,
  subjectId?: string
): Promise<ApiStudySession | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/study-sessions`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({
        duration_minutes: durationMinutes,
        topic_id: topicId,
        subject_id: subjectId,
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchStudySessions(limit: number = 20): Promise<ApiStudySession[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/study-sessions?limit=${limit}`, {
      method: 'GET',
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
      credentials: 'include',
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// ---------------------- PHASE 7 TODAY STUDY PLANNER API CLIENT ----------------------

export interface ApiReasonItem {
  label: string;
  value: string;
}

export interface ApiPlanItem {
  id: string;
  title: string;
  type: 'task' | 'topic';
  minutes: number;
  score: number;
  reasons: ApiReasonItem[];
  subject_id?: string;
  subject_name?: string;
  completed?: boolean;
  recommendation_id?: string;
}

export interface ApiWorkloadSummary {
  status: 'comfortable' | 'busy' | 'overloaded';
  load_ratio: number;
  required_minutes: number;
  available_minutes: number;
  planned_minutes?: number;
  backlog_minutes?: number;
  message: string;
}

export interface ApiUpcomingExam {
  id: string;
  title: string;
  subject_name: string;
  exam_date: string;
  days_to_exam: number;
  type: string;
}

export interface ApiTodayPlan {
  next_best_action?: ApiPlanItem;
  plan: ApiPlanItem[];
  deferred: ApiPlanItem[];
  workload: ApiWorkloadSummary;
  upcoming_exams: ApiUpcomingExam[];
  student_daily_minutes: number;
  date: string;
  candidate_count: number;
}

export async function fetchTodayPlan(): Promise<ApiTodayPlan | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/today`, {
      method: 'GET',
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
      credentials: 'include',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function acceptRecommendation(recId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/recommendations/${recId}/accept`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function dismissRecommendation(recId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/recommendations/${recId}/dismiss`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function togglePlanItem(itemId: string, completed: boolean): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/today/toggle-item`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ item_id: itemId, completed }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------- PHASE 8 RETENTION & NOTIFICATIONS API CLIENT ----------------------

export interface ApiStreak {
  current_streak: number;
  longest_streak: number;
  total_active_days: number;
  is_active_today: boolean;
  grace_days_used: number;
  grace_days_remaining: number;
  status: 'active' | 'at_risk' | 'grace_applied' | 'broken';
  message: string;
  activity_calendar: string[];
}

export interface ApiNotificationPreferences {
  morning_plan_enabled: boolean;
  morning_plan_time: string;
  revision_due_alerts: boolean;
  exam_countdown_alerts: boolean;
  telegram_chat_id?: string;
  has_push_subscription: boolean;
}

export async function fetchStreak(): Promise<ApiStreak | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/retention/streak`, {
      method: 'GET',
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
      credentials: 'include',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchNotificationPreferences(): Promise<ApiNotificationPreferences | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications/preferences`, {
      method: 'GET',
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
      credentials: 'include',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function updateNotificationPreferences(
  updates: Partial<ApiNotificationPreferences>
): Promise<ApiNotificationPreferences | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications/preferences`, {
      method: 'PATCH',
      headers: getAuthHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function subscribePush(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications/subscribe`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(sub),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function unsubscribePush(endpoint: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications/unsubscribe?endpoint=${encodeURIComponent(endpoint)}`, {
      method: 'DELETE',
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchMorningDigest(): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications/morning-digest`, {
      method: 'GET',
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
      credentials: 'include',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function testSendNotification(): Promise<{ ok: boolean; message: string; payload?: any }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications/test-send`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
      credentials: 'include',
    });
    if (!res.ok) return { ok: false, message: 'Failed to trigger test notification.' };
    return await res.json();
  } catch (err: any) {
    return { ok: false, message: err.message || 'Network error triggering test notification.' };
  }
}

/**
 * Permanently delete student account and wipe all academic records (DPDP Act 2023).
 */
export async function deleteAccount(): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'DELETE',
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, message: err.detail || 'Failed to delete account.' };
    }
    const data = await res.json();
    return { ok: true, message: data.message || 'Account successfully deleted.' };
  } catch (err: any) {
    return { ok: false, message: err.message || 'Network error deleting account.' };
  }
}

// ---------------------- PAYMENTS & PRO PASS API CLIENT ----------------------

export interface PlanInfo {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  duration_label: string;
  features: string[];
}

export interface PaymentConfig {
  configured: boolean;
  upi_id: string;
  payee_name: string;
  plans: PlanInfo[];
}

export interface PaymentRecord {
  id: string;
  user_id?: string | null;
  plan: string;
  amount: number;
  utr: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at?: string | null;
}

export async function getPaymentConfig(): Promise<{ ok: boolean; data?: PaymentConfig; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/payments/config`, {
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
    });
    if (!res.ok) {
      return { ok: false, error: `Failed to load payment config (${res.status})` };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error fetching payment config.' };
  }
}

export async function submitPayment(
  plan: string,
  utr: string
): Promise<{ ok: boolean; data?: PaymentRecord; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/payments`, {
      method: 'POST',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }),
      credentials: 'include',
      body: JSON.stringify({ plan, utr }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: err.detail || `Payment submission failed (${res.status}).` };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error submitting payment.' };
  }
}

export async function getMyPayments(): Promise<{ ok: boolean; data?: PaymentRecord[]; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/payments/my`, {
      headers: getAuthHeaders({ 'Accept': 'application/json' }),
      credentials: 'include',
    });
    if (!res.ok) {
      return { ok: false, error: `Failed to fetch payment history (${res.status})` };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error fetching payments.' };
  }
}


