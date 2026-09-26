import type { BehavioralQuestion } from "./types";

export const BEHAVIORAL: BehavioralQuestion[] = [
  {
    id: "bq-technical-disagreement",
    prompt:
      "Tell me about a time you disagreed with a teammate or tech lead about a technical decision. How did you handle it, and what happened?",
    competency: "Collaboration & conflict",
    followUps: [
      "What data or prototype did you use to make your case?",
      "If you had lost the argument, how would you have committed to the other approach?",
      "How did the working relationship look a month later?",
    ],
    lookFor: [
      "Frames the disagreement around the problem, not the person",
      "Uses data, benchmarks, or a prototype to resolve it",
      "Shows disagree-and-commit maturity",
      "Clear outcome and a concrete lesson",
    ],
    redFlags: [
      "Blames or belittles the other person",
      "Only 'we' — no personal actions",
      "No resolution or measurable outcome",
      "Treats winning the argument as the goal",
    ],
  },
  {
    id: "bq-production-incident-ownership",
    prompt:
      "Tell me about a time something you owned broke in production. What did you do in the first hour, and what changed afterward?",
    competency: "Ownership & accountability",
    followUps: [
      "How did you decide between rolling back and fixing forward?",
      "What did you change so this class of bug can't happen again?",
      "How did you communicate with stakeholders while it was down?",
    ],
    lookFor: [
      "Owns the mistake without deflecting",
      "Mitigates first (rollback, feature flag), then root-causes",
      "Quantifies impact: users, duration, revenue, error rate",
      "Systemic follow-up: tests, alerts, runbooks, blameless postmortem",
    ],
    redFlags: [
      "Blames QA, ops, or another team",
      "Hero narrative with no prevention",
      "Cannot quantify impact",
      "Hid the issue or delayed escalation",
    ],
  },
];
