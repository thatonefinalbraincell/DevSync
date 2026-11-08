import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rchpdxilatsenwulupom.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_key_placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UserSession {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  isGuest?: boolean;
}

export const getSavedUser = (): UserSession => {
  if (typeof window === "undefined") {
    return { id: "user-default", name: "Guest Developer", isGuest: true };
  }

  const stored = localStorage.getItem("collabcode_user");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (_) {}
  }

  // Default guest user
  const guestNames = ["Arjun", "Malavika", "Sreehari", "Ananya", "Rahul", "Priya"];
  const randomName = guestNames[Math.floor(Math.random() * guestNames.length)];
  const defaultUser: UserSession = {
    id: `guest-${Math.random().toString(36).substring(2, 8)}`,
    name: randomName,
    isGuest: true,
  };
  localStorage.setItem("collabcode_user", JSON.stringify(defaultUser));
  return defaultUser;
};

export const saveUser = (user: UserSession) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("collabcode_user", JSON.stringify(user));
  }
};
