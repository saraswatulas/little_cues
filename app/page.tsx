"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateAge } from "@/lib/age";
import {
  AI_HELPERS,
  SOURCE_LINKS,
  answerParentQuestion,
  buildDailySummary,
  buildExpectationPlan,
  buildPlanningActivities,
  checkSymptoms,
  MEDICAL_DISCLAIMER,
  parseCareLog,
  saveAiSummaryPayload
} from "@/lib/rules";
import {
  loadActivityStates,
  loadAiSummaries,
  loadBaby,
  loadLogs,
  saveActivityStates,
  saveAiSummaries,
  saveBaby,
  saveLogs
} from "@/lib/storage";
import type {
  BabyProfile,
  CareLog,
  EngineResponse,
  ExpectationPlan,
  LogKind,
  PlanningActivity,
  PlanningActivityState,
  PlanningStatus,
  SavedAiSummary
} from "@/lib/types";

const logKinds: LogKind[] = ["feeding", "diaper", "sleep", "weight", "symptom"];

export default function HomePage() {
  const [baby, setBaby] = useState<BabyProfile>(() => ({
    id: "baby-local-1",
    name: "Baby",
    dateOfBirth: new Date().toISOString().slice(0, 10),
    timezone: "America/New_York"
  }));
  const [logs, setLogs] = useState<CareLog[]>([]);
  const [aiSummaries, setAiSummaries] = useState<SavedAiSummary[]>([]);
  const [activityStates, setActivityStates] = useState<PlanningActivityState[]>([]);
  const [activeLogKind, setActiveLogKind] = useState<LogKind>("feeding");
  const [logText, setLogText] = useState("");
  const [question, setQuestion] = useState("What should I expect today?");
  const [symptoms, setSymptoms] = useState("");
  const [aiProvider, setAiProvider] = useState<SavedAiSummary["provider"]>("chatgpt");
  const [aiText, setAiText] = useState("");
  const [response, setResponse] = useState<EngineResponse | null>(null);

  useEffect(() => {
    const loadedBaby = loadBaby();
    const loadedLogs = loadLogs();
    setBaby(loadedBaby);
    setLogs(loadedLogs);
    setAiSummaries(loadAiSummaries());
    setActivityStates(loadActivityStates());
    setResponse(buildDailySummary(loadedBaby, calculateAge(loadedBaby.dateOfBirth), loadedLogs));
  }, []);

  const age = useMemo(() => calculateAge(baby.dateOfBirth), [baby.dateOfBirth]);
  const expectation = useMemo(() => buildExpectationPlan(age), [age]);
  const activities = useMemo(() => buildPlanningActivities(age, activityStates), [age, activityStates]);
  const recentLogs = logs.slice(0, 4);

  function updateBaby(nextBaby: BabyProfile) {
    setBaby(nextBaby);
    saveBaby(nextBaby);
    setResponse(buildDailySummary(nextBaby, calculateAge(nextBaby.dateOfBirth), logs));
  }

  function showExpectations() {
    setResponse(buildDailySummary(baby, age, logs));
  }

  function addLog() {
    if (!logText.trim()) return;
    const engineResponse = parseCareLog(logText, activeLogKind, baby, age);
    const proposed = engineResponse.systemUxPayload.db.proposedWrites[0]?.values;
    const nextLog: CareLog = {
      id: String(proposed.id),
      babyId: baby.id,
      kind: activeLogKind,
      createdAt: new Date().toISOString(),
      occurredAt: String(proposed.occurred_at),
      summary: String(proposed.summary),
      rawText: logText,
      details: proposed as CareLog["details"]
    };
    const nextLogs = [nextLog, ...logs];
    setLogs(nextLogs);
    saveLogs(nextLogs);
    setLogText("");
    setResponse(engineResponse);
  }

  function askQuestion() {
    if (!question.trim()) return;
    const normalized = question.toLowerCase();
    if (normalized.includes("expect") || normalized.includes("today") || normalized.includes("week")) {
      showExpectations();
      return;
    }
    setResponse(answerParentQuestion(question, baby, age, logs));
  }

  function runSymptomCheck() {
    if (!symptoms.trim()) return;
    setResponse(checkSymptoms(symptoms, baby, age));
  }

  function saveExternalSummary() {
    if (!aiText.trim()) return;
    const engineResponse = saveAiSummaryPayload(aiProvider, aiText, baby, age);
    const proposed = engineResponse.systemUxPayload.db.proposedWrites[0]?.values;
    const summary: SavedAiSummary = {
      id: crypto.randomUUID(),
      babyId: baby.id,
      provider: aiProvider,
      createdAt: new Date().toISOString(),
      title: String(proposed.title),
      pastedResponse: aiText,
      parentNote: "Saved from external AI helper"
    };
    const nextSummaries = [summary, ...aiSummaries];
    setAiSummaries(nextSummaries);
    saveAiSummaries(nextSummaries);
    setAiText("");
    setResponse(engineResponse);
  }

  function updateActivity(activityId: string, status: PlanningStatus, note: string) {
    const nextState: PlanningActivityState = {
      activityId,
      status,
      note,
      completedAt: status === "done" ? new Date().toISOString() : undefined
    };
    const nextStates = [nextState, ...activityStates.filter((state) => state.activityId !== activityId)];
    setActivityStates(nextStates);
    saveActivityStates(nextStates);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-mark">LC</div>
            <div>
              <p className="brand-title">Little Cues</p>
              <p className="brand-subtitle">Daily baby expectations by DOB</p>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={showExpectations}>
            Today and week
          </button>
        </div>
      </header>

      <main className="main">
        <section className="expect-hero">
          <div className="expect-copy">
            <p className="eyebrow">DOB to day number</p>
            <h1>What can I expect today?</h1>
            <p className="lead">
              Enter baby&apos;s date of birth and Little Cues turns today into a precise day number, then shows age-matched
              feeding, sleep, diaper, development, and safety cues for today and this week.
            </p>
          </div>

          <BabyProfileCard baby={baby} expectation={expectation} onChange={updateBaby} />
        </section>

        <ExpectationBoard babyName={baby.name} expectation={expectation} />

        <LifeGuideBoard expectation={expectation} />

        <AdaptivePlanner activities={activities} states={activityStates} onUpdate={updateActivity} />

        <section className="two-column">
          <div className="stack">
            <section className="panel stack">
              <h2>Ask by age</h2>
              <div className="field">
                <label htmlFor="question">Question</label>
                <textarea id="question" onChange={(event) => setQuestion(event.target.value)} value={question} />
              </div>
              <button className="btn" onClick={askQuestion}>
                Answer with today&apos;s age
              </button>
            </section>

            <section className="panel stack">
              <h2>Quick log</h2>
              <div className="tabs" role="tablist" aria-label="Log type">
                {logKinds.map((kind) => (
                  <button
                    className={`tab ${activeLogKind === kind ? "tab-active" : ""}`}
                    key={kind}
                    onClick={() => setActiveLogKind(kind)}
                    type="button"
                  >
                    {kind}
                  </button>
                ))}
              </div>
              <div className="field">
                <label htmlFor="logText">Care note</label>
                <textarea
                  id="logText"
                  onChange={(event) => setLogText(event.target.value)}
                  placeholder="Example: 4 oz Similac 360 at 9:15 AM, finished calmly"
                  value={logText}
                />
                <p className="small">Suggestions: Similac 360 Total Care, Enfamil NeuroPro, Spectra S1, yellow diaper</p>
              </div>
              <button className="btn" onClick={addLog}>
                Save log
              </button>
            </section>

            <section className="panel stack">
              <h2>Symptom checker</h2>
              <div className="field">
                <label htmlFor="symptoms">Symptoms or changes</label>
                <textarea
                  id="symptoms"
                  onChange={(event) => setSymptoms(event.target.value)}
                  placeholder="Example: Temp 100.4F and feeding less"
                  value={symptoms}
                />
              </div>
              <button className="btn" onClick={runSymptomCheck}>
                Run triage
              </button>
            </section>
          </div>

          <div className="stack">
            {response ? <ResponsePane response={response} /> : null}

            <section className="panel stack">
              <h2>External AI helpers</h2>
              <p className="small">
                Open a helper, paste its answer back here, and save it as a reference note. Little Cues still keeps health
                guidance deterministic.
              </p>
              <div className="ai-list">
                {AI_HELPERS.map((helper) => (
                  <div className="ai-item" key={helper.id}>
                    <a href={helper.url} rel="noreferrer" target="_blank">
                      Open {helper.label}
                    </a>
                  </div>
                ))}
              </div>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="provider">Provider</label>
                  <select id="provider" onChange={(event) => setAiProvider(event.target.value as SavedAiSummary["provider"])} value={aiProvider}>
                    <option value="chatgpt">ChatGPT</option>
                    <option value="claude">Claude</option>
                    <option value="gemini">Gemini</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="field field-full">
                  <label htmlFor="aiText">Pasted response</label>
                  <textarea id="aiText" onChange={(event) => setAiText(event.target.value)} value={aiText} />
                </div>
              </div>
              <button className="btn" onClick={saveExternalSummary}>
                Save pasted summary
              </button>
            </section>

            <section className="panel stack">
              <h2>Recent saved items</h2>
              <div className="log-list">
                {recentLogs.length ? (
                  recentLogs.map((log) => (
                    <article className="log-item" key={log.id}>
                      <strong>{log.kind}</strong>
                      <p>{log.summary}</p>
                      <p className="log-meta">{new Date(log.occurredAt).toLocaleString()}</p>
                    </article>
                  ))
                ) : (
                  <p className="small">Logs will appear here after you save them.</p>
                )}
                {aiSummaries.slice(0, 2).map((summary) => (
                  <article className="log-item" key={summary.id}>
                    <strong>{summary.title}</strong>
                    <p className="log-meta">{summary.provider} - {new Date(summary.createdAt).toLocaleString()}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel stack">
              <h2>Clinical sources</h2>
              <div className="source-list">
                {SOURCE_LINKS.map((source) => (
                  <a href={source.url} key={source.url} rel="noreferrer" target="_blank">
                    {source.label}
                  </a>
                ))}
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}

function BabyProfileCard({
  baby,
  expectation,
  onChange
}: {
  baby: BabyProfile;
  expectation: ExpectationPlan;
  onChange: (baby: BabyProfile) => void;
}) {
  return (
    <section className="baby-card day-card">
      <div>
        <p className="eyebrow">Today</p>
        <p className="age-number">Day {expectation.dayNumber}</p>
        <p className="age-label">
          Week {expectation.weekNumber} - {expectation.ageLabel}
        </p>
      </div>

      <div className="stage-strip">
        <strong>{expectation.stageTitle}</strong>
        <span>{expectation.todayHeadline}</span>
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="babyName">Name</label>
          <input id="babyName" onChange={(event) => onChange({ ...baby, name: event.target.value })} value={baby.name} />
        </div>
        <div className="field">
          <label htmlFor="dateOfBirth">Date of birth</label>
          <input
            id="dateOfBirth"
            onChange={(event) => onChange({ ...baby, dateOfBirth: event.target.value })}
            type="date"
            value={baby.dateOfBirth}
          />
        </div>
        <div className="field">
          <label htmlFor="weight">Weight in lb</label>
          <input
            id="weight"
            min="0"
            onChange={(event) => onChange({ ...baby, weightLbs: event.target.value ? Number(event.target.value) : undefined })}
            step="0.1"
            type="number"
            value={baby.weightLbs ?? ""}
          />
        </div>
        <div className="field">
          <label htmlFor="timezone">Timezone</label>
          <input id="timezone" onChange={(event) => onChange({ ...baby, timezone: event.target.value })} value={baby.timezone} />
        </div>
      </div>
    </section>
  );
}

function ExpectationBoard({ babyName, expectation }: { babyName: string; expectation: ExpectationPlan }) {
  return (
    <section className="expect-board">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{babyName}&apos;s age-matched guide</p>
          <h2>Today and this week</h2>
        </div>
        <p className="small">{MEDICAL_DISCLAIMER}</p>
      </div>

      <div className="expect-grid">
        {expectation.today.map((section) => (
          <article className="expect-card" key={section.title}>
            <h3>{section.title}</h3>
            <ul>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="week-band">
        <div>
          <h3>This week</h3>
          {expectation.thisWeek.map((section) => (
            <div className="cue-block" key={section.title}>
              <strong>{section.title}</strong>
              <p>{section.items.join(" ")}</p>
            </div>
          ))}
        </div>
        <div>
          <h3>Watch window</h3>
          <ul>
            {expectation.watchWindows.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>When to Call Your Doctor</h3>
          <ul>
            {expectation.doctorChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function LifeGuideBoard({ expectation }: { expectation: ExpectationPlan }) {
  return (
    <section className="life-guide">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Everything for this age</p>
          <h2>Daily life guide</h2>
        </div>
        <p className="small">Filtered to {expectation.ageLabel}: no future milestones, no unrelated activities.</p>
      </div>

      <div className="life-grid">
        {expectation.lifeGuide.map((section) => (
          <article className="life-card" key={section.title}>
            <h3>{section.title}</h3>
            <ul>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function AdaptivePlanner({
  activities,
  states,
  onUpdate
}: {
  activities: PlanningActivity[];
  states: PlanningActivityState[];
  onUpdate: (activityId: string, status: PlanningStatus, note: string) => void;
}) {
  return (
    <section className="planner">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Relevant right now</p>
          <h2>Only what fits today&apos;s age</h2>
        </div>
        <p className="small">
          These items are filtered by the exact day/month. Mark one done and Little Cues changes the next cue into post-action monitoring.
        </p>
      </div>

      <div className="planner-grid">
        {activities.map((activity) => {
          const state = states.find((item) => item.activityId === activity.id);
          return <PlannerCard activity={activity} key={activity.id} state={state} onUpdate={onUpdate} />;
        })}
      </div>
    </section>
  );
}

function PlannerCard({
  activity,
  state,
  onUpdate
}: {
  activity: PlanningActivity;
  state?: PlanningActivityState;
  onUpdate: (activityId: string, status: PlanningStatus, note: string) => void;
}) {
  const [note, setNote] = useState(state?.note ?? "");

  useEffect(() => {
    setNote(state?.note ?? "");
  }, [state?.note]);

  return (
    <article className={`planner-card ${state?.status === "done" ? "planner-done" : ""}`}>
      <div className="planner-card-top">
        <span className={`category-pill ${activity.category}`}>{activity.category}</span>
        <span className="status-pill">{state?.status ?? "planned"}</span>
      </div>
      <h4>{activity.title}</h4>
      <p>{activity.why}</p>
      <div className="next-action">
        <strong>{state?.status === "done" ? "Now expect" : "Action"}</strong>
        <span>{activity.action}</span>
      </div>
      {activity.requiresDoctorCallout ? (
        <p className="doctor-note">Call your pediatrician for fever, breathing trouble, allergic reaction symptoms, dehydration signs, or anything that feels concerning.</p>
      ) : null}
      <div className="field">
        <label htmlFor={`${activity.id}-note`}>Details</label>
        <textarea
          id={`${activity.id}-note`}
          onChange={(event) => setNote(event.target.value)}
          placeholder={activity.id.startsWith("vaccines") ? "Example: DTaP, Hib, PCV, Rotavirus given today" : "Add what happened or what you decided"}
          value={note}
        />
      </div>
      <div className="button-row">
        <button className="btn" onClick={() => onUpdate(activity.id, "done", note)}>
          Mark done
        </button>
        <button className="btn btn-secondary" onClick={() => onUpdate(activity.id, "planned", note)}>
          Keep planned
        </button>
        <button className="btn btn-secondary" onClick={() => onUpdate(activity.id, "skip", note)}>
          Skip
        </button>
      </div>
      {activity.sourceUrl ? (
        <a className="source-link" href={activity.sourceUrl} rel="noreferrer" target="_blank">
          {activity.sourceLabel}
        </a>
      ) : null}
    </article>
  );
}

function ResponsePane({ response }: { response: EngineResponse }) {
  return (
    <section className="response-pane">
      <div className="response-header">
        <div>
          <p className="eyebrow">Two-part response</p>
          <h2>User content and payload</h2>
        </div>
        <span className={`triage ${response.userFacingContent.triage}`}>{response.userFacingContent.triage.toUpperCase()}</span>
      </div>
      <div className="markdown">
        {response.userFacingContent.markdown.split("\n").map((line, index) => (
          <MarkdownLine key={`${line}-${index}`} line={line} />
        ))}
      </div>
      <pre className="payload">{JSON.stringify(response.systemUxPayload, null, 2)}</pre>
    </section>
  );
}

function MarkdownLine({ line }: { line: string }) {
  if (!line) return <br />;
  if (line.startsWith("**") && line.endsWith("**")) return <h3>{line.replaceAll("**", "")}</h3>;
  if (line.startsWith("- ")) return <p>- {line.slice(2)}</p>;
  if (line.startsWith("|")) return <p className="small">{line}</p>;
  return <p>{line.replaceAll("**", "")}</p>;
}
