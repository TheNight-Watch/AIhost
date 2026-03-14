# AI Host - Product Requirements Document (PRD)

**Version:** 2.0
**Date:** 2026-03-14
**Status:** Confirmed (Hackathon Build)

---

## 1. Product Overview

### 1.1 Product Name
AI Host (AI 主持人)

### 1.2 Product Summary
AI Host is an intelligent event hosting platform that goes beyond text-to-speech. It listens to speakers in real time, generates context-aware transitions referencing what was just said, engages audiences through live polls and reactions, and provides a professional real-time event dashboard. It is an AI that actually *hosts* -- not just reads scripts.

### 1.3 Target Users
- Event organizers and planners
- Conference/seminar coordinators
- Corporate meeting hosts
- Hackathon organizers
- Any user needing AI-assisted event hosting with real-time intelligence

### 1.4 Core Value Proposition
- **Not a TTS player -- a real AI host** that understands context and adapts
- Generates dynamic transitions that reference the current speaker's actual content
- Engages audiences through live interactive polls and reactions
- Provides a professional event control center visible on large screens
- Reduces preparation time from hours to minutes
- Support bilingual (Chinese/English) UI

---

## 2. Technical Architecture

### 2.1 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (React) |
| UI Language | Chinese + English (i18n) |
| AI Model | Doubao LLM (via Volcano Ark platform, OpenAI-compatible API) |
| TTS | Doubao TTS 2.0 (Volcano Engine Speech Service) |
| ASR | Web Speech API (primary) / Volcano Engine Streaming ASR (upgrade path) |
| Real-time | Supabase Realtime (WebSocket subscriptions for live data) |
| Backend/DB | Supabase Cloud (Auth + Storage + Database + Edge Functions) |
| Deployment | Vercel (frontend) + Supabase Cloud (backend) |

### 2.2 Architecture Diagram (Text)

```
+------------------------------------------------------------------+
|  Audience Mobile Web (QR code entry)        [P2: Audience Pulse]  |
|  - Vote in polls                                                  |
|  - Submit questions                                               |
|  - React with emoji                                               |
+-------|----------------------------------------------------------+
        | Supabase Realtime (WebSocket)
        v
+------------------------------------------------------------------+
|  Main Control Interface (Next.js on Vercel)                       |
|                                                                   |
|  [Script Lines Page] -- F4                                        |
|  [Live Dashboard]    -- P5 (large screen projection)              |
|  [Auto-Host Mode]    -- P1 (real-time transitions)                |
+-------|----------------------------------------------------------+
        | Next.js API Routes (server-side)
        v
+------------------------------------------------------------------+
|  External APIs                                                    |
|                                                                   |
|  Volcano Ark API (Doubao LLM)                                    |
|    Base URL: https://ark.cn-beijing.volces.com/api/v3             |
|    Auth: Bearer {ARK_API_KEY}                                     |
|    Uses: script gen, multimodal understanding, transitions, polls |
|                                                                   |
|  Volcano TTS API (Doubao TTS 2.0)                                |
|    HTTP: https://openspeech.bytedance.com/api/v1/tts              |
|    WS: wss://openspeech.bytedance.com/api/v1/tts/ws_binary       |
|    Auth: Bearer;{ACCESS_TOKEN}                                    |
|    Uses: speech synthesis for script lines + live transitions     |
|                                                                   |
|  ASR (client-side)                                                |
|    Web Speech API (browser-native, free)                          |
|    Upgrade: wss://openspeech.bytedance.com/api/v2/asr            |
+------------------------------------------------------------------+
        |
        v
+------------------------------------------------------------------+
|  Supabase Cloud                                                   |
|  - Auth (JWT sessions, user management)                           |
|  - Database (PostgreSQL with RLS)                                 |
|  - Storage (agenda files, TTS audio)                              |
|  - Realtime (live audience data, dashboard updates)               |
+------------------------------------------------------------------+
```

### 2.3 Authentication Note: Separate Credential Systems

**Important:** The Doubao LLM (Ark platform) and Doubao TTS/ASR (Speech platform) use **separate credential systems**:

| Service | Auth Method | Credentials |
|---------|------------|-------------|
| Doubao LLM (Ark) | API Key (OpenAI-compatible) | `ARK_API_KEY` from Ark console |
| Doubao TTS 2.0 | Bearer Token + App ID | `APP_ID: 6863718057`, `ACCESS_TOKEN: tZ5deJ0kcjhNLau8nQsCse2T5VkjEEkt` |
| Doubao ASR | Bearer Token + App ID | Same speech platform credentials as TTS |

---

## 3. Functional Requirements

### 3.1 MVP Features

