import { t, type CopyKey } from "../i18n/copy";
import type { Locale } from "../i18n/types";

export interface GeologicTimeInfo {
  eraKey: CopyKey;
  periodKey: CopyKey;
}

interface PeriodBoundary extends GeologicTimeInfo {
  /** Upper boundary in Ma. Younger ages sort first because Ma increases into the past. */
  youngerThanMa: number;
}

const periodBoundaries: readonly PeriodBoundary[] = [
  { youngerThanMa: 2.58, eraKey: "eraCenozoic", periodKey: "periodQuaternary" },
  { youngerThanMa: 23.03, eraKey: "eraCenozoic", periodKey: "periodNeogene" },
  { youngerThanMa: 66, eraKey: "eraCenozoic", periodKey: "periodPaleogene" },
  { youngerThanMa: 145, eraKey: "eraMesozoic", periodKey: "periodCretaceous" },
  { youngerThanMa: 201.4, eraKey: "eraMesozoic", periodKey: "periodJurassic" },
  { youngerThanMa: 251.9, eraKey: "eraMesozoic", periodKey: "periodTriassic" },
  { youngerThanMa: 298.9, eraKey: "eraPaleozoic", periodKey: "periodPermian" },
  { youngerThanMa: 358.9, eraKey: "eraPaleozoic", periodKey: "periodCarboniferous" },
  { youngerThanMa: 419.2, eraKey: "eraPaleozoic", periodKey: "periodDevonian" },
  { youngerThanMa: 443.8, eraKey: "eraPaleozoic", periodKey: "periodSilurian" },
  { youngerThanMa: 485.4, eraKey: "eraPaleozoic", periodKey: "periodOrdovician" },
  { youngerThanMa: 538.8, eraKey: "eraPaleozoic", periodKey: "periodCambrian" },
];

function cleanNumber(value: number): string {
  return Number(value.toFixed(2)).toString();
}

export function formatAge(ageMa: number, locale: Locale): string {
  if (ageMa <= 0) return t(locale, "present");
  if (locale === "ja") {
    return ageMa < 100
      ? `約${Math.round(ageMa * 100)}万年前`
      : `約${cleanNumber(ageMa / 100)}億年前`;
  }
  return `~${cleanNumber(ageMa)}M yrs ago`;
}

export function formatAgeTechnical(ageMa: number): string {
  return `${cleanNumber(ageMa)} Ma`;
}

export function getGeologicTimeInfo(ageMa: number): GeologicTimeInfo {
  return periodBoundaries.find((boundary) => ageMa < boundary.youngerThanMa)
    ?? periodBoundaries[periodBoundaries.length - 1]!;
}

export function formatGeologicPeriod(ageMa: number, locale: Locale): string {
  const info = getGeologicTimeInfo(ageMa);
  return `${t(locale, info.eraKey)} · ${t(locale, info.periodKey)}`;
}

export function formatAgeAria(ageMa: number, locale: Locale): string {
  if (ageMa <= 0) return t(locale, "present");
  return `${formatAge(ageMa, locale)} · ${formatGeologicPeriod(ageMa, locale)}`;
}
