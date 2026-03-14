import { create } from "zustand";
import type { Event, ScriptLine } from "@/types";

interface EventState {
  // Current event being created/edited
  currentEvent: Event | null;
  setCurrentEvent: (event: Event | null) => void;

  // Script lines for current event
  scriptLines: ScriptLine[];
  setScriptLines: (lines: ScriptLine[]) => void;

  // Events list for dashboard
  events: Event[];
  setEvents: (events: Event[]) => void;

  // Loading states
  isLoadingEvents: boolean;
  setIsLoadingEvents: (loading: boolean) => void;

  isGeneratingScript: boolean;
  setIsGeneratingScript: (loading: boolean) => void;

  // Upload progress
  uploadProgress: number;
  setUploadProgress: (progress: number) => void;

  // Agenda data (text or image base64)
  agendaText: string;
  setAgendaText: (text: string) => void;

  agendaImageBase64: string | null;
  setAgendaImageBase64: (base64: string | null) => void;

  // Reset upload state
  resetUploadState: () => void;
}

export const useEventStore = create<EventState>((set) => ({
  currentEvent: null,
  setCurrentEvent: (event) => set({ currentEvent: event }),

  scriptLines: [],
  setScriptLines: (lines) => set({ scriptLines: lines }),

  events: [],
  setEvents: (events) => set({ events }),

  isLoadingEvents: false,
  setIsLoadingEvents: (loading) => set({ isLoadingEvents: loading }),

  isGeneratingScript: false,
  setIsGeneratingScript: (loading) => set({ isGeneratingScript: loading }),

  uploadProgress: 0,
  setUploadProgress: (progress) => set({ uploadProgress: progress }),

  agendaText: "",
  setAgendaText: (text) => set({ agendaText: text }),

  agendaImageBase64: null,
  setAgendaImageBase64: (base64) => set({ agendaImageBase64: base64 }),

  resetUploadState: () =>
    set({
      currentEvent: null,
      scriptLines: [],
      agendaText: "",
      agendaImageBase64: null,
      uploadProgress: 0,
      isGeneratingScript: false,
    }),
}));
