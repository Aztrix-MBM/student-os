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
      headers: { 'Accept': 'application/json' },
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
}): Promise<ApiSubject | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function deleteSubject(subjectId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/subjects/${subjectId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchExams(subjectId?: string): Promise<ApiExam[]> {
  try {
    const url = subjectId
      ? `${API_BASE_URL}/api/exams?subject_id=${encodeURIComponent(subjectId)}`
      : `${API_BASE_URL}/api/exams`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
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
}): Promise<ApiExam | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/exams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
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
      headers: { 'Accept': 'application/json' },
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
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
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
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
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
): Promise<{ ok: boolean; data?: SyllabusDraftResponse; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/syllabus/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ text, subject_id }),
    });
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json.detail || 'Failed to extract syllabus.' };
    }
    return { ok: true, data: json };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error during syllabus extraction.' };
  }
}

export async function uploadSyllabusPdf(
  file: File,
  subject_id?: string
): Promise<{ ok: boolean; data?: SyllabusDraftResponse; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (subject_id) {
      formData.append('subject_id', subject_id);
    }

    const res = await fetch(`${API_BASE_URL}/api/syllabus/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json.detail || 'Failed to upload syllabus PDF.' };
    }
    return { ok: true, data: json };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error during PDF upload.' };
  }
}

export async function confirmSyllabus(
  subject_id: string,
  units: SyllabusUnitDraft[],
  exam_id?: string
): Promise<{ ok: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/syllabus/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ subject_id, units, exam_id }),
    });
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json.detail || 'Failed to save confirmed syllabus.' };
    }
    return { ok: true, data: json };
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
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
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
      headers: { 'Accept': 'application/json' },
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
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
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
      headers: { 'Accept': 'application/json' },
      credentials: 'include',
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
