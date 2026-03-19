import type { ScriptLine, VoiceMode } from "@/types";

export interface EventVoiceConfig {
  voice_id: string | null;
  secondary_voice_id: string | null;
  voice_mode: VoiceMode;
}

const DEFAULT_VOICE = "zh_female_vv_uranus_bigtts";

export function resolveVoiceForLine(
  lines: Array<Pick<ScriptLine, "id" | "speaker" | "sort_order">>,
  lineId: string,
  config: EventVoiceConfig
): string {
  const primaryVoice = config.voice_id || DEFAULT_VOICE;

  if (config.voice_mode !== "dual_alternate" || !config.secondary_voice_id) {
    return primaryVoice;
  }

  const targetLine = lines.find((line) => line.id === lineId);
  if (!targetLine || targetLine.speaker !== "host") {
    return primaryVoice;
  }

  const hostLines = [...lines]
    .filter((line) => line.speaker === "host")
    .sort((a, b) => a.sort_order - b.sort_order);

  const hostIndex = hostLines.findIndex((line) => line.id === lineId);
  if (hostIndex < 0) {
    return primaryVoice;
  }

  return hostIndex % 2 === 0 ? primaryVoice : config.secondary_voice_id;
}
