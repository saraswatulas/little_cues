import type {
  AgeContext,
  BabyProfile,
  CareLog,
  EngineResponse,
  ExpectationPlan,
  LogKind,
  PlanningActivity,
  PlanningActivityState,
  SystemUxPayload,
  TriageLevel
} from "./types";

export const MEDICAL_DISCLAIMER =
  "This information is supportive and educational only and does not constitute medical advice. Consult your pediatrician for health concerns.";

export const SOURCE_LINKS = [
  {
    label: "AAP safe sleep guidance",
    url: "https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/A-Parents-Guide-to-Safe-Sleep.aspx"
  },
  {
    label: "CDC childhood vaccine schedule",
    url: "https://www.cdc.gov/vaccines/imz-schedules/child-easyread.html"
  },
  {
    label: "CDC developmental milestones",
    url: "https://www.cdc.gov/ncbddd/actearly/milestones/index.html"
  },
  {
    label: "Seattle Children's fever guidance",
    url: "https://www.seattlechildrens.org/health-safety/illness/fever/"
  },
  {
    label: "AAP family media plan",
    url: "https://www.healthychildren.org/English/fmp/Pages/MediaPlan.aspx"
  },
  {
    label: "AAP car seat guidance",
    url: "https://www.healthychildren.org/English/safety-prevention/on-the-go/Pages/Car-Safety-Seats-Information-for-Families.aspx"
  },
  {
    label: "CDC positive parenting",
    url: "https://www.cdc.gov/child-development/positive-parenting-tips/index.html"
  }
];

export const AI_HELPERS = [
  {
    id: "chatgpt",
    label: "ChatGPT",
    url: "https://chatgpt.com/"
  },
  {
    id: "claude",
    label: "Claude",
    url: "https://claude.ai/"
  },
  {
    id: "gemini",
    label: "Gemini",
    url: "https://gemini.google.com/"
  }
] as const;

export function buildDailySummary(baby: BabyProfile, age: AgeContext, logs: CareLog[]): EngineResponse {
  const todaysLogs = logs.filter((log) => isToday(log.occurredAt));
  const counts = countLogs(todaysLogs);
  const plan = buildExpectationPlan(age);
  const feedingFlag = getFeedingFlag(age, counts.feeding);
  const diaperFlag = getDiaperFlag(age, counts.diaper);
  const hasEnoughLogsForFlags = todaysLogs.length > 0;
  const triage = hasEnoughLogsForFlags ? maxTriage([feedingFlag.triage, diaperFlag.triage]) : "green";

  const markdown = [
    `**${baby.name}'s day ${plan.dayNumber}: ${plan.stageTitle}**`,
    "",
    MEDICAL_DISCLAIMER,
    "",
    plan.todayHeadline,
    "",
    "**What to expect today**",
    ...plan.today.flatMap((section) => [`- ${section.title}: ${section.items.join(" ")}`]),
    "",
    "**This week**",
    ...plan.thisWeek.flatMap((section) => [`- ${section.title}: ${section.items.join(" ")}`]),
    "",
    "**Watch window**",
    ...plan.watchWindows.map((item) => `- ${item}`),
    "",
    "**When to Call Your Doctor**",
    ...plan.doctorChecklist.map((item) => `- ${item}`)
  ].join("\n");

  return createResponse({
    age,
    markdown,
    triage,
    activePanel: "daily-summary",
    matchedRules: plan.matchedRules,
    flags: hasEnoughLogsForFlags ? [feedingFlag.message, diaperFlag.message].filter(Boolean) : [],
    proposedWrites: []
  });
}

export function buildExpectationPlan(age: AgeContext): ExpectationPlan {
  const weekNumber = Math.floor(age.days / 7) + 1;
  const stage = stageForAge(age);
  const plan = expectationRules(age);

  return {
    dayNumber: age.days,
    weekNumber,
    ageLabel: age.label,
    stageTitle: stage,
    todayHeadline: plan.todayHeadline,
    today: plan.today,
    lifeGuide: buildLifeGuide(age),
    thisWeek: plan.thisWeek,
    watchWindows: plan.watchWindows,
    doctorChecklist: doctorChecklist(age, "green"),
    matchedRules: plan.matchedRules
  };
}

function buildLifeGuide(age: AgeContext) {
  if (age.months < 4) return infantLifeGuide(age);
  if (age.months <= 6) return fourToSixMonthLifeGuide(age);
  if (age.months < 12) return olderInfantLifeGuide(age);
  if (age.months < 24) return toddlerLifeGuide(age);
  if (age.months < 48) return twoToThreeLifeGuide(age);
  return preschoolLifeGuide(age);
}

function infantLifeGuide(age: AgeContext) {
  const newborn = age.days <= 28;
  return [
    {
      title: "Food and feeding",
      items: newborn
        ? ["Breast milk or formula only.", "Expect frequent feeds, often 8-12 per day.", "No water, juice, cereal in bottles, or solids unless your pediatrician tells you."]
        : ["Breast milk or formula only.", "Feeds are still frequent.", "Track brand/type of formula or pump details if helpful."]
    },
    {
      title: "Sleep",
      items: ["Back for every sleep.", "Firm flat surface.", "No loose blankets, pillows, bumpers, toys, positioners, or inclined sleep products."]
    },
    {
      title: "Play",
      items: ["Face-to-face talking.", "High-contrast cards.", "Gentle songs.", "Short tummy time while awake and supervised.", "Pause when baby looks away or gets fussy."]
    },
    {
      title: "Books and language",
      items: ["Read anything out loud for a few minutes.", "Name faces, sounds, and routines.", "Baby does not need to understand the story yet."]
    },
    {
      title: "Screen time",
      items: ["Avoid screen time except video chatting with family.", "Background TV can still be overstimulating, so keep feeding and sleep spaces calm."]
    },
    {
      title: "Clothes",
      items: ["Dress in one more light layer than an adult would wear if needed.", "Avoid overheating.", "Use sleep sacks instead of loose blankets."]
    },
    {
      title: "Diapers and skin",
      items: newborn ? ["Watch wet diapers and stool transition.", "Sponge baths until the cord falls off.", "Use barrier ointment for irritation."] : ["Track wet diapers, stool changes, rashes, cradle cap, baby acne, and dry patches.", "Use gentle fragrance-free care."]
    },
    {
      title: "Swings and containers",
      items: ["Use swings/bouncers only while awake and supervised.", "Move baby to a safe sleep surface if drowsy or asleep.", "Balance container time with floor time."]
    },
    {
      title: "Outings and daycare",
      items: ["Daycare is not developmentally required.", "If care is needed, ask about safe sleep, bottle handling, illness policy, caregiver ratios, and daily notes."]
    },
    {
      title: "Safety",
      items: ["Rear-facing car seat according to seat limits.", "Never leave baby on a raised surface.", "Keep small objects, hot drinks, cords, and medicines away."]
    },
    {
      title: "Health",
      items: ["Fever is 100.4°F / 38°C or higher.", "Call promptly for fever under 3 months, poor feeding, breathing changes, fewer wet diapers, or unusual sleepiness."]
    },
    {
      title: "Parent rhythm",
      items: ["You do not need formal activities.", "Feed, sleep, diaper, comfort, and a few calm awake moments are enough for this stage."]
    }
  ];
}

