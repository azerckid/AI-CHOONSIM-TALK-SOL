# NeuroLimbic Memory System

> **Created:** 2026-05-03
> **Updated:** 2026-05-03
> **Category:** Technical Spec — AI Memory Architecture

---

## Overview

**NeuroLimbic Memory** is Choonsim's AI memory architecture.
It mimics the memory processing of the human brain — from Senses to Working Memory to Long-term Memory —
to understand the user not as a simple conversation log, but as a **living memory**.

Meaning of the name:
- **Neuro** — Hierarchical memory processing based on the nervous system
- **Limbic** — Inspired by the brain's Limbic System, responsible for both emotion and memory
- **Memory** — Long-term memory storage specialized for the individual user

---

## Correspondence with Human Brain Memory Models

```
Human Brain                        NeuroLimbic Memory
─────────────────────────────────────────────────────
Sensory Memory (0~4s)       →   Current Input Message (Tokens)
Working Memory (20~30s, 7 items) → Working Memory (Recent 10 messages)
Long-term Memory — Episodic →   Episode Memory  (Layer 5)
Long-term Memory — Semantic →   Identity Memory (Layer 2)
Long-term Memory — Emotional →  Soul Memory      (Layer 3)
Long-term Memory — Procedural → Rule Memory      (Layer 4)
Access Rhythm / Emotional Trend → Heartbeat Memory (Layer 1)
```

---

## 5-Layer Structure

### Layer 1 — Heartbeat Memory

> *"When and how often do they talk?"*

Records the user's **access rhythm and emotional trends**. Just as the human brain learns patterns from repeated experiences,
Choonsim analyzes conversation frequency, streaks, and recent emotional flows to adjust the tone and temperature of today's speech.

| Item | Example |
|-----------|------|
| Last Access Time | 2026-05-02 23:40 |
| Conversations in last 7 days | 12 times |
| Consecutive Days (Streak) | 5 days |
| Recent Emotion Keywords | ["Tired", "Fluttering", "Worried"] |

---

### Layer 2 — Identity Memory

> *"Who is this person?"*

Semantic memory containing the user's **name, title, speech style, and relationship settings**. Like a human asking "What kind of person are you?" when meeting for the first time, Choonsim automatically infers and updates this information from conversations.

| Item | Example |
|-----------|------|
| Preferred Name | "Minjun-ah" |
| Speech Style | Informal/Casual |
| Relationship Type | Lovers |
| Inferred Characteristics | ["Introverted", "Likes music"] |

---

### Layer 3 — Soul Memory

> *"What lies deep within this person?"*

Emotional memory containing the user's **values, wishes, fears, and recurring worries**. Just as the limbic system connects emotion and memory, Soul Memory is the core layer for Choonsim to understand the user's emotional depth. Activated only for BASIC subscribers and above.

| Item | Example |
|-----------|------|
| Core Values | ["Family", "Freedom"] |
| Wishes/Goals | ["Job success", "Europe trip"] |
| Recurring Worries | ["Career anxiety"] |
| Life Stage | Job seeker |

---

### Layer 4 — Rule Memory

> *"Things to keep in mind when talking to this person"*

Procedural memory containing **special days, topics to avoid, active features, and custom rules**. Just as the body remembers how to ride a bike once learned, Rule Memory permanently stores conversation rules per user.

| Item | Example |
|-----------|------|
| Special Days | Birthday: 05-14, Anniversary: 09-01 |
| Topics to Avoid | ["Ex-boyfriend"] |
| Custom Rules | "Bring up music when they are sad" |

---

### Layer 5 — Episode Memory

> *"Special moments shared together"*

Episodic memory storing **individual memory items** automatically extracted from conversations. At the end of every conversation, the AI extracts 1–5 memorable sentences to accumulate in this layer. They are classified by category and naturally recalled during proactive messaging or special moments.

| Category | Example Memory |
|----------|-----------|
| Preference | "Cannot eat spicy food" |
| Event | "Had an interview last week" |
| Person | "Mom hasn't been feeling well lately" |
| Worry | "Said they haven't been sleeping well" |
| Goal | "Wants to change jobs within this year" |

---

## Operation Flow