#### F1: User Authentication
- **Description:** User registration and login via Supabase Auth
- **Details:**
  - Email/password registration and login
  - Optional: third-party OAuth (WeChat, Google) -- future consideration
  - Session management via Supabase Auth JWT
  - Each user has an isolated workspace (Row-Level Security on all tables)

#### F2: Event Agenda Upload & Script Generation
- **Description:** Users upload event flow documents; AI generates host scripts
- **Details:**
  - **Upload options:**
    - Upload image (photo of agenda, flowchart, schedule) -- multimodal understanding via Doubao LLM
    - Upload document (PDF, Word, plain text) -- document understanding via Doubao LLM
    - Direct text input of a pre-written script
  - **AI Script Generation:**
    - Uploaded content is sent to Doubao LLM for understanding and script generation
    - The model interprets the event structure and generates a professional host script
    - Script is segmented into individual lines/cues tied to event timeline
    - Each line also gets a **fallback transition** pre-generated (used by P1 if LLM latency is too high)
  - **Script Refinement:**
    - Manual text editing of the generated script
    - Chat-based refinement: user sends text or voice messages to refine the script via conversation with the AI model
    - Voice input for chat uses browser's Web Speech API (lightweight, no server cost)
  - **Confirmation:** User confirms the final script and proceeds to voice selection

#### F3: Voice Selection
- **Description:** User selects a TTS voice (timbre) for broadcasting
- **Details:**
  - Display all available Doubao TTS 2.0 voices as selectable buttons
  - Organized by category: gender, style (professional, energetic, storytelling, etc.), language
  - User can type custom test text and click any voice button to preview/audition
  - Selected voice is saved to the event configuration
  - **Available voice categories:**
    - Multi-emotion voices (support style/emotion parameters)
    - General purpose voices
    - Character voices (40+ role-play voices)
    - Video narration voices
    - Audiobook voices
  - **Emotion/Style options** (for supported voices): happy, sad, angry, professional, storytelling, customer_service, energetic, narrator, chat, etc.

#### F4: Script Lines Page (Main Workspace)
- **Description:** The main editing and generation workspace for individual script lines
- **Details:**
  - **Layout:**
    - Left sidebar: vertical timeline with event cue markers
    - Main area: list of script line cards, each containing:
      - Timeline marker/label (e.g., "Opening", "Speaker 1 Intro", "Break")
      - Editable text content of the script line
      - `Generate` button on the right side to generate TTS audio for that line
      - Audio playback controls (play/pause, progress bar) after generation
  - **Interactions:**
    - Clicking a script card highlights it with a visual animation effect
    - Each line's `Generate` button calls Doubao TTS 2.0 API with the selected voice
    - Generated audio is stored in Supabase Storage
    - Batch generation button at the top: generates audio for ALL lines sequentially
  - **Editing:**
    - Inline editing of script text
    - Add/delete/reorder script lines
    - Drag-and-drop reordering

### 3.2 Hackathon Differentiator Features

#### P1: Live Transition Intelligence (Real-time Context-Aware Hosting)

- **Description:** The AI listens to the current speaker via ASR, understands key points in real time, and dynamically generates a context-aware transition that references what was just said before introducing the next segment.
- **Why this matters:** This single feature transforms the product from a "TTS player" into a genuine "AI host." No existing tool does this.

##### P1 User Flow
1. User enters "Live Host" mode from the Script Lines page
2. AI begins listening via microphone (Web Speech API)
3. ASR transcribes the current speaker's words in real time (visible as rolling subtitles)
4. When the speaker finishes (silence detection or manual trigger), the AI:
   a. Summarizes the speaker's key points via LLM
   b. Generates a 1-2 sentence contextual transition
   c. Synthesizes the transition via TTS
   d. Plays the audio
5. AI then plays the pre-generated script line for the next segment (if available)
6. Repeat for subsequent segments

##### P1 Latency Optimization Strategy (CRITICAL PATH)

**Target: < 5 seconds from speaker-stop to AI-host-speaks**

The pipeline has 4 stages. Each must be optimized:

```
Speaker stops --> [ASR final] --> [LLM generate] --> [TTS synthesize] --> [Audio play]
                    ~0.5s           ~2-3s              ~1-2s              ~0.2s
                                                                    Total: ~4-6s
```

**Strategy 1: Sentence-Level Streaming Pipeline (LLM -> TTS)**

Do NOT wait for the full LLM response before starting TTS. Instead:
1. LLM streams its response token by token
2. A sentence detector buffers tokens until a complete sentence is formed (period, comma clause, etc.)
3. Each complete sentence is immediately sent to TTS
4. TTS audio for the first sentence plays while subsequent sentences are still being generated

