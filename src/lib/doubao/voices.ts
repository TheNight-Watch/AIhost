export interface VoiceDef {
  voice_type: string;
  name: string;
  name_en: string;
  category: "female" | "male" | "english";
  description: string;
  locale: "zh" | "en";
  use_case: string;
}

export const VOICES: VoiceDef[] = [
  // Chinese Female
  { voice_type: "zh_female_vv_uranus_bigtts", name: "Vivi 2.0", name_en: "Vivi 2.0", category: "female", description: "通用女声", locale: "zh", use_case: "通用" },
  { voice_type: "zh_female_xiaohe_uranus_bigtts", name: "小何 2.0", name_en: "Xiao He 2.0", category: "female", description: "通用女声", locale: "zh", use_case: "通用" },
  { voice_type: "zh_female_qingxinnvsheng_uranus_bigtts", name: "清新女声 2.0", name_en: "Fresh Female 2.0", category: "female", description: "清新自然", locale: "zh", use_case: "通用" },
  { voice_type: "zh_female_cancan_uranus_bigtts", name: "知性灿灿 2.0", name_en: "Intellectual 2.0", category: "female", description: "知性角色扮演", locale: "zh", use_case: "角色扮演" },
  { voice_type: "zh_female_sajiaoxuemei_uranus_bigtts", name: "撒娇学妹 2.0", name_en: "Sweet Xuemei 2.0", category: "female", description: "甜美学妹", locale: "zh", use_case: "角色扮演" },
  { voice_type: "zh_female_tianmeixiaoyuan_uranus_bigtts", name: "甜美小源 2.0", name_en: "Sweet Xiaoyuan 2.0", category: "female", description: "甜美通用", locale: "zh", use_case: "通用" },
  { voice_type: "zh_female_tianmeitaozi_uranus_bigtts", name: "甜美桃子 2.0", name_en: "Sweet Taozi 2.0", category: "female", description: "甜美通用", locale: "zh", use_case: "通用" },
  { voice_type: "zh_female_shuangkuaisisi_uranus_bigtts", name: "爽快思思 2.0", name_en: "Lively Sisi 2.0", category: "female", description: "爽快活泼", locale: "zh", use_case: "通用" },
  { voice_type: "zh_female_peiqi_uranus_bigtts", name: "佩奇猪 2.0", name_en: "Peppa 2.0", category: "female", description: "视频配音", locale: "zh", use_case: "视频配音" },
  { voice_type: "zh_female_linjianvhai_uranus_bigtts", name: "邻家女孩 2.0", name_en: "Girl Next Door 2.0", category: "female", description: "邻家亲切", locale: "zh", use_case: "通用" },
  { voice_type: "zh_female_kefunvsheng_uranus_bigtts", name: "暖阳女声 2.0", name_en: "Warm Female 2.0", category: "female", description: "客服专用", locale: "zh", use_case: "客服" },
  { voice_type: "zh_female_xiaoxue_uranus_bigtts", name: "儿童绘本 2.0", name_en: "Children Story 2.0", category: "female", description: "儿童有声阅读", locale: "zh", use_case: "有声阅读" },
  { voice_type: "zh_female_mizai_uranus_bigtts", name: "黑猫侦探社咪仔 2.0", name_en: "Mizai 2.0", category: "female", description: "视频配音", locale: "zh", use_case: "视频配音" },
  { voice_type: "zh_female_jitangnv_uranus_bigtts", name: "鸡汤女 2.0", name_en: "Motivational 2.0", category: "female", description: "正能量视频", locale: "zh", use_case: "视频配音" },
  { voice_type: "zh_female_meilinvyou_uranus_bigtts", name: "魅力女友 2.0", name_en: "Charming 2.0", category: "female", description: "魅力通用", locale: "zh", use_case: "通用" },
  { voice_type: "zh_female_liuchangnv_uranus_bigtts", name: "流畅女声 2.0", name_en: "Smooth Female 2.0", category: "female", description: "流畅视频配音", locale: "zh", use_case: "视频配音" },
  { voice_type: "zh_female_yingyujiaoxue_uranus_bigtts", name: "Tina老师 2.0", name_en: "Teacher Tina 2.0", category: "female", description: "教育场景", locale: "zh", use_case: "教育" },

  // Chinese Male
  { voice_type: "zh_male_m191_uranus_bigtts", name: "云舟 2.0", name_en: "Yunzhou 2.0", category: "male", description: "通用男声", locale: "zh", use_case: "通用" },
  { voice_type: "zh_male_taocheng_uranus_bigtts", name: "小天 2.0", name_en: "Xiaotian 2.0", category: "male", description: "通用男声", locale: "zh", use_case: "通用" },
  { voice_type: "zh_male_liufei_uranus_bigtts", name: "刘飞 2.0", name_en: "Liu Fei 2.0", category: "male", description: "通用男声", locale: "zh", use_case: "通用" },
  { voice_type: "zh_male_sophie_uranus_bigtts", name: "魅力苏菲 2.0", name_en: "Charming Sophie 2.0", category: "male", description: "魅力通用", locale: "zh", use_case: "通用" },
  { voice_type: "zh_male_shaonianzixin_uranus_bigtts", name: "少年梓辛 2.0", name_en: "Youth Zixin 2.0", category: "male", description: "青少年通用", locale: "zh", use_case: "通用" },
  { voice_type: "zh_male_sunwukong_uranus_bigtts", name: "猴哥 2.0", name_en: "Monkey King 2.0", category: "male", description: "视频配音", locale: "zh", use_case: "视频配音" },
  { voice_type: "zh_male_dayi_uranus_bigtts", name: "大壹 2.0", name_en: "Dayi 2.0", category: "male", description: "视频配音", locale: "zh", use_case: "视频配音" },
  { voice_type: "zh_male_ruyayichen_uranus_bigtts", name: "儒雅逸辰 2.0", name_en: "Elegant Yichen 2.0", category: "male", description: "儒雅视频", locale: "zh", use_case: "视频配音" },

  // English
  { voice_type: "en_male_tim_uranus_bigtts", name: "Tim", name_en: "Tim", category: "english", description: "American English Male", locale: "en", use_case: "通用" },
  { voice_type: "en_female_dacey_uranus_bigtts", name: "Dacey", name_en: "Dacey", category: "english", description: "American English Female", locale: "en", use_case: "通用" },
  { voice_type: "en_female_stokie_uranus_bigtts", name: "Stokie", name_en: "Stokie", category: "english", description: "American English Female", locale: "en", use_case: "通用" },
];

export const DEFAULT_VOICE = VOICES[0];

export function getVoiceByType(voice_type: string): VoiceDef | undefined {
  return VOICES.find((v) => v.voice_type === voice_type);
}
