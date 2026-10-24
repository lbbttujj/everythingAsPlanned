"use client";

import { type ReactNode, useEffect, useRef } from "react";

type ActionModalViewportProps = {
  enabled: boolean;
  children: ReactNode;
};

export function ActionModalViewport({ enabled, children }: ActionModalViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const viewport = window.visualViewport;
    if (!enabled || !container || !viewport) return;

    let frameId = 0;

    const updateViewport = () => {
      container.style.top = `${viewport.offsetTop}px`;
      container.style.height = `${viewport.height}px`;
      container.style.bottom = "auto";

      const dialog = container.querySelector<HTMLElement>(".action-modal-sheet");
      const focused = document.activeElement;
      if (!dialog || !(focused instanceof HTMLElement) || !focused.matches("input, textarea, select") || !dialog.contains(focused)) return;

      // Scroll only the sheet, preserving the page position behind the modal.
      const fieldBounds = focused.getBoundingClientRect();
      const dialogBounds = dialog.getBoundingClientRect();
      const padding = 12;
      if (fieldBounds.top < dialogBounds.top + padding) {
        dialog.scrollTop += fieldBounds.top - dialogBounds.top - padding;
      } else if (fieldBounds.bottom > dialogBounds.bottom - padding) {
        dialog.scrollTop += fieldBounds.bottom - dialogBounds.bottom + padding;
      }
    };

    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateViewport);
    };

    updateViewport();
    viewport.addEventListener("resize", scheduleUpdate);
    viewport.addEventListener("scroll", scheduleUpdate);
    container.addEventListener("focusin", scheduleUpdate);

    return () => {
      window.cancelAnimationFrame(frameId);
      viewport.removeEventListener("resize", scheduleUpdate);
      viewport.removeEventListener("scroll", scheduleUpdate);
      container.removeEventListener("focusin", scheduleUpdate);
      container.style.removeProperty("top");
      container.style.removeProperty("height");
      container.style.removeProperty("bottom");
    };
  }, [enabled]);

  return <div ref={containerRef} className={enabled ? "action-modal-viewport" : undefined}>{children}</div>;
}
