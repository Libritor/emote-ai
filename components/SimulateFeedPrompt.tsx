"use client";

import { useState } from "react";
import { useFeedClock } from "@/lib/feedClock";

function toDateTimeLocal(iso: string): string {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string): Date {
  const [datePart, timePart = "00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

export default function SimulateFeedPrompt({
  className = "",
  onSimulate,
}: {
  className?: string;
  onSimulate?: () => void;
}) {
  const { simulate } = useFeedClock();
  const [value, setValue] = useState(() => toDateTimeLocal(new Date().toISOString()));
  const applySimulation = () => {
    simulate(fromDateTimeLocal(value));
    onSimulate?.();
  };

  return (
    <div className={`card p-5 ${className}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="font-black text-ink">No open matches on the live feed.</div>
          <p className="mt-1 text-sm text-muted">
            There is nothing to show for this live view right now, but you can simulate
            the TxLINE data at any tournament date and time.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="feed-sim-as-of">Simulation date and time</label>
          <input
            id="feed-sim-as-of"
            type="datetime-local"
            value={value}
            onChange={(event) => setValue(event.currentTarget.value)}
            className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm font-semibold text-ink outline-none transition focus:border-primary"
          />
          <button className="btn btn-primary" onClick={applySimulation}>
            Simulate matchday
          </button>
        </div>
      </div>
    </div>
  );
}
