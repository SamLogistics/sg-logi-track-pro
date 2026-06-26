import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";

const STORAGE_KEY_PREFIX = "job_autocomplete_";

export function getStoredSuggestions(field) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + field);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveToSuggestions(field, value) {
  if (!value?.trim()) return;
  const existing = getStoredSuggestions(field);
  const updated = [value, ...existing.filter(v => v !== value)].slice(0, 20);
  localStorage.setItem(STORAGE_KEY_PREFIX + field, JSON.stringify(updated));
}

export default function AutocompleteInput({ field, value, onChange, placeholder, className, inputClassName }) {
  const [suggestions, setSuggestions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setSuggestions(getStoredSuggestions(field));
  }, [field]);

  useEffect(() => {
    if (value) {
      setFiltered(suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()) && s !== value));
    } else {
      setFiltered(suggestions);
    }
  }, [value, suggestions]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <div ref={ref} className={`relative ${className || ''}`}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={inputClassName}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 w-full bg-popover border border-border rounded-md shadow-md mt-1 max-h-48 overflow-auto text-sm">
          {filtered.map((s, i) => (
            <li
              key={i}
              className="px-3 py-1.5 cursor-pointer hover:bg-muted"
              onMouseDown={() => handleSelect(s)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}