function fourToSixMonthLifeGuide(age: AgeContext) {
  return [
    {
      title: "Food",
      items: ["Milk remains primary.", "Solids can begin when baby shows readiness and your pediatrician agrees.", "Start simple textures and log allergens/reactions."]
    },
    {
      title: "Sleep",
      items: ["Expect possible 4-month sleep disruption.", "Stop swaddling once rolling signs appear.", "Keep the crib empty."]
    },
    {
      title: "Play",
      items: ["Floor time.", "Reaching toys.", "Mirror play.", "Tummy time.", "Rolling practice without forcing positions."]
    },
    {
      title: "Books and language",
      items: ["Board books, songs, naming objects, back-and-forth sounds, and playful pauses are useful."]
    },
    {
      title: "Screen time",
      items: ["Avoid screen time except video chat.", "Choose human interaction, books, songs, and floor play first."]
    },
    {
      title: "Clothes",
      items: ["Choose easy movement clothes.", "Avoid overheating.", "Use bibs for drool or early solids if needed."]
    },
    {
      title: "Teething and skin",
      items: ["Drool and chewing may start.", "Use safe teethers.", "Avoid teething gels unless your pediatrician specifically recommends them."]
    },
    {
      title: "Swings and seats",
      items: ["Use containers briefly and supervised.", "Avoid using seats as sleep spaces.", "Give plenty of flat-floor movement time."]
    },
    {
      title: "Water and swimming",
      items: age.months >= 6 ? ["Use touch supervision near water.", "This is water safety, not swim independence.", "Formal swim lessons are usually a later discussion."] : ["Bath safety still matters.", "Do not leave baby unattended in any water."]
    },
    {
      title: "Daycare and outings",
      items: ["Daycare is optional based on family need.", "Expect more illness exposure in group care.", "Keep feeding, nap, and vaccine notes available."]
    },
    {
      title: "Safety",
      items: ["Babyproof before rolling and scooting are reliable.", "Watch choking hazards, cords, furniture edges, and falls."]
    },
    {
      title: "Health",
      items: ["Vaccines may be due at 4 and 6 months.", "Call for fever concerns, breathing trouble, allergic reaction symptoms, dehydration, or major behavior change."]
    }
  ];
}

function olderInfantLifeGuide(age: AgeContext) {
  return [
    {
      title: "Food",
      items: ["Keep expanding safe textures and foods.", "Avoid choking hazards.", "Track allergens, reactions, constipation, and tolerated foods."]
    },
    {
      title: "Sleep",
      items: ["Separation awareness, crawling, standing, or teething can disturb sleep.", "Keep safe sleep consistent."]
    },
    {
      title: "Play",
      items: ["Peekaboo.", "Stacking cups.", "Cause-and-effect toys.", "Crawling space.", "Pull-to-stand practice only when baby initiates."]
    },
    {
      title: "Books and language",
      items: ["Read board books daily.", "Point and name.", "Respond to babbles.", "Use simple repeated words."]
    },
    {
      title: "Screen time",
      items: ["Avoid routine screen time except video chat.", "Use active play and books for attention-building."]
    },
    {
      title: "Clothes",
      items: ["Use clothes that allow crawling and standing.", "Non-slip socks or bare feet indoors can help practice."]
    },
    {
      title: "Teeth and mouth",
      items: ["Clean gums/teeth gently.", "Ask the pediatrician or dentist about fluoride and dental timing."]
    },
    {
      title: "Swings and gear",
      items: ["Limit passive container time.", "Avoid walkers with wheels.", "Use high chairs and strollers according to straps and limits."]
    },
    {
      title: "Water and swimming",
      items: ["Use touch supervision around baths, pools, buckets, toilets, and open water.", "Swim lessons do not make a baby drown-proof."]
    },
    {
      title: "Daycare and social",
      items: ["Expect stranger anxiety or separation feelings.", "A consistent goodbye routine helps."]
    },
    {
      title: "Safety",
      items: ["Anchor furniture.", "Gate stairs.", "Lock medicines/cleaners.", "Move choking hazards and cords.", "Keep rear-facing car seat until seat limits."]
    },
    {
      title: "Health",
      items: ["Watch fever, dehydration, breathing, allergic reactions, injury, and loss of skills."]
    }
  ];
}

function toddlerLifeGuide(age: AgeContext) {
  return [
    {
      title: "Food",
      items: ["Offer meals and snacks on a routine.", "Expect appetite swings.", "Avoid choking hazards.", "Keep trying foods without pressure."]
    },
    {
      title: "Sleep",
      items: ["Use a predictable bedtime.", "Separation and independence can affect sleep.", "Keep sleep space safe."]
    },
    {
      title: "Play",
      items: ["Blocks.", "Balls.", "Push toys.", "Pretend play.", "Music.", "Outdoor movement.", "Simple helping tasks."]
    },
    {
      title: "Books and language",
      items: ["Read daily.", "Ask simple questions.", "Name feelings.", "Let the child turn pages and point."]
    },
    {
      title: "Screen time",
      items: ["Avoid using screens as the default soother.", "If media is used after 18-24 months, choose high-quality content and watch together."]
    },
    {
      title: "Clothes",
      items: ["Expect practice with shoes, socks, hats, and simple choices.", "Use weather-appropriate layers and sun protection."]
    },
    {
      title: "Toilet and hygiene",
      items: ["Toilet readiness varies.", "Look for interest, longer dry periods, and ability to follow simple steps.", "Brush teeth with parent help."]
    },
    {
      title: "Classes and activities",
      items: ["Music, library story time, playground, art, and parent-child movement classes can fit.", "Formal academics are not needed."]
    },
    {
      title: "Water and swimming",
      items: ["Around age 1+, swim lessons can be considered based on readiness and family exposure.", "Supervision and barriers still matter most."]
    },
    {
      title: "Daycare and social",
      items: ["Daycare/preschool is optional and family-dependent.", "Look for safe ratios, outdoor time, rest routine, behavior policy, and communication."]
    },
    {
      title: "Safety",
      items: ["Car seat should match height/weight limits.", "Prevent falls, burns, choking, poisoning, drowning, and driveway/parking-lot risks."]
    },
    {
      title: "Health",
      items: ["Keep well visits, dental care, vaccines, and illness plans current.", "Call for breathing trouble, dehydration, concerning fever, injury, or regression."]
    }
  ];
}

