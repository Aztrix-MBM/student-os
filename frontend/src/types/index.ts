export type ScreenView =
  | 'login'
  | 'signup'
  | 'dashboard'
  | 'subjects'
  | 'tasks'
  | 'readiness'
  | 'syllabus-ai'
  | 'settings'
  | 'mobile-preview'
  | 'prototype'
  | 'landing'
  | 'planner'
  | 'analytics'
  | 'career';

export type Priority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TopicLevel = 'strong' | 'okay' | 'weak' | 'unrated';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  college?: string;
  semester?: string;
  dailyStudyMinutes: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  progress: number;
  completedTopics: number;
  totalTopics: number;
  semester: 'current' | 'previous';
  iconType: 'chip' | 'monitor' | 'network' | 'code' | 'math' | 'book';
  colorTheme: 'amber' | 'sky' | 'coral' | 'lavender' | 'mint';
}

export interface TaskItem {
  id: string;
  title: string;
  subjectName?: string;
  priority: Priority;
  dueDate: string;
  status: TaskStatus;
  estimatedMinutes: number;
}

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  category: string;
  dotColor: 'green' | 'blue' | 'slate' | 'coral';
  completed?: boolean;
}

export interface CalendarEvent {
  id: string;
  day: number;
  title: string;
  type: 'ds' | 'english' | 'cn' | 'nptel' | 'project';
}

export interface TopicItem {
  id: string;
  unitId: string;
  unitName: string;
  name: string;
  importance: number; // 0..1
  difficulty: number; // 1..5
  level: TopicLevel;
  lastReviewedDaysAgo: number;
  stabilityDays: number;
}

export interface CareerPath {
  id: string;
  title: string;
  matchPct: number;
  category: string;
  skills: string[];
  description: string;
}