```
LLM stream: "Thank you Dr. Li" | " -- that point about carbon credits" | " was fascinating."
                 |                       |                                      |
                 v                       v                                      v
            TTS call #1            TTS call #2                            TTS call #3
                 |
                 v
            Play immediately (while #2 and #3 are still generating)
```

This reduces perceived latency from ~5s to ~2-3s (time to first audio).

**Implementation:**
```typescript
// Streaming LLM -> sentence chunking -> parallel TTS
const stream = await arkClient.chat.completions.create({
    model: process.env.ARK_MODEL_ENDPOINT,
    messages: transitionPrompt,
    stream: true,
    max_tokens: 80,  // Limit output to 1-2 sentences
});

let buffer = '';
for await (const chunk of stream) {
    buffer += chunk.choices[0]?.delta?.content || '';
    const sentenceEnd = buffer.match(/[.!?。！？，]/);
    if (sentenceEnd) {
        const sentence = buffer.substring(0, sentenceEnd.index + 1);
        buffer = buffer.substring(sentenceEnd.index + 1);
        // Fire TTS immediately for this sentence (non-blocking)
        ttsQueue.push(generateTTSAudio(sentence, voiceType));
    }
}
```

**Strategy 2: Pre-generated Fallback Transitions**

During script preparation (F2), generate generic but specific fallback transitions for each segment:
- "Thank you, [Speaker Name]. Next, let's welcome [Next Speaker] to discuss [Topic]."
- These are pre-synthesized to audio during batch generation
- If the live LLM pipeline takes > 6 seconds, immediately play the fallback
- The fallback is always acceptable; the live transition is a bonus

**Strategy 3: Transition Sound Effects (Gap Filler)**

Play a brief audio cue immediately when the speaker stops:
- A short applause sound (0.5-1s)
- A soft transition chime
- This fills the gap while LLM + TTS are working
- Feels natural -- events always have transition moments

**Strategy 4: Compact LLM Prompt**

Minimize LLM output tokens to reduce generation time:
```
System: You are a live event host. Generate a 1-sentence transition.
User: Speaker just said: "{last_60_words_of_transcript}"
Next segment: "{next_segment_label}: {next_segment_speaker}"
Output ONLY the transition sentence. Max 30 words.
```

Using `max_tokens: 80` and `temperature: 0.7` for fast, focused output.

**Strategy 5: ASR Buffer Pre-processing**

Don't wait for "final" ASR result. Start LLM call with the interim transcript once silence > 2 seconds is detected. The interim transcript is usually 95%+ accurate and saves ~0.5s.

##### P1 State Machine

```
[IDLE] --user starts--> [LISTENING]
  ^                         |
  |                    (ASR streaming, speaker talking)
  |                         |
  |                    (silence > 3s OR manual trigger)
  |                         v
  |                    [GENERATING]
  |                         |
  |                    (play transition sound effect immediately)
  |                    (LLM streaming -> sentence chunking -> TTS queue)
  |                         |
  |                    (first TTS audio ready)
  |                         v
  |                    [SPEAKING]
  |                         |
  |                    (play transition audio, then pre-generated script line)
  |                         |
  |                    (audio finished)
  |                         v
  +---<---<---<---<--- [LISTENING] (auto-advance to next segment)
```

---

#### P2: Audience Pulse System (Live Engagement)

- **Description:** A real-time audience interaction layer. Attendees scan a QR code to access a mobile web page where they can vote, react, and submit questions. The AI host references this data live.

##### P2 User Flow
1. Event organizer creates polls/interactions in the Script Lines page (tied to segments)
2. A unique QR code is generated for the event (links to `/audience/{event_id}`)
3. Attendees scan and enter a lightweight mobile page (no login required, anonymous)
4. During the event:
   - AI host announces a poll: "Let's hear from you -- vote now!"
   - Attendees vote, results update in real time on the dashboard (P5)
   - AI host reads results: "73% of you chose option B -- interesting!"
   - Attendees can submit questions and react with emoji at any time

##### P2 Data Model