function twoToThreeLifeGuide(age: AgeContext) {
  return [
    {
      title: "Food",
      items: ["Offer variety without pressure.", "Use family meals when possible.", "Limit choking hazards and sugary drinks."]
    },
    {
      title: "Sleep",
      items: ["Many children still nap.", "Use consistent bedtime routines and calm limits."]
    },
    {
      title: "Play",
      items: ["Pretend play.", "Climbing with supervision.", "Puzzles.", "Crayons.", "Blocks.", "Sorting.", "Outdoor running and jumping."]
    },
    {
      title: "Books and learning",
      items: ["Read daily.", "Talk about pictures.", "Count everyday objects.", "Sing rhymes.", "Practice turn-taking."]
    },
    {
      title: "Screen time",
      items: ["For ages 2-5, keep screen time limited, high-quality, and co-viewed when possible.", "Avoid screens before bed."]
    },
    {
      title: "Clothes",
      items: ["Let child choose between two outfits.", "Practice dressing skills slowly.", "Use weather, sunscreen, and shoe safety."]
    },
    {
      title: "Toilet and hygiene",
      items: ["Toilet learning may be active now.", "Expect accidents.", "Brush teeth with help.", "Teach handwashing."]
    },
    {
      title: "Activities",
      items: ["Library, playground, art, music, parent-child sports, nature walks, and simple chores are age-fitting."]
    },
    {
      title: "Daycare and preschool",
      items: ["Preschool can support social routines but is not the only path.", "Look for warmth, safety, play, communication, and rest policies."]
    },
    {
      title: "Safety",
      items: ["Car seat per limits.", "Helmet for riding toys.", "Water supervision.", "Medicine locks.", "Street and parking-lot handholding."]
    },
    {
      title: "Behavior",
      items: ["Tantrums are common.", "Use simple limits, routines, choices, naming feelings, and repair after hard moments."]
    },
    {
      title: "Health",
      items: ["Keep vaccines, dental visits, vision/hearing concerns, sleep, constipation, and development questions on the pediatric list."]
    }
  ];
}

function preschoolLifeGuide(age: AgeContext) {
  return [
    {
      title: "Food",
      items: ["Family meals, varied foods, water, and predictable snacks help.", "Avoid pressure battles and keep choking risks in mind."]
    },
    {
      title: "Sleep",
      items: ["Some children drop naps by 5.", "Keep bedtime consistent and screens out of the bedtime routine."]
    },
    {
      title: "Play",
      items: ["Pretend play.", "Drawing.", "Blocks.", "Board games.", "Outdoor play.", "Balance, hopping, throwing, catching, and climbing with supervision."]
    },
    {
      title: "Books and school readiness",
      items: ["Read daily.", "Practice storytelling, colors, shapes, counting, name recognition, and following two-step directions through play."]
    },
    {
      title: "Screen time",
      items: ["For ages 2-5, keep media limited, high-quality, co-viewed when possible, and away from bedtime and bedrooms."]
    },
    {
      title: "Clothes",
      items: ["Practice independent dressing, zippers, shoes, coats, and weather choices.", "Expect help to still be needed."]
    },
    {
      title: "Toilet and hygiene",
      items: ["Support wiping, handwashing, toothbrushing help, bath safety, and privacy/body-safety language."]
    },
    {
      title: "Activities",
      items: ["Preschool, playground, swimming lessons, dance, music, art, soccer-style play, and library groups can fit if the child enjoys them."]
    },
    {
      title: "Daycare, preschool, kindergarten",
      items: age.months >= 60 ? ["Kindergarten readiness is about routines, separation, communication, self-help, play, and curiosity, not perfect academics."] : ["Preschool is useful for some families but not mandatory. Warmth, safety, play, and communication matter more than worksheets."]
    },
    {
      title: "Safety",
      items: ["Use the correct car seat or booster for size.", "Helmet for bikes/scooters.", "Water supervision.", "Teach street, body, fire, and stranger-safety basics calmly."]
    },
    {
      title: "Behavior and feelings",
      items: ["Practice naming feelings, waiting, sharing, repair, and problem solving.", "Big feelings are still normal."]
    },
    {
      title: "Health",
      items: ["Keep annual well visits, vaccines, dental care, vision/hearing checks, sleep, constipation, and development/behavior questions current."]
    }
  ];
}

export function buildPlanningActivities(age: AgeContext, states: PlanningActivityState[] = []): PlanningActivity[] {
  const stateById = new Map(states.map((state) => [state.activityId, state]));
  const baseActivities: PlanningActivity[] = [
    {
      id: "safe-sleep",
      title: "Set up safe sleep",
      category: "sleep",
      timing: "now",
      why: "Safe sleep is daily prevention, not a one-time setup.",
      action: "Use back sleeping, a firm flat surface, and no loose blankets, pillows, bumpers, or toys.",
      afterDone: "Keep checking the sleep space as baby grows, starts rolling, or caregivers change.",
      sourceLabel: "AAP safe sleep",
      sourceUrl: SOURCE_LINKS[0].url
    },
    {
      id: "tummy-time",
      title: "Start tiny tummy time",
      category: "development",
      timing: "now",
      why: "Tummy time can begin from day 1 during awake, supervised moments.",
      action: "Try brief sessions after diaper changes or when baby is calm.",
      afterDone: "Increase duration slowly as baby tolerates it; short and frequent beats forced long sessions."
    },
    {
      id: "daycare-plan",
      title: "Plan daycare or caregiver handoff",
      category: "care",
      timing: "now",
      why: "Daycare is not required, but if you need it, preparation is practical: feeding notes, sleep preferences, emergency contacts, vaccine records, and illness policy.",
      action: "Ask about caregiver ratios, safe sleep rules, bottle handling, sick policies, medication policy, and daily communication.",
      afterDone: "Expect a transition period. Keep a short handoff note and watch feeding, sleep, and illness patterns during the first weeks.",
      sourceLabel: "AAP choosing child care",
      sourceUrl: "https://www.healthychildren.org/English/family-life/work-play/Pages/Choosing-Child-Care.aspx"
    }
  ];

  const activities = baseActivities.filter((activity) => isBaseActivityRelevantToday(activity.id, age));

  activities.push(...vaccineActivities(age));
  activities.push(...foodActivities(age));
  activities.push(...waterSafetyActivities(age));
  activities.push(...sleepRegressionActivities(age));

  return activities.filter((activity) => activity.timing === "now").map((activity) => {
    const state = stateById.get(activity.id);
    if (state?.status === "done") {
      return {
        ...activity,
        timing: "now",
        why: `${activity.afterDone}${state.note ? ` Logged detail: ${state.note}` : ""}`,
        action: nextActionAfterDone(activity, state.note)
      };
    }
    return activity;
  });
}

