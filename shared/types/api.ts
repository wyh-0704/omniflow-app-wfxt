// Shared API types — single source of truth for frontend ↔ backend contracts.
// Define ALL API request/response interfaces here and import them in both
// backend routes and frontend services.

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export type TaskPriority = 'high' | 'medium' | 'low';

export interface ScheduleTaskInput {
  id: string;
  title: string;
  priority: TaskPriority;
  duration: number;
}

export interface ScheduleBusySlot {
  label: string;
  start: string;
  end: string;
}

export interface ScheduleRequest {
  date: string;
  tasks: ScheduleTaskInput[];
  busy: ScheduleBusySlot[];
  peakWindows: string[];
  density: 'relaxed' | 'moderate' | 'compact';
}

export interface ScheduleItem {
  id: string;
  start: string;
  reason: string;
}

export interface ScheduleResponse {
  items: ScheduleItem[];
}

export interface AuthUser {
  username: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface RegisterRequest {
  username: string;
  password: string;
  confirmPassword: string;
}