```sql
-- Polls created by the organizer, tied to script line segments
CREATE TABLE public.audience_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    script_line_id UUID REFERENCES public.script_lines(id) ON DELETE SET NULL,
    question TEXT NOT NULL,
    poll_type TEXT DEFAULT 'single_choice', -- 'single_choice', 'multiple_choice', 'word_cloud', 'rating'
    options JSONB, -- ["Option A", "Option B", "Option C"] for choice types
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual votes from audience members
CREATE TABLE public.audience_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.audience_polls(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL, -- anonymous browser session ID (no login required)
    selected_option JSONB NOT NULL, -- index or value of selected option(s)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(poll_id, session_id) -- one vote per person per poll
);

-- Audience emoji reactions (lightweight, no poll needed)
CREATE TABLE public.audience_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    reaction_type TEXT NOT NULL, -- 'applause', 'laugh', 'wow', 'heart', 'thinking'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audience submitted questions
CREATE TABLE public.audience_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE, -- marked true after AI host reads it
    upvotes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

##### P2 Realtime Communication Design (Supabase Realtime)

**Channels and subscriptions:**

```typescript
// 1. Dashboard subscribes to live vote counts (aggregated)
const votesChannel = supabase
    .channel(`votes:${eventId}`)
    .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'audience_votes',
        filter: `poll_id=eq.${activePollId}`
    }, (payload) => {
        // Update vote count in real time
        updateVoteCounts(payload.new);
    })
    .subscribe();

// 2. Dashboard subscribes to emoji reactions (burst display)
const reactionsChannel = supabase
    .channel(`reactions:${eventId}`)
    .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'audience_reactions',
        filter: `event_id=eq.${eventId}`
    }, (payload) => {
        // Show floating emoji animation on dashboard
        showReactionBurst(payload.new.reaction_type);
    })
    .subscribe();

// 3. Audience mobile page subscribes to poll activation
const pollActivationChannel = supabase
    .channel(`poll-control:${eventId}`)
    .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'audience_polls',
        filter: `event_id=eq.${eventId}`
    }, (payload) => {
        if (payload.new.is_active) {
            showPollToAudience(payload.new);
        }
    })
    .subscribe();
```

**Data flow:**
```
Audience mobile page
    |
    +--> INSERT into audience_votes / audience_reactions / audience_questions
    |
    v (Supabase Realtime triggers)
    |
Dashboard (P5) receives update --> re-renders vote chart / shows emoji burst
    |
Live Host (P1) can query --> "GET /api/poll-results/{poll_id}" --> LLM generates commentary
    |
    v
TTS speaks: "73% of you chose option B!"
```

##### P2 Audience Mobile Page Design

Route: `/audience/[eventId]` (public, no auth required)

- Minimal, fast-loading mobile-first page
- Session ID generated on first visit (stored in localStorage)
- Sections:
  - **Active Poll** (if any): shows question + option buttons, updates results live
  - **Reaction Bar**: row of emoji buttons (applause, laugh, wow, heart, thinking) -- tap to send
  - **Ask a Question**: text input field, submit button
  - **Event Info**: event title, current segment name

---

#### P5: Live Event Dashboard (Large Screen View)

- **Description:** A professional, projection-ready dashboard that visualizes the entire event state in real time. Designed for large screens at venues.

##### P5 Page Structure

Route: `/dashboard/[eventId]` (authenticated, organizer only)

```
+----------------------------------------------------------------------+
|  [Event Title]                              [Current Time] [Status]   |
+----------------------------------------------------------------------+
|                                  |                                    |
|  TIMELINE (left 25%)             |  MAIN AREA (center 50%)            |
|                                  |                                    |
|  [x] Opening Remarks            |  LIVE TRANSCRIPT                   |
|  [x] Speaker 1: Dr. Li          |  --------------------------------   |
|  [>] Speaker 2: Zhang Wei  <--  |  "...and that's why carbon         |
|  [ ] Panel Discussion            |   credits will transform the       |
|  [ ] Q&A Session                 |   energy market by 2030..."        |
|  [ ] Closing Remarks            |                                    |
|                                  |  AI HOST STATUS                    |
|  -------- Progress: 33% ------- |  [Listening...] / [Generating...]  |
|                                  |   / [Speaking: "Thank you Dr.Li"]  |
|                                  |                                    |
+----------------------------------+------------------------------------+
|                                                                       |
|  AUDIENCE ENGAGEMENT (bottom 25%)                                     |
|                                                                       |
|  [POLL: "Did you find this useful?"]     [REACTIONS]                  |
|  ██████████████ Yes: 73%                  👏 x42  😂 x12  🤯 x8     |
|  ██████ No: 27%                           ❤️ x15  🤔 x5              |
|                                                                       |
|  [QUESTIONS QUEUE]                                                    |
|  1. "How does this compare to EU approach?" (↑ 8 votes)              |
|  2. "What's the timeline for implementation?" (↑ 5 votes)            |
|                                                                       |
+----------------------------------------------------------------------+
```

##### P5 Data Sources

| Dashboard Section | Data Source | Update Method |
|-------------------|-----------|---------------|
| Timeline / Progress | `script_lines` table (order_index, current segment state) | Supabase Realtime on `events.status` + local state |
| Live Transcript | Web Speech API ASR (client-side) | Direct state update, no DB needed |
| AI Host Status | Local P1 state machine (IDLE/LISTENING/GENERATING/SPEAKING) | React state |
| Poll Results | `audience_votes` aggregated by `poll_id` | Supabase Realtime INSERT subscription |
| Reactions | `audience_reactions` with time-window aggregation | Supabase Realtime INSERT subscription |
| Questions Queue | `audience_questions` ordered by `upvotes` DESC | Supabase Realtime INSERT/UPDATE subscription |
| Current Time | `Date.now()` | Client-side interval |
| Event Metadata | `events` table | Initial load |

##### P5 Design Principles
- **Dark theme** with high contrast for projector/large screen visibility
- **Large fonts** -- minimum 24px for body text, 48px+ for headlines
- **Animations**: smooth transitions for poll bar growth, emoji burst effects, segment highlight changes
- **Auto-layout**: responsive to common projection ratios (16:9, 4:3)
- **No interaction needed on dashboard screen** -- it's display-only; all control happens from the organizer's laptop/tablet

---

### 3.3 Future Features (Post-Hackathon)

#### F5: Adaptive Atmosphere Engine (P3)
- Detect cold rooms (silence), high energy (applause), running late
- Dynamically adjust hosting style and insert warming interactions

#### F6: Human-AI Co-Host Mode (P8)
- AI handles mechanical parts, human handles emotional moments
- Teleprompter mode with approve/skip controls

---

## 4. Page Flow

```
[Login/Register Page]
        |
        v
