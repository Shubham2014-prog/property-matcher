import type { MatchLevel } from "@/types/database";
import type { ReactNode } from "react";

export function lookupStatusClass(status: string) {
  if (status === "success" || status === "reviewed") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "failed") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  if (status === "pending") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function matchLevelClass(level: MatchLevel) {
  if (level === "strong") {
    return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  }

  if (level === "stretch") {
    return "bg-amber-50 text-amber-800 ring-amber-200";
  }

  if (level === "possible") {
    return "bg-sky-50 text-sky-800 ring-sky-200";
  }

  return "bg-slate-50 text-slate-700 ring-slate-200";
}

type StatusBadgeProps = {
  children: ReactNode;
  className?: string;
};

export function StatusBadge({ children, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}
