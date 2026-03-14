import { create } from "zustand";
import type { User, VoiceOption } from "@/types";

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  selectedVoice: VoiceOption | null;
  setSelectedVoice: (voice: VoiceOption | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  selectedVoice: null,
  setSelectedVoice: (voice) => set({ selectedVoice: voice }),
}));