[Dashboard] -- list of user's events/projects
        |
        v (Create New / Select Existing)
[Event Agenda Upload Page] -- F2
        |
        v (Script confirmed)
[Voice Selection Page] -- F3
        |
        v (Voice selected)
[Script Lines Page] -- F4 (main workspace)
        |
        +-------> [Live Host Mode] -- P1 (real-time transitions)
        |               |
        |               +-------> [Live Dashboard -- separate screen/tab] -- P5
        |
        +-------> [Audience Mobile Page -- QR code] -- P2
                        (public, no auth, scanned by attendees)
```

---

## 5. Data Model (Supabase PostgreSQL)

### 5.1 Tables

#### `profiles`
```sql
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    preferred_language TEXT DEFAULT 'zh', -- 'zh' or 'en'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `events`
```sql
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    voice_type TEXT, -- selected TTS voice ID, e.g. 'BV700_V2_streaming'
    voice_emotion TEXT, -- optional emotion parameter, e.g. 'happy'
    status TEXT DEFAULT 'draft', -- 'draft', 'ready', 'live', 'completed'
    current_segment_index INTEGER DEFAULT 0, -- tracks which segment is active during live mode
    source_file_url TEXT,
    source_file_type TEXT, -- 'image', 'pdf', 'docx', 'text'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `script_lines`
```sql
CREATE TABLE public.script_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    label TEXT, -- timeline label, e.g. 'Opening Remarks', 'Speaker 1 Intro'
    content TEXT NOT NULL, -- the script text
    fallback_transition TEXT, -- pre-generated generic transition for P1 fallback
    audio_url TEXT, -- Supabase Storage URL for generated TTS audio
    fallback_audio_url TEXT, -- pre-generated fallback transition audio
    audio_duration_ms INTEGER,
    is_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `chat_messages`
```sql
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `audience_polls`
```sql
CREATE TABLE public.audience_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    script_line_id UUID REFERENCES public.script_lines(id) ON DELETE SET NULL,
    question TEXT NOT NULL,
    poll_type TEXT DEFAULT 'single_choice', -- 'single_choice', 'multiple_choice', 'word_cloud', 'rating'
    options JSONB, -- ["Option A", "Option B", "Option C"]
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `audience_votes`
```sql
CREATE TABLE public.audience_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.audience_polls(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL, -- anonymous browser session ID
    selected_option JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(poll_id, session_id)
);
```

#### `audience_reactions`
```sql
CREATE TABLE public.audience_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    reaction_type TEXT NOT NULL, -- 'applause', 'laugh', 'wow', 'heart', 'thinking'
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `audience_questions`
```sql
CREATE TABLE public.audience_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    upvotes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.2 Row-Level Security (RLS)