export function answerParentQuestion(question: string, baby: BabyProfile, age: AgeContext, logs: CareLog[]): EngineResponse {
  const lower = question.toLowerCase();
  const matchedRules = ["question-router", `age-${age.bucket}`];
  let triage: TriageLevel = "green";
  const flags: string[] = [];
  const guidance: string[] = [];

  if (mentionsFeedingDrop(lower)) {
    const feedCount = extractNumber(question) ?? countLogs(logs.filter((log) => isToday(log.occurredAt))).feeding;
    const flag = getFeedingFlag(age, feedCount);
    triage = flag.triage;
    flags.push(flag.message || "feeding-question");
    guidance.push(feedingAnswer(age, feedCount, baby.weightLbs));
    matchedRules.push("feeding-drop-parser");
  } else if (mentionsSleep(lower)) {
    triage = lower.includes("breathing") || lower.includes("blue") ? "red" : "yellow";
    flags.push("sleep-change");
    guidance.push(sleepAnswer(age));
    matchedRules.push("sleep-safety-router");
  } else if (mentionsSolids(lower)) {
    guidance.push(solidsAnswer(age));
    matchedRules.push("solids-window");
  } else {
    guidance.push(`For ${baby.name} at ${age.label}, I would compare this with feeding, diaper, sleep, and behavior changes logged today. If anything feels sharply different from their baseline, it is worth calling your pediatrician.`);
  }

  const markdown = [
    `**Question about ${baby.name}**`,
    "",
    MEDICAL_DISCLAIMER,
    "",
    ...guidance,
    "",
    "**When to Call Your Doctor**",
    ...doctorChecklist(age, triage).map((item) => `- ${item}`)
  ].join("\n");

  return createResponse({
    age,
    markdown,
    triage,
    activePanel: "question",
    matchedRules,
    flags,
    proposedWrites: [
      {
        table: "parent_questions",
        action: "insert",
        values: { baby_id: baby.id, question, triage, age_days: age.days }
      }
    ]
  });
}

export function checkSymptoms(symptoms: string, baby: BabyProfile, age: AgeContext): EngineResponse {
  const lower = symptoms.toLowerCase();
  const temperature = extractTemperature(lower);
  const flags: string[] = [];
  let triage: TriageLevel = "green";

  if (temperature && temperature >= 100.4) {
    triage = age.months < 3 ? "red" : "yellow";
    flags.push("fever-100.4-plus");
  }

  if (["trouble breathing", "blue", "gray", "seizure", "lethargic", "not alert"].some((term) => lower.includes(term))) {
    triage = "red";
    flags.push("emergency-red-flag");
  }

  if (["no wet diaper", "dry mouth", "vomit", "poor feeding", "hard to wake"].some((term) => lower.includes(term)) && triage !== "red") {
    triage = "yellow";
    flags.push("monitor-call-soon");
  }

  const assessment =
    triage === "red"
      ? "This has one or more red flags. Please seek urgent medical help now or call emergency services if your baby is struggling to breathe, is blue/gray, has a seizure, or is not responsive."
      : triage === "yellow"
        ? "This is worth a same-day call to your pediatrician, especially if feeding, wet diapers, breathing, or alertness has changed."
        : "This sounds like it may fit normal variation, but keep watching patterns across feeding, diapers, sleep, temperature, and alertness.";

  const markdown = [
    `**Symptom check for ${baby.name}**`,
    "",
    MEDICAL_DISCLAIMER,
    "",
    `**Triage: ${triage.toUpperCase()}**`,
    "",
    assessment,
    "",
    "**Red flags to watch for**",
    "- Fever of 100.4°F / 38°C or higher, especially under 3 months",
    "- Trouble breathing, blue or gray color, seizure, or limp/unresponsive behavior",
    "- Poor feeding with fewer wet diapers than expected",
    "- Repeated vomiting, dry mouth, or no wet diaper for 8 hours",
    "",
    "**When to Call Your Doctor**",
    ...doctorChecklist(age, triage).map((item) => `- ${item}`)
  ].join("\n");

  return createResponse({
    age,
    markdown,
    triage,
    activePanel: "symptom",
    matchedRules: ["symptom-checker", `age-${age.bucket}`],
    flags,
    proposedWrites: [
      {
        table: "symptom_logs",
        action: "insert",
        values: { baby_id: baby.id, symptoms, triage, temperature_f: temperature ?? null, age_days: age.days }
      }
    ]
  });
}

export function parseCareLog(rawText: string, kind: LogKind, baby: BabyProfile, age: AgeContext): EngineResponse {
  const now = new Date().toISOString();
  const summary = summarizeLog(rawText, kind);
  const proposedLog = {
    id: crypto.randomUUID(),
    baby_id: baby.id,
    kind,
    raw_text: rawText,
    summary,
    occurred_at: now,
    age_days: age.days
  };

  const markdown = [
    `**Logged for ${baby.name}**`,
    "",
    MEDICAL_DISCLAIMER,
    "",
    `Saved as a **${kind}** note: ${summary}`,
    "",
    "**When to Call Your Doctor**",
    ...doctorChecklist(age, kind === "symptom" ? "yellow" : "green").map((item) => `- ${item}`)
  ].join("\n");

  return createResponse({
    age,
    markdown,
    triage: kind === "symptom" ? "yellow" : "green",
    activePanel: "log",
    matchedRules: ["daily-log-processor", `${kind}-parser`, `age-${age.bucket}`],
    flags: [],
    proposedWrites: [{ table: `${kind}_logs`, action: "insert", values: proposedLog }]
  });
}

