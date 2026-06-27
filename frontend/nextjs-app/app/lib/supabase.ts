import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl || "https://example.supabase.co", supabaseAnonKey || "demo-key");

export type FundusImage = {
  id: string;
  image_url: string;
  storage_key: string | null;
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
  image_url: string | null;
  diagnosis: string;
  confidence: number | null;
  risk_level: string | null;
  recommendation: string | null;
  created_at: string;
};
