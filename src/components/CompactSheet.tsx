import type { ReactNode } from "react";

export interface CompactSheetTab<T extends string> {
  id: T;
  label: string;
  content: ReactNode;
}

interface CompactSheetProps<T extends string> {
  tabs: CompactSheetTab<T>[];
  activeTab: T | null;
  onChange: (tab: T | null) => void;
}

export function CompactSheet<T extends string>({ tabs, activeTab, onChange }: CompactSheetProps<T>) {
  const active = tabs.find((tab) => tab.id === activeTab);
  return (
    <aside className={`compact-sheet${active ? " is-open" : ""}`} aria-label="Mobile observation controls">
      {active && <div className="compact-sheet-content">{active.content}</div>}
      <nav className="compact-sheet-tabs" aria-label="Observation panels">
        {tabs.map((tab) => <button type="button" key={tab.id} aria-pressed={activeTab === tab.id} onClick={() => onChange(activeTab === tab.id ? null : tab.id)}>{tab.label}</button>)}
      </nav>
    </aside>
  );
}