export function saveAiSummaryPayload(provider: string, pastedResponse: string, baby: BabyProfile, age: AgeContext): EngineResponse {
  const title = pastedResponse.split("\n").find(Boolean)?.slice(0, 80) || "Saved AI summary";

  const markdown = [
    `**Saved external summary for ${baby.name}**`,
    "",
    MEDICAL_DISCLAIMER,
    "",
    "I saved this as an outside-AI note. Treat it as a reference only; Little Cues will keep using its deterministic safety checks for health guidance.",
    "",
    "**When to Call Your Doctor**",
    ...doctorChecklist(age, "green").map((item) => `- ${item}`)
  ].join("\n");

  return createResponse({
    age,
    markdown,
    triage: "green",
    activePanel: "ai-summary",
    matchedRules: ["external-ai-summary-save"],
    flags: ["external-ai-content-not-medical-source"],
    proposedWrites: [
      {
        table: "ai_summaries",
        action: "insert",
        values: { baby_id: baby.id, provider, pasted_response: pastedResponse, title, age_days: age.days }
      }
    ]
  });
}

function createResponse(input: {
  age: AgeContext;
  markdown: string;
  triage: TriageLevel;
  activePanel: SystemUxPayload["ui"]["activePanel"];
  matchedRules: string[];
  flags: string[];
  proposedWrites: SystemUxPayload["db"]["proposedWrites"];
}): EngineResponse {
  return {
    userFacingContent: {
      markdown: input.markdown,
      triage: input.triage
    },
    systemUxPayload: {
      ageContext: input.age,
      ui: {
        activePanel: input.activePanel,
        autocomplete: {
          formulaBrands: ["Similac 360 Total Care", "Enfamil NeuroPro", "Kendamil Classic"],
          pumpBrands: ["Spectra S1", "Spectra S2", "Medela Pump In Style", "Elvie"],
          diaperColors: ["yellow", "green", "brown", "black", "red", "white"]
        },
        suggestedActions: suggestedActions(input.age, input.triage),
        safetyBadges: ["Back to sleep", "No loose bedding", "Fever 100.4°F+ is a call trigger"]
      },
      db: {
        proposedWrites: input.proposedWrites
      },
      logic: {
        matchedRules: input.matchedRules,
        triage: input.triage,
        flags: input.flags,
        nextReminder: nextReminder(input.age)
      }
    }
  };
}

function vaccineActivities(age: AgeContext): PlanningActivity[] {
  const month = age.months;
  const dueNow =
    month === 0
      ? ["HepB birth dose if not already given"]
      : month === 2
        ? ["DTaP", "Hib", "Polio", "Pneumococcal", "Rotavirus", "HepB if due"]
        : month === 4
          ? ["DTaP", "Hib", "Polio", "Pneumococcal", "Rotavirus"]
          : month === 6
            ? ["DTaP", "Hib if due", "Pneumococcal", "Rotavirus if due", "HepB", "Flu/COVID by season and eligibility"]
            : month === 12
              ? ["MMR", "Chickenpox", "HepA", "Hib", "Pneumococcal"]
              : [];

  if (dueNow.length > 0) {
    return [
      {
        id: `vaccines-${month || "birth"}`,
        title: month === 0 ? "Confirm birth vaccine record" : `${month}-month vaccine visit`,
        category: "health",
        timing: "now",
        why: `This age commonly has vaccine planning on the US schedule: ${dueNow.join(", ")}.`,
        action: "Schedule or confirm the pediatric visit. After the visit, mark this done and enter which vaccines were given.",
        afterDone: "For the next 24-48 hours, expect possible fussiness, sleep disruption, mild fever, or soreness. Keep the entered vaccine names in the record and watch for allergic reaction symptoms.",
        sourceLabel: "CDC vaccine schedule",
        sourceUrl: SOURCE_LINKS[1].url,
        requiresDoctorCallout: true
      }
    ];
  }

  return [];
}

function foodActivities(age: AgeContext): PlanningActivity[] {
  if (age.months < 4) {
    return [
      {
        id: "milk-primary",
        title: "Keep milk as the food plan",
        category: "feeding",
        timing: "now",
        why: "Before the solids window, breast milk or formula is the main nutrition plan.",
        action: "Track formula type/brand or breastfeeding/pump details so feeding patterns are easier to review.",
        afterDone: "Use the saved formula or pump detail for autocomplete and feeding summaries."
      }
    ];
  }

  if (age.months <= 6) {
    return [
      {
        id: "solids-readiness",
        title: "Check solids readiness",
        category: "feeding",
        timing: "now",
        why: "The 4-6 month window may open when baby has readiness signs and your pediatrician agrees.",
        action: "Confirm good head control, sitting with support, and interest in food. Start simple textures when ready.",
        afterDone: "Track first foods, reactions, stool changes, and allergens one at a time.",
        sourceLabel: "CDC solids guidance",
        sourceUrl: "https://www.cdc.gov/nutrition/infantandtoddlernutrition/foods-and-drinks/when-what-and-how-to-introduce-solid-foods.html"
      },
      {
        id: "allergen-tracking",
        title: "Start allergen tracking",
        category: "feeding",
        timing: "now",
        why: "Once solids begin, clear food history helps you spot patterns.",
        action: "Log food, time, amount, texture, and any rash, vomiting, swelling, wheeze, or behavior change.",
        afterDone: "The app will treat tolerated foods as safe-history notes and make new-food planning easier.",
        requiresDoctorCallout: true
      }
    ];
  }

  return [
    {
      id: "food-variety",
      title: "Expand food variety",
      category: "feeding",
      timing: "now",
      why: "Older infants practice textures, self-feeding, flavors, and repeated exposure while milk still matters.",
      action: "Offer safe textures, avoid choking hazards, and keep logging allergens and reactions.",
      afterDone: "After tolerated foods are saved, rotate them into meal ideas and focus on new textures."
    }
  ];
}

function waterSafetyActivities(age: AgeContext): PlanningActivity[] {
  if (age.months >= 6 && age.months < 12) {
    return [
      {
        id: "water-safety-under-one",
        title: "Water safety, not swim lessons yet",
        category: "safety",
        timing: "now",
        why: "For babies under 1, focus on touch supervision, bath safety, pool barriers, and caregiver rules.",
        action: "Use arms-length supervision around water. Do not treat infant swim classes as drown-proofing.",
        afterDone: "Keep water safety as a repeated household rule; revisit formal lessons around toddler age.",
        sourceLabel: "AAP swim lessons",
        sourceUrl: "https://www.healthychildren.org/English/safety-prevention/at-play/Pages/Swim-Lessons.aspx"
      }
    ];
  }

  if (age.months >= 12) {
    return [
      {
        id: "swim-lessons-review",
        title: "Consider swim lessons",
        category: "safety",
        timing: "now",
        why: "Many children may be ready for swim lessons starting around age 1, depending on development and exposure.",
        action: "Choose a program focused on water safety, supervision, and child readiness.",
        afterDone: "Even after lessons, keep constant supervision and barriers. Lessons do not make a child drown-proof.",
        sourceLabel: "AAP swim lessons",
        sourceUrl: "https://www.healthychildren.org/English/safety-prevention/at-play/Pages/Swim-Lessons.aspx"
      }
    ];
  }

  return [];
}