```sql
-- Events: user can only access their own
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own events"
    ON public.events FOR ALL USING (auth.uid() = user_id);

-- Script lines: access through event ownership
ALTER TABLE public.script_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access script lines of their events"
    ON public.script_lines FOR ALL
    USING (event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid()));

-- Chat messages: same pattern
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access chat of their events"
    ON public.chat_messages FOR ALL
    USING (event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid()));

-- Polls: organizer manages, audience reads active polls
ALTER TABLE public.audience_polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizer manages polls"
    ON public.audience_polls FOR ALL
    USING (event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid()));
CREATE POLICY "Anyone can read active polls"
    ON public.audience_polls FOR SELECT
    USING (is_active = TRUE);

-- Votes: anyone can insert (anonymous), organizer can read
ALTER TABLE public.audience_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can vote"
    ON public.audience_votes FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Organizer can read votes"
    ON public.audience_votes FOR SELECT
    USING (poll_id IN (
        SELECT id FROM public.audience_polls WHERE event_id IN (
            SELECT id FROM public.events WHERE user_id = auth.uid()
        )
    ));

-- Reactions: anyone can insert, organizer can read
ALTER TABLE public.audience_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can react"
    ON public.audience_reactions FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Organizer can read reactions"
    ON public.audience_reactions FOR SELECT
    USING (event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid()));

-- Questions: anyone can insert, organizer can read/update
ALTER TABLE public.audience_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit questions"
    ON public.audience_questions FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Organizer can manage questions"
    ON public.audience_questions FOR ALL
    USING (event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid()));
```

### 5.3 Supabase Storage Buckets

| Bucket | Purpose | Access |
|--------|---------|--------|
| `agenda-uploads` | User-uploaded agenda files (images, PDFs, docs) | Private (per-user) |
| `tts-audio` | Generated TTS audio files (script lines + fallback transitions) | Private (per-user) |
| `transition-sfx` | Pre-loaded transition sound effects (applause, chime) | Public (read-only) |

---

## 6. API Interface Design

### 6.1 Next.js API Routes (Server-side)

#### `POST /api/generate-script`
Generate host script from uploaded content.

**Request:**
```json
{
    "event_id": "uuid",
    "source_type": "image | document | text",
    "content": "text content or base64 image or file_url",
    "prompt_context": "optional additional instructions"
}
```

**Backend Logic:**
1. If image/document: send to Doubao LLM multimodal API for understanding
2. Generate structured host script with timeline labels
3. For each script line, also generate a fallback transition sentence
4. Save script lines (with fallback transitions) to `script_lines` table
5. Return generated script lines

#### `POST /api/refine-script`
Chat-based script refinement.

**Request:**
```json
{
    "event_id": "uuid",
    "message": "user's refinement request"
}
```

#### `POST /api/generate-audio`
Generate TTS audio for a script line.

**Request:**
```json
{
    "script_line_id": "uuid",
    "voice_type": "BV700_V2_streaming",
    "emotion": "professional"
}
```

#### `POST /api/generate-audio-batch`
Batch generate TTS audio for all lines in an event. Also generates fallback transition audio.

#### `POST /api/preview-voice`
Preview a voice with custom text.

#### `GET /api/voices`
Return list of available TTS voices.

#### `POST /api/generate-live-transition` (NEW -- P1)
Generate a real-time contextual transition.

**Request:**
```json
{
    "event_id": "uuid",
    "current_segment_index": 2,
    "transcript_tail": "last 200 characters of ASR transcript",
    "voice_type": "BV700_V2_streaming",
    "emotion": "professional"
}
```

**Backend Logic:**
1. Build compact prompt with transcript tail + next segment info
2. Call Doubao LLM with streaming enabled, `max_tokens: 80`
3. Stream response through sentence-level chunker
4. For each sentence, call TTS and return audio chunk
5. Response is a streaming response (Server-Sent Events) with audio data URLs

**Response (SSE stream):**
```
event: transition_audio
data: {"sentence": "Thank you Dr. Li!", "audio_base64": "..."}

event: transition_audio
data: {"sentence": "That point about carbon credits was fascinating.", "audio_base64": "..."}

event: done
data: {}
```

#### `GET /api/poll-results/[pollId]` (NEW -- P2)
Get aggregated poll results.

**Response:**
```json
{
    "poll_id": "uuid",
    "question": "Did you find this useful?",
    "total_votes": 42,
    "results": [
        {"option": "Yes", "count": 31, "percentage": 73.8},
        {"option": "No", "count": 11, "percentage": 26.2}
    ]
}
```

#### `POST /api/announce-poll-results` (NEW -- P2)
AI generates a natural language comment on poll results, synthesizes via TTS.

**Request:**
```json
{
    "poll_id": "uuid",
    "voice_type": "BV700_V2_streaming"
}
```

**Backend Logic:**
1. Fetch aggregated poll results
2. LLM generates a 1-sentence comment (e.g., "73% of you found this useful -- great feedback!")
3. TTS synthesizes
4. Returns audio

---

## 7. Doubao API Integration Details

### 7.1 Doubao LLM (Ark Platform)

