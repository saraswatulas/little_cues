import type { AgeContext } from "./types";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function calculateAge(dateOfBirth: string, now = new Date()): AgeContext {
  const dob = startOfLocalDay(new Date(`${dateOfBirth}T00:00:00`));
  const today = startOfLocalDay(now);
  const days = Math.max(0, Math.floor((today.getTime() - dob.getTime()) / DAY_IN_MS));
  const weeks = Math.floor(days / 7);
  const months = monthDifference(dob, today);

  return {
    days,
    weeks,
    months,
    label: formatAgeLabel(days, weeks, months),
    bucket: getAgeBucket(days, weeks, months)
  };
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function monthDifference(start: Date, end: Date) {
  let months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
  if (end.getDate() < start.getDate()) {
    months -= 1;
  }

  return Math.max(0, months);
}

function getAgeBucket(days: number, weeks: number, months: number): AgeContext["bucket"] {
  if (days <= 28) return "newborn";
  if (weeks >= 6 && weeks < 12) return "sixWeeks";
  if (months >= 4 && months <= 6) return "fourToSixMonths";
  if (months >= 3) return "threeMonthsPlus";
  return "olderInfant";
}

function formatAgeLabel(days: number, weeks: number, months: number) {
  if (days < 14) return `${days} day${days === 1 ? "" : "s"} old`;
  if (weeks < 8) return `${weeks} week${weeks === 1 ? "" : "s"} old`;
  if (months < 24) return `${months} month${months === 1 ? "" : "s"} old`;
  return `${Math.floor(months / 12)} year${months < 24 ? "" : "s"} old`;
}