function isBaseActivityRelevantToday(activityId: string, age: AgeContext) {
  if (activityId === "safe-sleep") return age.months < 12;
  if (activityId === "tummy-time") return age.months < 6;
  if (activityId === "daycare-plan") return age.weeks >= 4 && age.months <= 6;
  return true;
}

function sleepRegressionActivities(age: AgeContext): PlanningActivity[] {
  if (![4, 8, 12].includes(age.months)) return [];
  return [
    {
      id: `sleep-regression-${age.months}`,
      title: `${age.months}-month sleep regression watch`,
      category: "sleep",
      timing: "now",
      why: "New movement, awareness, or sleep-cycle changes can disrupt nights and naps around this stage.",
      action: "Keep safe sleep rules steady, protect wake windows, and log changes for a few days.",
      afterDone: "If sleep improves after routine changes, continue the pattern. If feeding, breathing, fever, or alertness changes, use symptom triage."
    }
  ];
}

function nextActionAfterDone(activity: PlanningActivity, note: string) {
  if (activity.id.startsWith("vaccines")) {
    return note
      ? `Post-vaccine mode is on for: ${note}. Watch comfort, feeding, wet diapers, temperature, rash/swelling, and breathing.`
      : "Post-vaccine mode is on. Add vaccine names to improve the record and watch comfort, feeding, wet diapers, temperature, rash/swelling, and breathing.";
  }

  if (activity.id.includes("solids") || activity.id.includes("allergen") || activity.id.includes("food")) {
    return "Food tracking mode is on. Log each new food, texture, amount, and any reaction so the next suggestions can adapt.";
  }

  if (activity.id.includes("daycare")) {
    return "Daycare transition mode is on. Track sleep, feeds, bottles, diapers, and illnesses for the first weeks.";
  }

  return "This is complete. Keep watching how baby responds and update the note if the situation changes.";
}

function stageForAge(age: AgeContext) {
  if (age.days <= 6) return "First week settling";
  if (age.days <= 14) return "Early newborn rhythm";
  if (age.days <= 28) return "Newborn growth and cues";
  if (age.weeks < 8) return "More alert weeks";
  if (age.months < 3) return "Social awareness building";
  if (age.months < 4) return "Longer awake stretches";
  if (age.months <= 6) return "Solids readiness window";
  if (age.months < 8) return "Rolling and reaching";
  if (age.months < 10) return "Sitting and exploring";
  if (age.months < 12) return "Mobility watch";
  return "Toddler transition";
}

