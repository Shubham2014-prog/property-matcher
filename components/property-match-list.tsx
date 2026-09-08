import { matchLevelClass, StatusBadge } from "@/components/status-badge";
import type { Json, MatchLevel } from "@/types/database";

export const matchLevelRank: Record<MatchLevel, number> = {
  strong: 0,
  stretch: 1,
  possible: 2,
  unlikely: 3,
};

export type PropertyMatchDisplay = {
  property_id: string;
  client_id: string;
  score: number | null;
  data_completeness: number | null;
  match_level: MatchLevel;
  reasons: Json;
  hard_constraint_violations: Json;
  clients: { name: string } | { name: string }[] | null;
};

export function stringArrayFromJson(value: Json) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function violationMessagesFromJson(value: Json) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (
        item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        "message" in item &&
        typeof item.message === "string"
      ) {
        return item.message;
      }

      return null;
    })
    .filter((message): message is string => Boolean(message));
}

export function getClientName(match: PropertyMatchDisplay) {
  if (Array.isArray(match.clients)) {
    return match.clients[0]?.name ?? "Unknown client";
  }

  return match.clients?.name ?? "Unknown client";
}

export function sortMatches<T extends Pick<PropertyMatchDisplay, "match_level" | "score" | "data_completeness">>(
  matches: T[],
) {
  return [...matches].sort((left, right) => {
    const levelDifference =
      matchLevelRank[left.match_level] - matchLevelRank[right.match_level];

    if (levelDifference !== 0) {
      return levelDifference;
    }

    return (
      (right.score ?? 0) - (left.score ?? 0) ||
      (right.data_completeness ?? 0) - (left.data_completeness ?? 0)
    );
  });
}

type PropertyMatchListProps = {
  matches: PropertyMatchDisplay[];
  emptyText: string;
  limit?: number;
  usefulOnly?: boolean;
};

export function PropertyMatchList({
  matches,
  emptyText,
  limit = 3,
  usefulOnly = false,
}: PropertyMatchListProps) {
  const visibleMatches = sortMatches(
    usefulOnly
      ? matches.filter((match) => match.match_level !== "unlikely")
      : matches,
  ).slice(0, limit);

  if (visibleMatches.length === 0) {
    return <p className="text-xs text-slate-500">{emptyText}</p>;
  }

  return (
    <div className="space-y-3">
      {visibleMatches.map((match) => {
        const reasons = stringArrayFromJson(match.reasons);
        const violations = violationMessagesFromJson(
          match.hard_constraint_violations,
        );

        return (
          <div
            key={`${match.property_id}-${match.client_id}`}
            className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
          >
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                className={`capitalize ${matchLevelClass(match.match_level)}`}
              >
                {match.match_level}
              </StatusBadge>
              <span className="font-medium text-slate-950">
                {getClientName(match)}
              </span>
              <span className="text-xs text-slate-500">
                Score {match.score ?? 0} / Completeness{" "}
                {match.data_completeness ?? 0}
              </span>
            </div>
            {violations[0] ? (
              <p className="mt-1 text-xs font-medium text-amber-800">
                Needs review: {violations[0]}
              </p>
            ) : null}
            {reasons.length > 0 ? (
              <ul className="mt-1 space-y-1 text-xs leading-5 text-slate-600">
                {reasons.slice(0, 2).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