**Platform:** Volcano Ark (火山方舟)
**Base URL:** `https://ark.cn-beijing.volces.com/api/v3`
**Auth:** `Authorization: Bearer {ARK_API_KEY}`
**SDK:** OpenAI-compatible -- use `openai` npm package

#### Configuration
```typescript
import OpenAI from 'openai';

const arkClient = new OpenAI({
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    apiKey: process.env.ARK_API_KEY,
});
```

#### Script Generation (F2)
```typescript
const response = await arkClient.chat.completions.create({
    model: process.env.ARK_MODEL_ENDPOINT,
    messages: [
        { role: 'system', content: 'You are a professional event host script writer...' },
        { role: 'user', content: 'Generate a host script for this event agenda: ...' }
    ],
});
```

#### Image Understanding (F2 -- Multimodal)
```typescript
const response = await arkClient.chat.completions.create({
    model: process.env.ARK_MODEL_ENDPOINT,
    messages: [{
        role: 'user',
        content: [
            { type: 'text', text: 'Understand this event agenda and generate a host script...' },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
    }],
});
```

#### Live Transition Generation (P1 -- Streaming, Low Latency)
```typescript
const stream = await arkClient.chat.completions.create({
    model: process.env.ARK_FAST_MODEL_ENDPOINT, // Use Lite model for speed
    messages: [
        {
            role: 'system',
            content: 'You are a live event host. Generate a natural 1-2 sentence transition. Be concise and reference the speaker\'s content. Max 30 words.'
        },
        {
            role: 'user',
            content: `Speaker just said: "${transcriptTail}"\nNext segment: "${nextLabel}: ${nextSpeaker}"\nGenerate transition:`
        }
    ],
    stream: true,
    max_tokens: 80,
    temperature: 0.7,
});
```

#### Poll Commentary (P2)
```typescript
const response = await arkClient.chat.completions.create({
    model: process.env.ARK_FAST_MODEL_ENDPOINT,
    messages: [{
        role: 'user',
        content: `Poll: "${question}". Results: ${JSON.stringify(results)}. Generate a 1-sentence host comment about these results. Be engaging and natural.`
    }],
    max_tokens: 60,
});
```

#### Recommended Models
- **Doubao-Seed-2.0-Pro**: Script generation (F2), multimodal understanding -- quality matters here
- **Doubao-Seed-2.0-Lite**: Live transitions (P1), poll commentary (P2) -- speed matters here

### 7.2 Doubao TTS 2.0

**HTTP Endpoint:** `https://openspeech.bytedance.com/api/v1/tts`
**WebSocket Endpoint:** `wss://openspeech.bytedance.com/api/v1/tts/ws_binary`
**Auth:** `Authorization: Bearer;{ACCESS_TOKEN}` (semicolon, not space)

#### Credentials
- **APP ID:** `6863718057`
- **Access Token:** `tZ5deJ0kcjhNLau8nQsCse2T5VkjEEkt`
- **Cluster:** `volcano_tts` (built-in voices)

#### Request Format
```typescript
const ttsRequest = {
    app: {
        appid: process.env.TTS_APP_ID,
        token: process.env.TTS_ACCESS_TOKEN,
        cluster: "volcano_tts"
    },
    user: { uid: userId },
    audio: {
        voice_type: "BV700_V2_streaming",
        encoding: "mp3",
        speed_ratio: 1.0,
        volume_ratio: 1.0,
        pitch_ratio: 1.0,
        emotion: "professional",
        language: "cn"
    },
    request: {
        reqid: crypto.randomUUID(),
        text: "Script line text",
        text_type: "plain",
        operation: "query"
    }
};
```

#### Response
```json
{
    "reqid": "uuid",
    "code": 3000,
    "message": "Success",
    "sequence": -1,
    "data": "<base64-encoded audio bytes>"
}
```

Full voice list: https://www.volcengine.com/docs/6561/1257544

### 7.3 ASR (Speech Recognition)

**Primary: Web Speech API** (browser-native)
```typescript
const recognition = new webkitSpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = 'zh-CN';

recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
        .map(r => r[0].transcript)
        .join('');
    updateLiveTranscript(transcript);
    detectSilence(event);
};
```

**Upgrade path:** Volcano Engine Streaming ASR
- `wss://openspeech.bytedance.com/api/v2/asr`
- Same credentials as TTS

---

## 8. Non-Functional Requirements

### 8.1 Performance
- **P1 Live Transition latency:** < 5 seconds end-to-end (target: 3s with streaming)
- **P1 Time-to-first-audio:** < 3 seconds (via sentence-level streaming)
- TTS generation: < 3 seconds per line (pre-generation)
- Script generation: < 15 seconds for full script
- P2 Audience data propagation: < 500ms (Supabase Realtime)
- P5 Dashboard refresh: real-time (WebSocket subscriptions)