function expectationRules(age: AgeContext) {
  if (age.days <= 6) {
    return {
      matchedRules: ["day-0-6", "meconium-transition", "safe-sleep", "jaundice-watch"],
      todayHeadline: "Today is mostly about feeding often, watching diapers change, protecting sleep safety, and learning your baby's early cues.",
      today: [
        {
          title: "Feeding",
          items: ["Expect frequent feeds, often 8-12 in 24 hours.", "Night feeds are expected and important."]
        },
        {
          title: "Diapers",
          items: ["Early poop usually moves from dark meconium toward green/brown, then yellow.", "Wet diapers should build across the first week."]
        },
        {
          title: "Sleep",
          items: ["Short awake windows are normal, often around 45-60 minutes.", "Total sleep can be around 14-17 hours."]
        },
        {
          title: "Skin and cord",
          items: ["Use sponge baths until the umbilical cord falls off.", "Milia, baby acne, and mild peeling can be common."]
        }
      ],
      thisWeek: [
        {
          title: "Main job",
          items: ["Feed, recover, observe diapers, and keep every sleep on the back in an empty crib or bassinet."]
        },
        {
          title: "Development",
          items: ["Brief tummy time can start from day 1 during awake, supervised moments."]
        }
      ],
      watchWindows: ["Jaundice can show up in the first days.", "Call promptly for poor feeding, increasing yellow color, or fewer wet diapers."]
    };
  }

  if (age.days <= 28) {
    return {
      matchedRules: ["week-2-4", "newborn-feeding", "newborn-sleep", "colic-watch"],
      todayHeadline: "Today may still feel repetitive: feed, diaper, sleep, soothe, repeat. That repetition is the developmental work right now.",
      today: [
        {
          title: "Feeding",
          items: ["8-12 feeds in 24 hours remains a useful cue.", "Look for active sucking, relaxed hands, and steady wet diapers."]
        },
        {
          title: "Diapers",
          items: ["Wet diapers should be regular.", "Use a barrier like petroleum jelly on clean, dry skin if irritation starts."]
        },
        {
          title: "Sleep",
          items: ["Wake windows are still short, often 45-60 minutes.", "Back sleeping and zero loose bedding matter every time."]
        },
        {
          title: "Development",
          items: ["Expect more looking at faces and brief alert periods.", "Tummy time can stay tiny and frequent."]
        }
      ],
      thisWeek: [
        {
          title: "Pattern spotting",
          items: ["Watch feeding comfort, diaper count, and whether crying has a predictable time of day."]
        },
        {
          title: "Health window",
          items: ["Colic-like crying can begin around weeks 2-8.", "Jaundice concerns are still worth calling about."]
        }
      ],
      watchWindows: ["Colic may begin around week 2.", "Jaundice, poor feeding, fever, or low diapers should trigger a doctor call."]
    };
  }

  if (age.weeks < 12) {
    return {
      matchedRules: ["week-5-11", "six-week-feeding", "colic-w2-w8", "early-social"],
      todayHeadline: "Today you may notice a little more alertness, stronger cues, and longer stretches between some feeds, while night feeds are still normal.",
      today: [
        {
          title: "Feeding",
          items: ["Feeds often land every 2-3 hours.", "Night feeds are still expected."]
        },
        {
          title: "Sleep",
          items: ["Wake windows are still limited.", "Protect naps before baby gets overtired."]
        },
        {
          title: "Development",
          items: ["Look for more eye contact, face tracking, early smiles, and cooing."]
        },
        {
          title: "Soothing",
          items: ["Evening fussiness can peak in this general window.", "Rhythm and lower stimulation can help."]
        }
      ],
      thisWeek: [
        {
          title: "Practice",
          items: ["Keep building tummy time in short sessions.", "Notice sounds, faces, and calm alert moments."]
        },
        {
          title: "Planning",
          items: ["Check the CDC vaccine schedule around the 2-month visit."]
        }
      ],
      watchWindows: ["Colic commonly lives in the week 2-8 window.", "Call for fever, poor feeding, breathing changes, dehydration signs, or a sharp behavior change."]
    };
  }

  if (age.months < 4) {
    return {
      matchedRules: ["month-3", "wake-window-75-90", "night-feed-dropping"],
      todayHeadline: "Today may bring clearer social feedback: more smiles, coos, tracking, and slightly longer awake time.",
      today: [
        {
          title: "Feeding",
          items: ["Some babies begin dropping a night feed if growth and diapers are steady.", "Formula planning should use weight and pediatric guidance."]
        },
        {
          title: "Sleep",
          items: ["Wake windows may be around 75-90 minutes.", "Safe sleep stays the same even when stretches lengthen."]
        },
        {
          title: "Development",
          items: ["Watch for tracking, smiling, cooing, and stronger head control."]
        },
        {
          title: "Play",
          items: ["Tummy time, talking, singing, and face-to-face play are enough."]
        }
      ],
      thisWeek: [
        {
          title: "Routine",
          items: ["Start noticing repeatable feed, nap, and play patterns without forcing a rigid schedule."]
        },
        {
          title: "Milestones",
          items: ["Track what is new, but do not panic over one quiet day."]
        }
      ],
      watchWindows: ["Call if feeding drops suddenly, wet diapers decrease, breathing changes, or baby is unusually hard to wake."]
    };
  }

  if (age.months <= 6) {
    return {
      matchedRules: ["month-4-6", "solids-window", "teething-watch", "sleep-regression-4m"],
      todayHeadline: "Today may be about curiosity: hands, rolling attempts, stronger head control, and maybe early solids readiness signs.",
      today: [
        {
          title: "Feeding",
          items: ["Milk remains primary.", "Solids may begin when readiness signs are present and your pediatrician agrees."]
        },
        {
          title: "Allergens",
          items: ["Track new foods one at a time.", "Log allergen exposures clearly."]
        },
        {
          title: "Sleep",
          items: ["The 4-month regression can disrupt sleep.", "Back to sleep still applies."]
        },
        {
          title: "Development",
          items: ["Expect reaching, rolling practice, more vocal play, and stronger tummy time."]
        }
      ],
      thisWeek: [
        {
          title: "Solids prep",
          items: ["Watch for sitting with support, good head control, and interest in food."]
        },
        {
          title: "Safety",
          items: ["As rolling starts, stop swaddling and keep the sleep space empty."]
        }
      ],
      watchWindows: ["Sleep regression can appear around 4 months.", "Teething signs may start for some babies.", "Call for fever, breathing issues, dehydration signs, or reaction symptoms after foods."]
    };
  }

  if (age.months < 12) {
    return {
      matchedRules: ["month-7-12", "mobility-safety", "sleep-regression-8-12m"],
      todayHeadline: "Today may include more movement, more opinions, and more practice with solids, sounds, sitting, crawling, or pulling up.",
      today: [
        {
          title: "Feeding",
          items: ["Solids expand gradually while milk remains important.", "Keep logging reactions and tolerated foods."]
        },
        {
          title: "Sleep",
          items: ["Separation awareness and new movement skills can disturb sleep.", "Keep safe sleep consistent."]
        },
        {
          title: "Development",
          items: ["Watch sitting, rolling, reaching, babbling, crawling, pulling up, and social back-and-forth."]
        },
        {
          title: "Safety",
          items: ["Babyproof before a skill appears.", "Choking risks and falls become more important."]
        }
      ],
      thisWeek: [
        {
          title: "Practice",
          items: ["Offer floor time, simple games, reading, and chances to reach and move."]
        },
        {
          title: "Regression watch",
          items: ["Sleep changes can cluster around 8 and 12 months."]
        }
      ],
      watchWindows: ["Watch for 8-month and 12-month sleep regressions.", "Call for fever, dehydration signs, breathing concerns, injury, or loss of skills."]
    };
  }

  return {
    matchedRules: ["twelve-months-plus", "transition-watch"],
    todayHeadline: "Today is a transition stage: more movement, communication, food variety, and independence.",
    today: [
      {
        title: "Feeding",
        items: ["Meals and snacks become more structured.", "Ask your pediatrician about milk transitions and nutrition questions."]
      },
      {
        title: "Sleep",
        items: ["Sleep needs remain high, but nap patterns may change."]
      },
      {
        title: "Development",
        items: ["Watch language, gestures, mobility, imitation, and social play."]
      },
      {
        title: "Safety",
        items: ["Falls, choking risks, medicines, water, stairs, and furniture anchoring need extra attention."]
      }
    ],
    thisWeek: [
      {
        title: "Growth",
        items: ["Keep tracking new words, gestures, walking practice, and eating patterns."]
      }
    ],
    watchWindows: ["Call for breathing trouble, dehydration, fever concerns, injury, or developmental regression."]
  };
}

function ageRules(age: AgeContext) {
  if (age.bucket === "newborn") {
    return {
      ruleIds: ["feeding-newborn", "diapers-newborn", "sleep-newborn", "jaundice-w1-w2"],
      feeding: "8-12 feeds/day; night feeds expected",
      diapers: "Watch wet diapers and week-1 meconium transition",
      sleep: "14-17 hours total; 45-60 minute wake windows",
      focus: ["Offer tummy time in brief awake sessions", "Use sponge baths until the umbilical cord falls off", "Place baby on their back for every sleep"]
    };
  }

  if (age.bucket === "sixWeeks") {
    return {
      ruleIds: ["feeding-six-weeks", "colic-w2-w8", "sleep-young-infant"],
      feeding: "Feeds often land every 2-3 hours; night feeds are still expected",
      diapers: "Track wet/dirty pattern and skin irritation",
      sleep: "Short wake windows still matter; overtired crying can build fast",
      focus: ["Colic can peak in this window", "Keep tummy time short and frequent", "Protect naps with a firm, flat, empty sleep space"]
    };
  }

  if (age.bucket === "fourToSixMonths") {
    return {
      ruleIds: ["solids-window", "teething-m4-plus", "sleep-regression-4m"],
      feeding: "Milk remains primary; solids may begin when readiness signs are present",
      diapers: "Texture and color may shift when solids start",
      sleep: "Watch for the 4-month regression and keep safe sleep rules steady",
      focus: ["Track first foods and allergens", "Ask the pediatrician about readiness if unsure", "Expect teething signs to start for some babies"]
    };
  }

  return {
    ruleIds: ["feeding-three-months-plus", "milestones-tracking-smiling-cooing", "safe-sleep"],
    feeding: "Night feeds may gradually drop for some babies",
    diapers: "Pattern matters more than one single diaper",
    sleep: "Wake windows gradually lengthen with age",
    focus: ["Track smiles, cooing, rolling, and sitting as age-appropriate", "Keep the crib empty", "Log formula brand or pump details for better suggestions"]
  };
}

