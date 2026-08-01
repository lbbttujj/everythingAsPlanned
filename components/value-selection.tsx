"use client";

import { valueLabels, valueOrder } from "@/lib/value-labels";
import type { LifeValueId } from "@/lib/types";

type ValueSelectionProps = {
  values: LifeValueId[];
  onToggle: (value: LifeValueId) => void;
};

export function ValueSelection({ values, onToggle }: ValueSelectionProps) {
  return (
    <div className="value-grid">
      {valueOrder.map((value) => {
        const active = values.includes(value);
        const meta = valueLabels[value];

        return (
          <button
            key={value}
            type="button"
            className={`value-chip ${active ? "is-active" : ""}`}
            onClick={() => onToggle(value)}
          >
            <span>{meta.title}</span>
            <small>{meta.hint}</small>
          </button>
        );
      })}
    </div>
  );
}