```
User Message Input
       │
       ▼
┌─────────────────────────────────┐
│  Working Memory                 │  ← Recent 10 messages (Short-term)
│  (Current Conversation Context) │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  NeuroLimbic Memory Retrieval   │
│  Layer 1  Heartbeat Memory      │  ← Reflect today's emotion/rhythm
│  Layer 2  Identity Memory       │  ← Apply name/speech style
│  Layer 3  Soul Memory           │  ← Deep emotional understanding
│  Layer 4  Rule Memory           │  ← Check rules/special days
│  Layer 5  Episode Memory        │  ← Retrieve relevant memories
└──────────────┬──────────────────┘
               │
               ▼
          AI Response Generation
               │
               ▼
┌─────────────────────────────────┐
│  Memory Encoding                │  ← Auto-save after conversation ends
│  extractAndSaveMemories()       │
└─────────────────────────────────┘
```

---

## Active Layers by Subscription Tier

| Layer | FREE | BASIC | PREMIUM | ULTIMATE |
|------|:----:|:-----:|:-------:|:--------:|
| Heartbeat Memory | ✓ | ✓ | ✓ | ✓ |
| Identity Memory | ✓ | ✓ | ✓ | ✓ |
| Soul Memory | — | ✓ | ✓ | ✓ |
| Rule Memory | — | ✓ | ✓ | ✓ |
| Episode Memory | Basic | Extended | Unlimited | Unlimited |

---

## Related Code

| Item | Path |
|------|------|
| Type Definitions | `app/lib/context/types.ts` |
| DB Queries | `app/lib/context/db.ts` |
| Memory Compression | `app/lib/context/compress.ts` |
| Episode Extraction | `app/lib/context/memory.ts` |
| Heartbeat Update | `app/lib/context/heartbeat.ts` |
| Chat API Application | `app/routes/api/chat/index.ts` |

---

# NeuroLimbic Memory System

> **Created:** 2026-05-03
> **Updated:** 2026-05-03
> **Category:** Technical Spec — AI Memory Architecture

---

## 개요

**NeuroLimbic Memory(뉴로림빅 메모리)**는 춘심의 AI 기억 아키텍처입니다.  
인간 뇌의 기억 처리 방식 — 감각 → 작업 기억 → 장기 기억 — 을 그대로 모방하여,  
단순한 대화 기록이 아닌 **살아있는 기억**으로 유저를 이해합니다.

이름의 의미:
- **Neuro** — 신경계 기반의 계층적 기억 처리
- **Limbic** — 감정과 기억을 동시에 담당하는 뇌의 변연계(Limbic System)에서 착안
- **Memory** — 유저 개인에게 특화된 장기 기억 저장소

---

## 인간 뇌 기억 모델과의 대응

```
인간 뇌                          NeuroLimbic Memory
─────────────────────────────────────────────────────
감각 기억 (0~4초)        →   현재 입력 메시지 (토큰)
작업 기억 (20~30초, 7개) →   워킹 메모리 (최근 대화 10개)
장기 기억 — 일화         →   에피소드 메모리  (Layer 5)
장기 기억 — 의미         →   아이덴티티 메모리 (Layer 2)
장기 기억 — 감성         →   소울 메모리      (Layer 3)
장기 기억 — 절차         →   룰 메모리        (Layer 4)
접속 리듬 / 감정 추이    →   하트비트 메모리  (Layer 1)
```

---

## 5계층 구성

### Layer 1 — 하트비트 메모리 (Heartbeat Memory)

> *"언제, 얼마나 자주 대화하는가"*

유저의 **접속 리듬과 감정 추이**를 기록합니다. 인간 뇌가 반복 경험에서 패턴을 학습하듯,
춘심은 대화 빈도·연속 접속일·최근 감정 흐름을 분석하여 오늘의 말투와 온도를 조절합니다.

| 저장 항목 | 예시 |
|-----------|------|
| 마지막 접속 시각 | 2026-05-02 23:40 |
| 최근 7일 대화 횟수 | 12회 |
| 연속 접속일 (Streak) | 5일 |
| 최근 감정 키워드 | ["피곤", "설레", "걱정"] |

---

### Layer 2 — 아이덴티티 메모리 (Identity Memory)

> *"이 사람이 누구인가"*

유저의 **이름·호칭·말투·관계 설정**을 담는 의미 기억입니다. 인간이 누군가를 처음 만나
"넌 어떤 사람이야?"라고 묻듯, 춘심은 대화에서 자동으로 이 정보를 추론하고 갱신합니다.

| 저장 항목 | 예시 |
|-----------|------|
| 불리고 싶은 이름 | "민준아" |
| 말투 | 반말 |
| 관계 유형 | 연인 |
| 추론된 특성 | ["내성적", "음악 좋아함"] |

