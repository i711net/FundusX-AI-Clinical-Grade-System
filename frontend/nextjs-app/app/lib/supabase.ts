import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl || "https://example.supabase.co", supabaseAnonKey || "demo-key");

export type FundusImage = {
  id: string;
  image_url: string;
  storage_key: string | null;
  image_code: string | null;
  image_type: "quiz" | "upload" | "validation" | "paper";
  title: string | null;
  diagnosis_label: string | null;
  disease_grade: number | null;
  is_active: boolean;
  created_at: string;
};

export type Quiz = {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

export type AiReport = {
  id: string;
  fundus_image_id: string | null;
  image_url: string | null;
  diagnosis: string;
  confidence: number | null;
  lesions: Array<{ label: string; confidence: number; bbox?: number[]; demo_mode?: boolean }> | null;
  heatmap_url: string | null;
  detection_url: string | null;
  risk_level: string | null;
  recommendation: string | null;
  created_at: string;
};

export type SubscriptionAccount = {
  id: string;
  username: string;
  label: string;
  expires_at: string;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
  active_session_id: string | null;
  active_session_started_at: string | null;
  last_used_at: string | null;
  created_at: string;
};