function doctorChecklist(age: AgeContext, triage: TriageLevel) {
  const base = [
    "Call for fever of 100.4°F / 38°C or higher; call right away if under 3 months.",
    "Call for trouble breathing, blue/gray color, seizure, limpness, or hard-to-wake behavior.",
    "Call for poor feeding, repeated vomiting, signs of dehydration, or no wet diaper for 8 hours.",
    "Call if your parent instinct says something is off or symptoms are worsening."
  ];

  if (age.days <= 14) {
    base.push("Call for worsening yellow skin/eyes, very sleepy feeding, or fewer wet diapers in the jaundice window.");
  }

  if (triage === "red") {
    return ["Seek urgent care or emergency help now for red-flag symptoms.", ...base];
  }

  return base;
}

function getFeedingFlag(age: AgeContext, feedCount: number) {
  if (age.days <= 28 && feedCount > 0 && feedCount < 8) {
    return { triage: "yellow" as const, message: "newborn-feeding-below-8" };
  }

  if (age.days <= 28 && feedCount === 0) {
    return { triage: "red" as const, message: "newborn-no-feeds-logged" };
  }

  return { triage: "green" as const, message: "" };
}

function getDiaperFlag(age: AgeContext, diaperCount: number) {
  if (age.days <= 28 && diaperCount > 0 && diaperCount < 6) {
    return { triage: "yellow" as const, message: "newborn-low-diaper-count" };
  }

  return { triage: "green" as const, message: "" };
}

function feedingAnswer(age: AgeContext, feedCount: number, weightLbs?: number) {
  if (age.days <= 28 && feedCount < 8) {
    return `At ${age.label}, ${feedCount} feeds today is below the usual newborn range of 8-12 feeds/day. Offer a feed now if baby is awake enough, check wet diapers, and call your pediatrician today for individualized guidance.`;
  }

  if (age.months >= 3) {
    const formulaCue = weightLbs ? ` A rough formula planning cue is often weight-based, so ${weightLbs} lb should be discussed with your pediatrician for exact daily ounces.` : " Add current weight to unlock weight-based formula planning cues.";
    return `At ${age.label}, some babies gradually drop night feeds if growth and diapers are steady.${formulaCue}`;
  }

  return `At ${age.label}, frequent feeds are still expected. Look at the full pattern: alertness, latch or bottle transfer, wet diapers, and weight trend.`;
}

function sleepAnswer(age: AgeContext) {
  const wakeWindow = age.months >= 3 ? "75-90 minutes is a common wake-window cue around 3 months." : "45-60 minutes is a common newborn wake-window cue.";
  return `${wakeWindow} Keep every sleep on the back, on a firm flat surface, without loose blankets, pillows, bumpers, or toys.`;
}

function solidsAnswer(age: AgeContext) {
  if (age.months < 4) {
    return `At ${age.label}, solids are usually not the next step yet. Milk feeds remain the focus; ask your pediatrician if you are seeing readiness signs early.`;
  }

  return `At ${age.label}, the 4-6 month solids window may be open if readiness signs are present. Log each new food and allergen exposure separately so patterns are easy to review.`;
}

function suggestedActions(age: AgeContext, triage: TriageLevel) {
  if (triage === "red") return ["Seek urgent medical help", "Record temperature and last feed", "Share logs with pediatrician"];
  if (triage === "yellow") return ["Call pediatrician", "Log next feed and diaper", "Watch alertness and breathing"];
  if (age.months >= 4 && age.months <= 6) return ["Track first foods", "Log allergens", "Keep milk feeds primary"];
  return ["Log next feed", "Log wet/dirty diaper", "Plan brief tummy time"];
}

function nextReminder(age: AgeContext) {
  if (age.months === 2 || age.months === 4 || age.months === 6) return "Check CDC vaccine schedule and upcoming pediatric visit.";
  if (age.months === 4 || age.months === 8 || age.months === 12) return "Sleep regression watch window.";
  if (age.days <= 14) return "Jaundice and feeding/diaper watch window.";
  return "Daily feeding, diaper, sleep, and milestone check-in.";
}

function countLogs(logs: CareLog[]) {
  return logs.reduce(
    (counts, log) => {
      counts[log.kind] += 1;
      return counts;
    },
    { feeding: 0, diaper: 0, sleep: 0, weight: 0, symptom: 0 } satisfies Record<LogKind, number>
  );
}

function mentionsFeedingDrop(text: string) {
  return text.includes("fed") || text.includes("feed") || text.includes("formula") || text.includes("breast");
}

function mentionsSleep(text: string) {
  return text.includes("sleep") || text.includes("nap") || text.includes("wake");
}

function mentionsSolids(text: string) {
  return text.includes("solid") || text.includes("food") || text.includes("allergen");
}

function extractNumber(text: string) {
  const match = text.match(/\b\d+\b/);
  return match ? Number(match[0]) : null;
}

function extractTemperature(text: string) {
  const match = text.match(/(\d{2,3}(?:\.\d)?)\s*(?:f|°f|degrees)?/);
  if (!match) return null;
  const value = Number(match[1]);
  if (value >= 38 && value < 45 && text.includes("c")) return value * 1.8 + 32;
  return value;
}

function summarizeLog(rawText: string, kind: LogKind) {
  const cleaned = rawText.trim().replace(/\s+/g, " ");
  if (!cleaned) return `${kind} entry`;
  return cleaned.length > 120 ? `${cleaned.slice(0, 117)}...` : cleaned;
}

function isToday(value: string) {
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function maxTriage(levels: TriageLevel[]): TriageLevel {
  if (levels.includes("red")) return "red";
  if (levels.includes("yellow")) return "yellow";
  return "green";
}
