import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Props = {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
};

export function MultiFilter({ label, options, selected, onChange }: Props) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(q.toLowerCase())).slice(0, 200),
    [options, q],
  );

  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex min-w-[9rem] items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
            selected.length
              ? "border-primary/60 bg-primary/10 text-foreground"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="truncate">
            {label}
            {selected.length ? ` · ${selected.length}` : ""}
          </span>
          <ChevronDown className="size-4 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Buscar ${label.toLowerCase()}...`}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-64 overflow-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">Nada encontrado</p>
          ) : (
            filtered.map((opt) => {
              const active = selected.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggle(opt)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-secondary"
                >
                  <span
                    className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                      active ? "border-primary bg-primary text-primary-foreground" : "border-border"
                    }`}
                  >
                    {active ? <Check className="size-3" /> : null}
                  </span>
                  <span className="truncate">{opt}</span>
                </button>
              );
            })
          )}
        </div>
        {selected.length ? (
          <button
            type="button"
            onClick={() => onChange([])}
            className="w-full border-t border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Limpar seleção
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
