# AI Host - Feature Innovation Proposals

**Version:** 1.0
**Date:** 2026-03-14
**Context:** Hackathon submission -- need to differentiate from "just a TTS player"

---

## The Core Problem

The current feature set (upload agenda -> generate script -> pick voice -> TTS -> play) is essentially a **text-to-speech pipeline with a nice UI**. It lacks the qualities that make someone feel like there is an actual AI *host* running the event. A real host:

- **Reads the room** and adapts in real time
- **Bridges segments** with awareness of what just happened and what comes next
- **Engages the audience** rather than just broadcasting at them
- **Handles the unexpected** -- late speakers, technical delays, audience questions
- **Adds personality** -- humor, warmth, pacing, energy

The features below aim to close this gap.

---

## Feature Proposals

### P1: Live Transition Intelligence (Real-time Bridging)

**What:** Instead of playing pre-generated audio clips, the AI listens to the current speaker via ASR, understands the key points in real time, and *dynamically generates* a transition line that references what the speaker actually said before introducing the next segment.

**Example:** After a speaker finishes talking about climate change, instead of a generic "Thank you, Speaker 1. Next up is Speaker 2", the AI says: "Thank you, Dr. Li -- that point about carbon credit markets was fascinating. Speaking of innovation, our next speaker, Zhang Wei, will show us how blockchain is tackling exactly this problem."

**How it works:**
1. Streaming ASR captures speaker's last 2-3 minutes
2. Doubao LLM summarizes key points in real time
3. LLM generates a contextual transition referencing the summary + next speaker's topic
4. TTS synthesizes and plays the transition

**Innovation:** HIGH -- This is what separates an AI host from a TTS player. No existing tool does this.
**Difficulty:** MEDIUM -- All components (ASR, LLM, TTS) already exist in our stack; the challenge is orchestrating them with low latency.
**Demo Impact:** HIGH -- This is the "wow moment" for judges. Seeing the AI reference something that was *just said* is deeply impressive.

---

### P2: Audience Pulse System (Real-time Engagement)

**What:** A live audience interaction layer where attendees scan a QR code to access a mobile web page. Through this page they can:
- Vote in real-time polls that the AI host announces
- Submit questions for speakers
- React with emoji/mood indicators
- Participate in icebreaker games the AI host runs

The AI host reads the room through this data and adapts: "I can see 73% of you found that surprising -- let's dig into why..."

**How it works:**
- Supabase Realtime subscriptions for live data sync
- Simple mobile-responsive web page (no app install)
- AI host references aggregated audience data in its commentary
- Doubao LLM generates natural language summaries of audience reactions

**Innovation:** HIGH -- Turns passive listeners into active participants through AI mediation.
**Difficulty:** MEDIUM -- Supabase Realtime + simple mobile page + LLM integration.
**Demo Impact:** HIGH -- Live audience interaction is visually impressive and tangible in a demo.

---

### P3: Adaptive Atmosphere Engine

**What:** The AI detects the "energy level" of the event and dynamically adjusts its hosting style:
- **Cold room detected** (long silence, low audience engagement scores) -> AI inserts a warming interaction: "Before we move on, let's do a quick show of hands -- who here has actually tried this technology?"
- **High energy detected** (applause, laughter in ASR) -> AI matches the energy: "What an incredible demo! I think we all felt that one."
- **Running late** -> AI tightens transitions and politely manages time: "We're running a bit behind schedule, so let's jump right into our next segment."

**How it works:**
- Silence duration tracking from ASR stream
- Audience Pulse data (if P2 is implemented)
- Event timeline comparison (scheduled vs. actual time)
- LLM generates atmosphere-appropriate responses with style/emotion parameters passed to TTS

**Innovation:** HIGH -- Truly adaptive behavior is what makes it feel "alive."
**Difficulty:** MEDIUM -- Mostly LLM prompt engineering + time tracking logic.
**Demo Impact:** HIGH -- Demonstrating the AI reacting to a simulated "cold room" vs "excited crowd" is very compelling.

---

### P4: Smart Q&A Moderator

**What:** After each speaker segment, the AI host:
1. Generates 2-3 intelligent questions based on the speech content (via LLM analysis of ASR transcript)
2. Collects audience questions via the Audience Pulse system (P2) or a text input
3. AI ranks/filters questions by relevance and deduplication
4. Reads out the best questions in a natural hosting voice
5. Optionally summarizes the speaker's answer after they respond

**Example:** "Great talk, Dr. Wang. I noticed you mentioned the 30% efficiency improvement -- our audience is curious: does that account for the initial setup costs? And we also have a popular question from the crowd: 'How does this compare to the European approach?'"

**Innovation:** MEDIUM -- Q&A moderation exists, but AI-generated questions from live content are novel.
**Difficulty:** MEDIUM -- ASR transcript -> LLM question generation -> TTS. Straightforward pipeline.
**Demo Impact:** HIGH -- Shows deep content understanding, not just text-to-speech.