### 8.2 Security
- All API keys stored server-side only (Next.js API routes / environment variables)
- Supabase RLS enforces per-user data isolation
- Audience pages are read/write limited (can only INSERT votes/reactions/questions)
- Rate limiting on audience endpoints to prevent spam
- HTTPS for all communications

### 8.3 Scalability
- Supabase handles database, auth, and realtime scaling
- Vercel handles frontend scaling with edge deployment
- P2 audience page is static/lightweight -- can handle hundreds of concurrent users
- Audio files stored in Supabase Storage (S3-compatible)

### 8.4 Reliability
- P1 fallback: if live transition fails, play pre-generated fallback transition audio
- P1 fallback: if all TTS fails, play transition sound effect only
- Graceful error handling for API failures
- Audio caching to avoid regenerating unchanged lines

### 8.5 Internationalization
- UI supports Chinese (zh) and English (en)
- Use `next-intl` or similar i18n library
- User language preference stored in profile
- Audience mobile page auto-detects browser language

---

## 9. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Doubao LLM (Ark Platform)
ARK_API_KEY=xxx
ARK_MODEL_ENDPOINT=xxx           # Pro model for script gen (quality)
ARK_FAST_MODEL_ENDPOINT=xxx      # Lite model for live transitions (speed)

# Doubao TTS 2.0
TTS_APP_ID=6863718057
TTS_ACCESS_TOKEN=tZ5deJ0kcjhNLau8nQsCse2T5VkjEEkt
TTS_CLUSTER=volcano_tts
```

---

## 10. Development Phases (Hackathon Timeline)

### Phase 0: Latency Prototype Validation (FIRST PRIORITY)
**Goal:** Prove the P1 pipeline works within acceptable latency.

1. Standalone script: ASR (Web Speech API) -> capture transcript
2. Standalone script: transcript -> Doubao LLM (streaming) -> sentence chunking
3. Standalone script: sentence -> Doubao TTS -> audio playback
4. End-to-end: full pipeline with latency measurement
5. **Success criteria:** < 5 seconds from silence detection to first audio playback
6. If latency is too high: tune prompt length, switch to Lite model, increase silence threshold

### Phase 1: Core MVP
1. Project setup: Next.js + Supabase + i18n
2. User authentication (Supabase Auth)
3. Event creation and agenda upload
4. Doubao LLM integration (text + image understanding)
5. Script generation and editing (including fallback transitions)
6. Voice selection page with preview
7. Script Lines page with individual and batch TTS generation

### Phase 2: Live Host Mode (P1)
1. Web Speech API ASR integration (continuous listening)
2. Silence detection logic
3. `/api/generate-live-transition` endpoint with SSE streaming
4. Sentence-level LLM -> TTS pipeline
5. Transition sound effects (gap filler)
6. Fallback transition system
7. P1 state machine (IDLE -> LISTENING -> GENERATING -> SPEAKING)
8. Live Host mode UI

### Phase 3: Audience Pulse (P2) + Dashboard (P5)
1. Database tables + RLS for audience data
2. Audience mobile page (`/audience/[eventId]`)
3. Poll creation UI in Script Lines page
4. Supabase Realtime subscriptions
5. `/api/poll-results` and `/api/announce-poll-results` endpoints
6. Live Dashboard page (`/dashboard/[eventId]`)
7. Dashboard real-time data bindings
8. QR code generation

### Phase 4: Polish & Demo Prep
1. UI polish (animations, dark theme for dashboard)
2. Transition sound effects library
3. End-to-end testing with simulated event
4. Demo script rehearsal
5. Edge case handling and error states

---

## 11. Open Questions / Risks

1. **P1 Latency (HIGHEST RISK):** The live transition pipeline must complete in < 5s. Phase 0 validates this. If it fails, we fall back to pre-generated transitions only (still a viable product, just less "wow").
2. **Ark API Key:** User needs to create an Ark platform account and generate an API key separately from the TTS credentials.
3. **Web Speech API reliability:** Browser-native ASR may stop or stall. Need reconnection logic and clear UI indicator when ASR is not working.
4. **Supabase Realtime connection limits:** Free tier may limit concurrent WebSocket connections. Need to verify this supports the expected audience size for the demo.
5. **TTS rate limits:** Batch generation + live transitions may hit rate limits. Need request queuing with retry.
6. **Long text TTS:** Doubao TTS may have character limits per request. Long script lines may need to be split.
7. **Audience page abuse:** Anonymous endpoints need rate limiting to prevent spam votes/reactions.