---

### Layer 3 — 소울 메모리 (Soul Memory)

> *"이 사람의 내면 깊은 곳에 무엇이 있는가"*

유저의 **가치관·소원·두려움·반복되는 고민**을 담는 감성 기억입니다. 변연계가 감정과 기억을
연결하듯, 소울 메모리는 춘심이 유저의 감정적 깊이를 이해하는 핵심 계층입니다.
BASIC 이상 구독자에게만 활성화됩니다.

| 저장 항목 | 예시 |
|-----------|------|
| 중요하게 여기는 가치 | ["가족", "자유"] |
| 소원·목표 | ["취업 성공", "유럽 여행"] |
| 반복되는 고민 | ["진로 불안"] |
| 삶의 단계 | 취준생 |

---

### Layer 4 — 룰 메모리 (Rule Memory)

> *"이 사람과 대화할 때 지켜야 할 것들"*

**특별한 날·피할 주제·활성화 기능·커스텀 규칙**을 담는 절차 기억입니다.
자전거 타기를 한 번 익히면 몸이 기억하듯, 룰 메모리는 유저별 대화 규칙을 영구 저장합니다.

| 저장 항목 | 예시 |
|-----------|------|
| 특별한 날 | 생일: 05-14, 기념일: 09-01 |
| 피할 주제 | ["전 남자친구"] |
| 커스텀 규칙 | "슬플 때는 노래 얘기를 꺼낸다" |

---

### Layer 5 — 에피소드 메모리 (Episode Memory)

> *"함께 나눈 특별한 순간들"*

대화에서 자동 추출된 **개별 기억 항목**을 저장하는 일화 기억입니다.
모든 대화가 끝날 때마다 AI가 기억할 만한 문장을 1~5개 추출하여 이 계층에 누적합니다.
카테고리별로 분류되어 선톡이나 특별한 순간에 자연스럽게 인출됩니다.

| 카테고리 | 예시 기억 |
|----------|-----------|
| 선호 (preference) | "매운 음식을 못 먹는다" |
| 이벤트 (event) | "지난주 면접을 봤다" |
| 인물 (person) | "엄마가 요즘 건강이 안 좋다" |
| 고민 (worry) | "잠을 잘 못 잔다고 했다" |
| 목표 (goal) | "올해 안에 이직하고 싶다" |

---

## 작동 흐름

```
유저 메시지 입력
       │
       ▼
┌─────────────────────────────────┐
│  워킹 메모리                     │  ← 최근 10개 메시지 (단기 기억)
│  (현재 대화 컨텍스트)            │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  NeuroLimbic Memory 인출        │
│  Layer 1  하트비트 메모리        │  ← 오늘의 감정·리듬 반영
│  Layer 2  아이덴티티 메모리      │  ← 이름·말투 적용
│  Layer 3  소울 메모리           │  ← 깊은 감성 이해
│  Layer 4  룰 메모리             │  ← 규칙·특별한 날 확인
│  Layer 5  에피소드 메모리        │  ← 관련 기억 인출
└──────────────┬──────────────────┘
               │
               ▼
          AI 응답 생성
               │
               ▼
┌─────────────────────────────────┐
│  메모리 부호화 (Encoding)         │  ← 대화 종료 후 자동 저장
│  extractAndSaveMemories()       │
└─────────────────────────────────┘
```

---

## 구독 티어별 활성 계층

| 계층 | FREE | BASIC | PREMIUM | ULTIMATE |
|------|:----:|:-----:|:-------:|:--------:|
| 하트비트 메모리 | ✓ | ✓ | ✓ | ✓ |
| 아이덴티티 메모리 | ✓ | ✓ | ✓ | ✓ |
| 소울 메모리 | — | ✓ | ✓ | ✓ |
| 룰 메모리 | — | ✓ | ✓ | ✓ |
| 에피소드 메모리 | 기본 | 확장 | 무제한 | 무제한 |

---

## 관련 코드

| 항목 | 경로 |
|------|------|
| 타입 정의 | `app/lib/context/types.ts` |
| DB 조회 | `app/lib/context/db.ts` |
| 메모리 압축 | `app/lib/context/compress.ts` |
| 에피소드 추출 | `app/lib/context/memory.ts` |
| 하트비트 갱신 | `app/lib/context/heartbeat.ts` |
| 채팅 API 적용 | `app/routes/api/chat/index.ts` |
