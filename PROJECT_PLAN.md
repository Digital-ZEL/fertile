# 🎯 Project: Fertile (Unified Fertility Intelligence)

**Created:** February 5, 2026  
**Status:** Planning  
**Owner:** Khiry (Digital_Zel)

---

## The Core Problem We're Solving

Women track in 3+ apps, get 3 different fertile windows, and don't know which to trust. We reconcile their data and give them ONE confident answer.

---

## 📋 PHASE 1: FOUNDATION (Day 1)

### 1.1 GitHub Repo Setup

```
fertile/
├── README.md           # What, why, how
├── docs/
│   ├── PRD.md         # Product requirements
│   ├── ARCHITECTURE.md # Technical design
│   └── COMPETITORS.md  # What others do wrong
├── app/               # Next.js app
├── lib/               # Core logic
│   ├── parsers/       # Import parsers for each app
│   └── reconciler/    # The algorithm
└── tests/
```

### 1.2 Technical Stack Decision

| Component | Choice           | Why                      |
| --------- | ---------------- | ------------------------ |
| Framework | Next.js 14       | Fast, free Vercel deploy |
| Database  | None (MVP)       | User data stays local    |
| Auth      | None (MVP)       | No accounts needed       |
| Hosting   | Vercel free tier | $0/month                 |

### 1.3 MVP Scope (IN vs OUT)

**IN (Must have for launch):**

- [ ] Manual data entry (dates, temps, symptoms)
- [ ] Import from 1 app (Fertility Friend CSV export)
- [ ] Reconciliation algorithm (simple: weighted average)
- [ ] Confidence score display
- [ ] Mobile-responsive UI

**OUT (Post-launch):**

- Partner sync
- Automatic app imports
- Wearable integration
- AI predictions
- User accounts

---

## 📋 PHASE 2: BUILD (Days 2-4)

### 2.1 Core Algorithm (The Secret Sauce)

```
Input: Multiple fertile window predictions
Output: Single confidence-scored prediction

Logic:
1. Normalize all dates to same format
2. Calculate overlap zones
3. Weight by: app reliability + user's historical accuracy
4. Output: "Fertile window: Jan 15-20 (87% confidence)"
```

### 2.2 UI Screens (3 total)

**Screen 1: Data Entry**

- Add cycle start date
- Enter temps (optional)
- Enter symptoms (optional)
- Import FF CSV

**Screen 2: Dashboard**

- Current cycle day
- Unified fertile window
- Confidence score with explanation
- Calendar view

**Screen 3: Compare**

- Side-by-side: "What App X says vs App Y vs Our prediction"
- Visual showing where apps agree/disagree

### 2.3 Key Milestones

- [ ] Day 2: Data entry + basic storage working
- [ ] Day 3: Reconciliation algorithm + confidence scoring
- [ ] Day 4: UI polish + mobile responsive

---

## 📋 PHASE 3: DEPLOY + VALIDATE (Day 5)

### 3.1 Launch Checklist

- [ ] Deploy to Vercel (fertile.vercel.app or custom domain)
- [ ] Screenshot key flows
- [ ] Write Reddit post draft
- [ ] Test on real device

### 3.2 Validation Post (r/TryingForABaby)

**Title:** "I built a free tool that reconciles predictions from multiple fertility apps - would love feedback"

**Body:**

> Like many of you, I was frustrated that Fertility Friend, Clue, and Flo all gave me different fertile windows. So I built a simple tool that takes your data and gives you ONE unified prediction with a confidence score.
>
> It's free, no account needed, your data stays on your device.
>
> Would love feedback from this community: [link]
>
> What features would make this actually useful for you?

### 3.3 Success Metrics (Week 1)

| Metric             | Target | How to Measure         |
| ------------------ | ------ | ---------------------- |
| Visitors           | 500+   | Vercel Analytics       |
| Feedback comments  | 20+    | Reddit thread          |
| Feature requests   | 10+    | Track in GitHub Issues |
| "I'd pay for this" | 3+     | Reddit comments        |

---

## 📋 PHASE 4: ITERATE OR KILL (Week 2+)

### If Validation Succeeds (3+ payment signals):

1. Add Stripe for $29/year premium
2. Build import for 2nd app (Clue)
3. Add partner sync
4. Consider ClawHub skill version

### If Validation Fails:

1. Pivot to working moms (21/25 score)
2. Or pivot to different fertility angle (partner sync only)
3. Document learnings

---

## ⚠️ RISK MITIGATION

| Risk                 | Mitigation                                             |
| -------------------- | ------------------------------------------------------ |
| Medical liability    | Disclaimer: "Not medical advice, for tracking only"    |
| Competition responds | Move fast, ship in 5 days                              |
| No adoption          | Validate on Reddit BEFORE adding features              |
| Scope creep          | Ruthless MVP — if it's not in the list, it's not in v1 |

---

## 💰 COST BREAKDOWN

| Item              | Cost           |
| ----------------- | -------------- |
| Vercel hosting    | $0 (free tier) |
| Domain (optional) | $12/year       |
| Your time         | 10-15 hours    |
| AI assistance     | Unlimited 🤖   |
| **Total**         | **~$0-12**     |

---

## 🤔 DECISION POINTS

1. **Domain:** fertile.app? fertileai.com? Or just use vercel subdomain for MVP?
2. **Timeline:** 5 days aggressive, 10 days comfortable — which pace?
3. **First app to support:** Fertility Friend (most data-rich) or Flo (most users)?
4. **Your involvement:**
   - Option A: AI builds, you review/approve
   - Option B: Pair-program (you watch, AI codes)
   - Option C: AI specs, you build

---

## 📊 RESEARCH BACKING

**Source:** MVP Vibe Coder Agent Swarm Research (Feb 5, 2026)

**Pain Score:** 22/25 (Highest of 3 niches tested)

**Key Evidence:**

> "I've been using the Ava bracelet for a few months now... they are predicting my ovulation/fertile dates as WILDLY different." — r/TTC30

> "I'm willing to pay for it, but always looking to save a buck!" — r/FAMnNFP

**Payment Signals:**

- Users spending $200-300 on Tempdrop/Ava hardware
- Paying £19-100/year for existing fertility apps
- Explicit "I'm willing to pay" statements found

---

## 🚀 NEXT ACTIONS

- [ ] Confirm go/no-go decision
- [ ] Answer decision points above
- [ ] Create GitHub repo
- [ ] Begin Phase 1

---

_Plan created by OpenClaw | Ready to execute on command_
