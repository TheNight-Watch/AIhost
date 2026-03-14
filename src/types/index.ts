export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  preview_url?: string;
  locale: string;
}

export interface Script {
  id: string;
  user_id: string;
  title: string;
  content: string;
  voice_id: string;
  created_at: string;
  updated_at: string;
}

export interface UploadedFile {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  created_at: string;
}

export type Locale = "zh" | "en";

export type EventStatus = "draft" | "ready" | "live" | "completed";

export interface Event {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: EventStatus;
  voice_id: string | null;
  created_at: string;
  updated_at: string;
  script_lines_count?: number;
}

export interface ScriptLine {
  id: string;
  event_id: string;
  sort_order: number;
  speaker: string;
  content: string;
  audio_url: string | null;
  duration_ms: number | null;
  created_at: string;
  updated_at: string;
}