---

### P5: Live Event Dashboard with Visual Cues

**What:** A presenter/large-screen view that shows:
- Current segment with countdown timer
- Real-time transcript of the current speaker (rolling subtitles)
- Audience engagement metrics (from P2)
- Next-up preview card
- AI host "status" indicator (listening / generating / speaking)
- Timeline progress bar with completed/active/upcoming segments

This transforms the tool from a backend audio player into a **visible event control center**.

**How it works:**
- Next.js page optimized for large screen display
- Supabase Realtime for live data updates
- Clean, professional UI with animations
- Can be projected onto the venue's main screen

**Innovation:** MEDIUM -- Dashboard concepts exist, but combining AI host status with live data is fresh.
**Difficulty:** LOW-MEDIUM -- Primarily frontend work with data we already have.
**Demo Impact:** HIGH -- Judges can see everything at a glance. Visual polish = perceived product maturity.

---

### P6: Multi-language Live Translation Host

**What:** The AI host can simultaneously operate in multiple languages. When it speaks in Chinese, a translated version is available in English (and vice versa) -- either as:
- A second audio stream attendees can listen to via the mobile web page
- Live subtitles on the dashboard screen
- Or both

**How it works:**
- Doubao LLM translates the host script or generated transition text
- TTS generates audio in the target language using a matching voice
- Supabase Realtime pushes translated text/audio to attendees who selected a different language

**Innovation:** MEDIUM -- Translation tools exist, but built into an AI host flow is a nice integration.
**Difficulty:** MEDIUM -- LLM translation + separate TTS calls. Main challenge is latency.
**Demo Impact:** MEDIUM-HIGH -- International appeal, but harder to demo meaningfully in a short presentation.

---

### P7: Post-Event Intelligence Report

**What:** After the event ends, the AI automatically generates:
- Full event transcript (from ASR)
- Executive summary of each speaker's key points
- Audience engagement analytics (peaks, drops, popular questions)
- Highlight moments (highest audience reactions)
- Suggested follow-up actions and takeaways
- Shareable event recap page with embedded audio highlights

**How it works:**
- ASR transcript stored during event
- Doubao LLM generates structured summary
- Audience Pulse data aggregated into charts
- Auto-generated static page or PDF

**Innovation:** MEDIUM -- Post-event summaries exist, but auto-generated from live AI host data is added value.
**Difficulty:** LOW-MEDIUM -- Mostly LLM summarization + data visualization.
**Demo Impact:** MEDIUM -- Valuable but less visually exciting in a live demo than real-time features.

---

### P8: Human-AI Co-Host Mode

**What:** Instead of fully replacing the human host, the AI acts as an intelligent co-host:
- Human host wears an earpiece; AI whispers cues, stats, and reminders
- AI handles the "mechanical" parts (introductions, time announcements, sponsor mentions) while human handles emotional/ad-lib moments
- Split-screen dashboard: human host sees upcoming AI-suggested lines and can approve/edit/skip in real time
- "Teleprompter mode": AI generates suggested lines that the human host can read or improvise from

**How it works:**
- Real-time cue cards pushed to a mobile/tablet interface
- Human host taps "approve" to trigger AI TTS, or reads it themselves
- AI tracks which segments the human covered and fills gaps

**Innovation:** HIGH -- "Human-AI collaboration" is a stronger narrative than "AI replaces human."
**Difficulty:** MEDIUM -- Mainly a different UI mode with approval workflow.
**Demo Impact:** HIGH -- Demonstrates a practical, non-threatening use case that judges can relate to.

---

### P9: Voice Cloning for Brand Consistency

**What:** Using Doubao's voice cloning API (`volcano_icl` cluster), event organizers can clone a specific person's voice (e.g., the company CEO, a brand ambassador) so the AI host sounds like a familiar, trusted voice rather than a generic TTS voice.

**How it works:**
- User uploads 3-5 minutes of reference audio
- Doubao Voice Clone API creates a custom voice model
- Custom voice is used for all TTS generation in the event
- Stored per-event or per-organization

**Innovation:** MEDIUM -- Voice cloning exists but integrating it into an event host workflow is practical.
**Difficulty:** LOW -- Doubao already provides this API (`volcano_icl` cluster, voice cloning endpoint).
**Demo Impact:** MEDIUM -- Cool tech but harder to demo quickly unless you have a recognizable voice to clone.

---

### P10: Rehearsal Mode with AI Feedback

**What:** Before the actual event, the organizer can run a full rehearsal where:
- AI simulates the entire event flow end-to-end
- AI gives feedback on pacing, transition quality, and script tone
- Identifies potential timing issues (segment too long, not enough buffer between speakers)
- Suggests improvements to script lines
- Generates a rehearsal report with recommendations

