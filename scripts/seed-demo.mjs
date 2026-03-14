/**
 * seed-demo.mjs
 * Creates demo data for the AIHost hackathon demo.
 * Uses Supabase service role key to bypass RLS.
 *
 * Usage:
 *   node scripts/seed-demo.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xvpwphixonefftqfdyhx.supabase.co';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2cHdwaGl4b25lZmZ0cWZkeWh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM2MzgzNiwiZXhwIjoyMDg4OTM5ODM2fQ._fOlhNSer0sPxSdGTy-ZalKl46aAlTHN49xuLETSyGo';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Demo event metadata
// ---------------------------------------------------------------------------
const DEMO_EVENT_TITLE = 'OpenClaw Meetup — 探索Agent文明的可能性';
const DEMO_VOICE_ID = 'zh_female_vv_uranus_bigtts';
const DEMO_USER_EMAIL = 'demo@aihost.app';

// ---------------------------------------------------------------------------
// Script lines extracted from the real OpenClaw Meetup host script
// ---------------------------------------------------------------------------
const SCRIPT_LINES = [
  {
    sort_order: 1,
    speaker: '主持人',
    label: '入场提醒',
    content:
      '各位参与者，我们的活动即将开始，请大家快速入座。请将您的手机设置为静音模式，谢谢！',
  },
  {
    sort_order: 2,
    speaker: '主持人',
    label: '开场白',
    content:
      '各位嘉宾、开发者、同学们，上午好！欢迎来到OpenClaw Meetup —— 探索Agent文明的可能性活动现场。很高兴在这里与各位热爱AI、深耕Agent领域的伙伴们相聚，一同解锁智能体的无限潜能，探索Agent世界的全新可能。',
  },
  {
    sort_order: 3,
    speaker: '主持人',
    label: '致谢主办与赞助方',
    content:
      '本次活动由清华大学学生创业协会、手工川、clawborn.live联合主办，中关村科学城・东升科技园、WayToAGl联办；特别感谢阿里云、AWS、百度智能云、阶跃星辰、Kimi、MiniMax、七牛云、腾讯云、ZenMux、智谱作为赞助方的鼎力相助！',
  },
  {
    sort_order: 4,
    speaker: '主持人',
    label: '主持人自我介绍',
    content:
      '我是本次活动的主持人，清华创协主席张铮。此刻，我们正式开启这场属于Agent领域的交流盛宴。',
  },
  {
    sort_order: 5,
    speaker: '主持人',
    label: '有请嘉宾 · 赵媛',
    content:
      '下面，有请中关村东升科技园创新项目负责人赵媛女士，带来主题分享，掌声欢迎！',
  },
  {
    sort_order: 6,
    speaker: '主持人',
    label: '有请嘉宾 · 手工川',
    content:
      '感谢！接下来，有请本次活动发起人、Lovstudio.ai创始人手工川先生上台分享，掌声有请！',
  },
  {
    sort_order: 7,
    speaker: '主持人',
    label: '第一版块 · 趋势与洞察',
    content:
      '接下来，我们正式进入今天的第一版块——「趋势与洞察」。首先，有请天际资本董事总经理江志桐先生上台分享，掌声欢迎！',
  },
  {
    sort_order: 8,
    speaker: '主持人',
    label: '有请嘉宾 · 苏嘉奕',
    content:
      '感谢江先生！接下来，有请MiniMax生态合作负责人苏嘉奕先生上台分享，掌声有请！',
  },
  {
    sort_order: 9,
    speaker: '主持人',
    label: '有请嘉宾 · 黄力昂',
    content:
      '感谢苏嘉奕先生！下面，有请共绩科技联合创始人黄力昂先生上台分享，掌声欢迎！',
  },
  {
    sort_order: 10,
    speaker: '主持人',
    label: '有请嘉宾 · 熊楚伊',
    content:
      '感谢手工川先生！下面，有请Veryloving.ai创始人熊楚伊女士分享，掌声欢迎！',
  },
  {
    sort_order: 11,
    speaker: '主持人',
    label: '有请嘉宾 · 郎瀚威（连线）',
    content:
      '感谢熊楚伊女士！接下来，我们将连线知名博主、硅谷AI行业分析师郎瀚威先生，请看大屏幕！',
  },
  {
    sort_order: 12,
    speaker: '主持人',
    label: '圆桌论坛 · 第一场',
    content:
      '接下来，我们将进入圆桌论坛，本次圆桌将围绕Agent领域的投资、生态、技术进化等核心问题展开深度探讨，掌声有请！',
  },
  {
    sort_order: 13,
    speaker: '主持人',
    label: '午餐休息',
    content:
      '接下来是午餐与自由交流时间，大家可以尽情用餐、和同行伙伴畅聊交流。下午的议程将于13:45开始签到，还请大家准时归来！',
  },
  {
    sort_order: 14,
    speaker: '主持人',
    label: '下午场开场',
    content:
      '各位嘉宾、伙伴们，下午好！欢迎回到OpenClaw Meetup的活动现场，下午我们将聚焦实操与经验，分享Agent领域的实战干货。',
  },
  {
    sort_order: 15,
    speaker: '主持人',
    label: '有请嘉宾 · 叶震杰',
    content:
      '首先，有请ZenMux.ai联合创始人、产品负责人叶震杰先生，为我们带来主题分享，掌声欢迎！',
  },
  {
    sort_order: 16,
    speaker: '主持人',
    label: '有请嘉宾 · 尹子萧',
    content:
      '感谢叶震杰先生！接下来，有请首序智能研发总监尹子萧先生上台分享，掌声欢迎！',
  },
  {
    sort_order: 17,
    speaker: '主持人',
    label: '有请嘉宾 · HW',
    content:
      '感谢尹子萧先生！接下来，有请独立Agent开发者HW先生，掌声欢迎！',
  },
  {
    sort_order: 18,
    speaker: '主持人',
    label: '闭幕致辞',
    content:
      '各位嘉宾、各位伙伴，今天的OpenClaw Meetup到这里就接近尾声了。愿今天的相遇，能成为大家未来合作与创新的小小起点，让我们带着这份对AI的热爱，继续并肩探索，共赴智能未来。最后，祝大家周末愉快，我们下次活动再会！谢谢大家！',
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('AIHost Demo Seed Script');
  console.log('=======================\n');

  // 1. Ensure a demo user exists in auth.users via admin API
  console.log(`[1/4] Ensuring demo user exists: ${DEMO_USER_EMAIL}`);
  const { data: listData, error: listError } =
    await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Failed to list users:', listError.message);
    process.exit(1);
  }

  let demoUser = listData.users.find((u) => u.email === DEMO_USER_EMAIL);

  if (!demoUser) {
    const { data: createdData, error: createError } =
      await supabase.auth.admin.createUser({
        email: DEMO_USER_EMAIL,
        password: 'demo-aihost-2026',
        email_confirm: true,
        user_metadata: { display_name: 'Demo User' },
      });
    if (createError) {
      console.error('Failed to create demo user:', createError.message);
      process.exit(1);
    }
    demoUser = createdData.user;
    console.log(`   Created demo user: ${demoUser.id}`);
  } else {
    console.log(`   Found existing demo user: ${demoUser.id}`);
  }

  const userId = demoUser.id;

  // 2. Ensure profile row exists (trigger may have already created it)
  console.log('[2/4] Ensuring profile row exists...');
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      { id: userId, email: DEMO_USER_EMAIL, display_name: 'Demo User' },
      { onConflict: 'id' }
    );
  if (profileError) {
    console.error('Failed to upsert profile:', profileError.message);
    process.exit(1);
  }
  console.log('   Profile ready.');

  // 3. Delete any existing demo event with the same title to allow re-seeding
  console.log('[3/4] Cleaning up existing demo event (if any)...');
  const { data: existing } = await supabase
    .from('events')
    .select('id')
    .eq('user_id', userId)
    .eq('title', DEMO_EVENT_TITLE)
    .maybeSingle();

  if (existing) {
    // Cascade deletes script_lines automatically
    await supabase.from('events').delete().eq('id', existing.id);
    console.log(`   Deleted old event: ${existing.id}`);
  } else {
    console.log('   No existing demo event found.');
  }

  // 4. Create event
  console.log('[4/4] Creating demo event and script lines...');
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      user_id: userId,
      title: DEMO_EVENT_TITLE,
      description:
        'OpenClaw Meetup 活动主持脚本，由 AIHost 自动生成并播报。涵盖嘉宾介绍、圆桌论坛、闭幕致辞等18个环节。',
      status: 'ready',
      voice_id: DEMO_VOICE_ID,
    })
    .select()
    .single();

  if (eventError) {
    console.error('Failed to create event:', eventError.message);
    process.exit(1);
  }

  console.log(`   Event created: ${event.id}`);

  // Insert script lines in one batch
  const lines = SCRIPT_LINES.map((line) => ({
    event_id: event.id,
    sort_order: line.sort_order,
    speaker: line.speaker,
    content: line.content,
  }));

  const { error: linesError } = await supabase
    .from('script_lines')
    .insert(lines);

  if (linesError) {
    console.error('Failed to insert script lines:', linesError.message);
    process.exit(1);
  }

  console.log(`   Inserted ${lines.length} script lines.\n`);

  // Summary
  console.log('========================================');
  console.log('Demo seed complete!');
  console.log('========================================');
  console.log(`Event ID   : ${event.id}`);
  console.log(`Title      : ${event.title}`);
  console.log(`Status     : ${event.status}`);
  console.log(`Voice ID   : ${event.voice_id}`);
  console.log(`Lines      : ${lines.length}`);
  console.log(`User ID    : ${userId}`);
  console.log(`User Email : ${DEMO_USER_EMAIL}`);
  console.log('========================================\n');
  console.log('To log in during the demo:');
  console.log(`  Email    : ${DEMO_USER_EMAIL}`);
  console.log('  Password : demo-aihost-2026');
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
