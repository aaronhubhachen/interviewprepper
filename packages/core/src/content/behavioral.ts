import type { BehavioralQuestion } from "./types";

/**
 * Behavioral sparring bank. followUps[0] is the default probe when the LLM is
 * unavailable, so it should be the strongest generic follow-up for the question.
 * lookFor / redFlags feed the Engineering-Manager feedback prompt.
 */
export const BEHAVIORAL: BehavioralQuestion[] = [
  {
    id: "bq-technical-disagreement",
    prompt:
      "Tell me about a time you disagreed with a teammate or tech lead about an architecture or design decision. How did you handle it, and what happened?",
    competency: "Collaboration & conflict",
    followUps: [
      "What data, benchmark, or prototype did you use to make your case?",
      "If the decision had gone the other way, how would you have committed to it?",
      "How did the working relationship look a month later?",
    ],
    lookFor: [
      "Frames the disagreement around trade-offs and the problem, not the person",
      "Resolves it with evidence: data, benchmarks, a spike, or a design doc",
      "Genuinely steelmans the other option before arguing against it",
      "Shows disagree-and-commit maturity once a decision is made",
      "Clear outcome plus a concrete lesson",
    ],
    redFlags: [
      "Blames or belittles the other person",
      "Treats winning the argument as the goal",
      "Only 'we', with no personal actions",
      "No resolution or measurable outcome",
    ],
  },
  {
    id: "bq-failure",
    prompt:
      "Tell me about a time you failed at work or on a project. What happened, what was your part in it, and what do you do differently now?",
    competency: "Self-awareness & growth",
    followUps: [
      "Looking back, what was the earliest signal you missed?",
      "What specifically is different about how you work today because of it?",
      "How did you tell the people affected?",
    ],
    lookFor: [
      "Picks a real failure with real stakes, not a humblebrag",
      "Owns their specific part without deflecting to others or circumstances",
      "Explains the root cause, not just the symptoms",
      "Names a concrete, lasting change in behavior or process",
    ],
    redFlags: [
      "Disguised strength ('I just care too much')",
      "Blames teammates, management, or bad luck",
      "No lesson, or a vague one ('communicate better')",
      "Can't name their own contribution to what went wrong",
    ],
  },
  {
    id: "bq-ambiguity",
    prompt:
      "Tell me about a time you were handed a problem with vague or missing requirements. How did you figure out what to build?",
    competency: "Navigating ambiguity",
    followUps: [
      "Which assumptions did you make, and how did you validate them?",
      "How did you decide when you knew enough to start building?",
      "What would you have done if the stakeholders had disagreed with each other?",
    ],
    lookFor: [
      "Actively clarifies the goal with users or stakeholders instead of waiting",
      "Writes down assumptions and open questions and gets them confirmed",
      "Ships a small slice or prototype early to reduce uncertainty",
      "Adjusts the plan as new information arrives",
    ],
    redFlags: [
      "Waits for someone to hand them a full spec",
      "Builds for weeks on unvalidated assumptions",
      "Blames the requirements when the result misses",
    ],
  },
  {
    id: "bq-ownership-beyond-scope",
    prompt:
      "Tell me about a time you took ownership of a problem that wasn't officially yours. Why did you step in, and what was the result?",
    competency: "Ownership",
    followUps: [
      "How did you make sure you weren't stepping on the actual owner's toes?",
      "What did you drop or delay to make room for it?",
      "Is it still running well today, and who owns it now?",
    ],
    lookFor: [
      "Noticed a gap that hurt users or the team, not just a fun side project",
      "Acted without being asked, while looping in the rightful owners",
      "Saw it through to a durable outcome: docs, handoff, monitoring",
      "Quantifies the impact",
    ],
    redFlags: [
      "Hero story that bypasses or embarrasses the owning team",
      "Abandoned it halfway or created a new orphaned system",
      "Neglected their own commitments without telling anyone",
    ],
  },
  {
    id: "bq-influence-without-authority",
    prompt:
      "Tell me about a time you had to convince people who didn't report to you to change direction or adopt something. How did you get buy-in?",
    competency: "Influence without authority",
    followUps: [
      "Who was the hardest person to convince, and what finally moved them?",
      "What did you change in your proposal based on their pushback?",
      "How did you measure whether the change actually stuck?",
    ],
    lookFor: [
      "Understands what each stakeholder cares about and tailors the pitch",
      "Builds the case with data, a demo, or a pilot rather than opinion",
      "Incorporates feedback and gives others credit or co-ownership",
      "Measurable adoption or outcome",
    ],
    redFlags: [
      "Escalates to a manager as the first move",
      "Pushes through by persistence alone, ignoring objections",
      "Declares success without evidence of adoption",
    ],
  },
  {
    id: "bq-tight-deadline-scope-cut",
    prompt:
      "Tell me about a time you couldn't deliver everything by a hard deadline. How did you decide what to cut, and how did you communicate it?",
    competency: "Delivery & trade-offs",
    followUps: [
      "What did you explicitly refuse to cut, and why?",
      "When did you first raise the risk, and with whom?",
      "What happened to the work you cut?",
    ],
    lookFor: [
      "Flags the risk early instead of at the deadline",
      "Cuts by user impact and must-haves, not by what is easiest",
      "Protects quality basics such as tests, security, and data integrity",
      "Aligns stakeholders on the new scope and tracks the follow-up",
    ],
    redFlags: [
      "Silently drops scope or quality and hopes nobody notices",
      "Heroic all-nighters presented as the plan",
      "Misses the deadline and surprises stakeholders",
      "Cuts tests or monitoring as the default lever",
    ],
  },
  {
    id: "bq-disagree-with-manager",
    prompt:
      "Tell me about a time you disagreed with your manager's decision. What did you do, and how did it turn out?",
    competency: "Managing up",
    followUps: [
      "How did you raise it, and in what setting?",
      "What would you have done if they still said no?",
      "Did it change how you two work together?",
    ],
    lookFor: [
      "Raises the concern privately, respectfully, and with reasoning",
      "Seeks to understand the manager's context and constraints first",
      "Proposes an alternative or an experiment rather than just objecting",
      "Commits fully once the decision is final, or escalates appropriately if it is an ethical issue",
    ],
    redFlags: [
      "Complains to peers instead of talking to the manager",
      "Quietly ignores or undermines the decision",
      "Always defers, so there was never a real disagreement",
    ],
  },
  {
    id: "bq-mentoring",
    prompt:
      "Tell me about a time you helped a teammate grow, such as mentoring a new hire or unblocking someone who was struggling. What did you do, and what changed for them?",
    competency: "Mentorship & leadership",
    followUps: [
      "How did you adapt your approach to how they learn?",
      "How did you balance helping them with getting your own work done?",
      "What did they do independently afterward that showed the growth?",
    ],
    lookFor: [
      "Diagnoses the actual gap before prescribing help",
      "Teaches through questions, pairing, and gradually handing over ownership",
      "Gives specific, kind, actionable feedback",
      "Concrete evidence of growth in the other person",
    ],
    redFlags: [
      "Just did the work for them",
      "Condescending tone about the person",
      "Story is really about their own brilliance",
    ],
  },
  {
    id: "bq-hardest-technical-challenge",
    prompt:
      "What's the hardest technical problem you've worked on? Walk me through how you approached it and what you personally built.",
    competency: "Technical depth & problem solving",
    followUps: [
      "What alternatives did you consider, and why did you reject them?",
      "What was the trickiest bug or failure along the way, and how did you find it?",
      "If you rebuilt it today, what would you change?",
    ],
    lookFor: [
      "Explains why the problem was hard: scale, constraints, or ambiguity",
      "Clear personal contribution with concrete technical detail",
      "Discusses trade-offs and rejected alternatives",
      "Systematic debugging or measurement, not guesswork",
      "Quantified result such as latency, cost, reliability, or users",
    ],
    redFlags: [
      "Stays at buzzword level and can't go deeper when probed",
      "Only 'we', so their own role is unclear",
      "No trade-offs, as if there was only one possible design",
      "Problem is trivial for the level being hired",
    ],
  },
  {
    id: "bq-production-incident-ownership",
    prompt:
      "Tell me about a time something you owned broke in production or paged you on call. What did you do in the first hour, and what changed afterward?",
    competency: "Operational ownership",
    followUps: [
      "How did you decide between rolling back and fixing forward?",
      "What did you change so this class of bug can't happen again?",
      "How did you keep stakeholders updated while it was down?",
    ],
    lookFor: [
      "Mitigates first (rollback, feature flag, failover), then root-causes",
      "Owns the mistake without deflecting",
      "Quantifies impact: users, duration, error rate, revenue",
      "Communicates clearly during the incident",
      "Systemic follow-up: tests, alerts, runbooks, a blameless postmortem",
    ],
    redFlags: [
      "Blames QA, ops, or another team",
      "Hero narrative with no prevention work",
      "Can't quantify the impact",
      "Hid the issue or delayed escalating",
    ],
  },
  {
    id: "bq-customer-impact",
    prompt:
      "Tell me about a time you went out of your way to understand or fix a problem for a customer or end user. What did you learn, and what did you change?",
    competency: "Customer focus",
    followUps: [
      "How did you find out about the problem in the first place?",
      "How did you weigh this customer's need against the rest of the roadmap?",
      "How did you confirm the fix actually helped them?",
    ],
    lookFor: [
      "Goes to the source: talks to users, reads tickets, or checks usage data",
      "Separates the stated request from the underlying need",
      "Balances one customer's ask against the broader user base",
      "Measures the outcome after shipping",
    ],
    redFlags: [
      "Treats customers as an annoyance or as 'not my job'",
      "Builds whatever one loud customer asks for without judgment",
      "Never checks whether the change helped",
    ],
  },
  {
    id: "bq-prioritization",
    prompt:
      "Tell me about a time you had more important work than you could possibly do. How did you decide what to work on, and what did you say no to?",
    competency: "Prioritization",
    followUps: [
      "What framework or criteria did you use to rank the work?",
      "How did the people whose work you deprioritized react?",
      "Looking back, did you make the right calls?",
    ],
    lookFor: [
      "Ranks work by impact, urgency, and effort against team goals",
      "Makes trade-offs explicit and aligns with a manager or stakeholders",
      "Says no, or not now, clearly and with a reason",
      "Revisits priorities as things change",
    ],
    redFlags: [
      "Tries to do everything and burns out or misses everything",
      "Picks whatever is most fun or loudest",
      "Never communicated what was being dropped",
    ],
  },
  {
    id: "bq-tough-feedback",
    prompt:
      "Tell me about the toughest piece of feedback you've received. How did you react in the moment, and what did you do with it?",
    competency: "Coachability",
    followUps: [
      "Did you agree with it at first? What changed your mind?",
      "How did you check whether you had actually improved?",
      "How has it changed the way you give feedback to others?",
    ],
    lookFor: [
      "Chooses feedback that genuinely stung, not a trivial nitpick",
      "Listens and asks clarifying questions instead of getting defensive",
      "Takes a concrete action and asks for follow-up feedback",
      "Shows sustained change over time",
    ],
    redFlags: [
      "Argues the feedback was wrong or unfair",
      "Can't recall any critical feedback",
      "Surface-level fix with no follow-through",
    ],
  },
  {
    id: "bq-learning-fast",
    prompt:
      "Tell me about a time you had to get productive quickly in an unfamiliar technology, codebase, or domain. How did you ramp up?",
    competency: "Learning agility",
    followUps: [
      "What did you deliberately skip learning, and why?",
      "Who did you lean on, and how did you make good use of their time?",
      "How long until you shipped something real?",
    ],
    lookFor: [
      "Learns with a goal: targets what is needed for the task first",
      "Mixes docs, reading code, small experiments, and asking experts",
      "Ships something real early and iterates",
      "Leaves something behind for the next person, like docs or onboarding notes",
    ],
    redFlags: [
      "Spent weeks on tutorials without shipping",
      "Never asked anyone for help",
      "Vague on what they actually learned or built",
    ],
  },
  {
    id: "bq-cross-team-collaboration",
    prompt:
      "Tell me about a project where you depended on another team with different priorities. How did you get what you needed and keep the project moving?",
    competency: "Cross-team collaboration",
    followUps: [
      "What was in it for the other team?",
      "What did you do when they missed a commitment?",
      "How did you keep everyone aligned on timelines and interfaces?",
    ],
    lookFor: [
      "Understands the other team's goals and finds a mutual win",
      "Establishes clear interfaces, owners, and timelines early",
      "Handles slips constructively, with a plan B or offering to help",
      "Communicates proactively through syncs, docs, and status updates",
    ],
    redFlags: [
      "Us-versus-them framing about the other team",
      "Escalates immediately instead of building the relationship",
      "Throws requirements over the wall and waits",
    ],
  },
  {
    id: "bq-incomplete-data-decision",
    prompt:
      "Tell me about a time you had to make an important technical decision without all the data you wanted. How did you decide, and how did it play out?",
    competency: "Judgment under uncertainty",
    followUps: [
      "How did you decide the decision couldn't wait for more data?",
      "What would have told you that you were wrong, and did you watch for it?",
      "How reversible was the decision, and did that change your approach?",
    ],
    lookFor: [
      "Distinguishes reversible from irreversible decisions and moves accordingly",
      "Gathers the cheapest high-signal data available in the time",
      "States assumptions and risks explicitly and gets input",
      "Sets checkpoints or metrics to revisit the decision",
    ],
    redFlags: [
      "Paralysis: kept waiting for perfect data",
      "Gut call with no reasoning or risk mitigation",
      "Never followed up to see whether the decision was right",
    ],
  },
];