**How it works:**
- Run through all script lines with TTS playback
- LLM analyzes the flow for pacing and coherence
- Timer comparison against scheduled event timeline
- LLM generates a critique/improvement report

**Innovation:** MEDIUM -- Rehearsal is a natural extension but AI feedback on hosting quality is novel.
**Difficulty:** LOW -- Primarily LLM prompt engineering on existing data.
**Demo Impact:** MEDIUM -- Practical but not as exciting as live features.

---

## Recommended Priority for Hackathon

Based on the matrix of **Innovation x Difficulty x Demo Impact**, here are the top 5 features to implement:

### Tier 1: Must-Have (Build These)

| # | Feature | Innovation | Difficulty | Demo Impact | Why |
|---|---------|-----------|------------|-------------|-----|
| P1 | Live Transition Intelligence | HIGH | MEDIUM | HIGH | **The single most impressive feature.** This is the "wow moment" that proves the AI is actually *hosting*, not just playing audio. Build this first. |
| P2 | Audience Pulse System | HIGH | MEDIUM | HIGH | **Tangible live interaction.** Judges can participate in the demo. QR code -> vote -> AI mentions the result = unforgettable. |
| P5 | Live Event Dashboard | MEDIUM | LOW-MED | HIGH | **Visual polish wins hackathons.** A beautiful real-time dashboard makes everything else look more impressive. |

### Tier 2: High Value If Time Permits

| # | Feature | Innovation | Difficulty | Demo Impact | Why |
|---|---------|-----------|------------|-------------|-----|
| P3 | Adaptive Atmosphere Engine | HIGH | MEDIUM | HIGH | Can be simplified: just detect silence duration + scheduled time vs actual time. Even a basic version is impressive. |
| P8 | Human-AI Co-Host Mode | HIGH | MEDIUM | HIGH | Strong narrative for judges: "AI augments humans, doesn't replace them." Can be demoed with a team member as the human host. |

### Tier 3: Nice-to-Have

| # | Feature | Innovation | Difficulty | Demo Impact | Why |
|---|---------|-----------|------------|-------------|-----|
| P4 | Smart Q&A Moderator | MEDIUM | MEDIUM | HIGH | Good demo moment but depends on P2 being built first. |
| P7 | Post-Event Report | MEDIUM | LOW-MED | MEDIUM | Good for the "complete product" narrative but less exciting live. |
| P10 | Rehearsal Mode | MEDIUM | LOW | MEDIUM | Quick to build, adds product depth. |

### Deprioritize for Hackathon

| # | Feature | Reason |
|---|---------|--------|
| P6 | Multi-language Translation | High latency challenge, hard to demo briefly |
| P9 | Voice Cloning | Requires pre-recorded audio, setup time in demo |

---

## Hackathon Demo Script (Suggested Flow)

A winning demo tells a story. Here is a suggested 5-minute demo flow:

**1. Setup (30s):**
"We built AI Host -- an AI that doesn't just read scripts, it actually *hosts* your event."

**2. Upload & Generate (45s):**
Upload a photo of an event agenda -> AI understands it -> generates a full host script with timeline. Show the script lines page.

**3. Voice Selection & Preview (30s):**
Pick a voice, preview it. Quick and clean.

**4. The Wow Moment -- Live Hosting (2 min):**
Start the event. A team member "gives a short talk" (30 seconds). The AI:
- Listens via ASR
- Generates a contextual transition that references what was just said (P1)
- Speaks it with natural TTS
- Dashboard shows real-time status (P5)

**5. Audience Interaction (1 min):**
Show the QR code. Judges scan it. Run a quick poll. AI announces: "I see 4 out of 5 of you chose option B -- interesting! Let's explore why..."

**6. Close (15s):**
"AI Host: from script to stage, your event's smartest co-host."

---

## Technical Feasibility Notes

All proposed features are buildable with our current stack:

| Component | Used By |
|-----------|---------|
| Doubao LLM (Ark API) | P1, P2, P3, P4, P6, P7, P8, P10 |
| Doubao TTS 2.0 | P1, P3, P4, P6, P8, P9 |
| Streaming ASR (Web Speech API or Volcano) | P1, P3, P4 |
| Supabase Realtime | P2, P5 |
| Supabase Database | All features |
| Next.js frontend | P2, P5, P8 |

**Critical path for the hackathon:** The LLM-to-TTS pipeline latency. For P1 (Live Transition Intelligence), the total time from "speaker stops" to "AI host speaks" needs to be under 5-8 seconds:
- ASR finalization: ~1s
- LLM generation (streaming): ~2-3s
- TTS generation: ~1-2s
- Audio playback start: ~0.5s

This is achievable with streaming LLM output piped to TTS, and is the most important technical challenge to solve.
