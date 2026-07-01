"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

interface ComboboxProps {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  allowCustom?: boolean;
  disabled?: boolean;
  className?: string;
  emptyMessage?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "เลือกหรือพิมพ์...",
  required,
  allowCustom = true,
  disabled,
  className = "",
  emptyMessage,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(-1);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  const updatePos = useCallback(() => {
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    setPanelPos({ top: r.bottom + 4, left: r.left, width: r.width });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      const inContainer = containerRef.current?.contains(t) ?? false;
      const inPanel = panelRef.current?.contains(t) ?? false;
      if (!inContainer && !inPanel) handleClose();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function handleClose() {
    setOpen(false);
    setQuery("");
    setActiveIdx(-1);
  }

  function handleSelect(opt: string) {
    onChange(opt);
    handleClose();
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    if (allowCustom) onChange(v);
    if (!open) setOpen(true);
    setActiveIdx(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      updatePos();
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        if (activeIdx >= 0) {
          e.preventDefault();
          const opt = filtered[activeIdx];
          if (opt) handleSelect(opt);
        }
        break;
      case "Escape":
        handleClose();
        break;
      case "Tab":
        if (open) handleClose();
        break;
    }
  }

  const displayValue = open ? query : value;

  const panel = mounted && open && filtered.length > 0 && createPortal(
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: panelPos.top,
        left: panelPos.left,
        width: panelPos.width,
        zIndex: 9999,
        backgroundColor: "#ffffff",
        border: "1px solid #E2E8F0",
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
        overflow: "hidden",
        maxHeight: "248px",
        overflowY: "auto",
        animation: "cbxIn 0.14s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      {filtered.map((opt, i) => (
        <button
          key={opt + i}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }}
          onMouseEnter={() => setActiveIdx(i)}
          style={{
            width: "100%",
            textAlign: "left",
            padding: "10px 14px",
            fontSize: "13.5px",
            backgroundColor: i === activeIdx ? "#F0FDF4" : "transparent",
            color: i === activeIdx ? "#15803D" : "#374151",
            fontWeight: i === activeIdx ? 500 : 400,
            cursor: "pointer",
            border: "none",
            display: "block",
            transition: "background-color 0.08s",
          }}
        >
          {opt}
        </button>
      ))}
    </div>,
    document.body
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          borderRadius: "10px",
          border: open ? "1.5px solid #16A34A" : "1px solid #E2E8F0",
          backgroundColor: "white",
          boxShadow: open ? "0 0 0 3px rgba(22,163,74,0.10)" : "none",
          transition: "border-color 0.12s, box-shadow 0.12s",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <input
          ref={inputRef}
          required={required}
          disabled={disabled}
          type="text"
          placeholder={placeholder}
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => {
            setOpen(true);
            setQuery(value);
            updatePos();
            setTimeout(() => inputRef.current?.select(), 0);
          }}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            padding: "9px 12px",
            fontSize: "14px",
            outline: "none",
            background: "transparent",
            borderRadius: "10px 0 0 10px",
            color: "#111827",
            cursor: disabled ? "not-allowed" : "text",
            minWidth: 0,
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (open) {
              handleClose();
            } else {
              setOpen(true);
              updatePos();
              inputRef.current?.focus();
            }
          }}
          style={{
            padding: "0 10px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "#9CA3AF",
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <ChevronDown
            size={14}
            style={{
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.18s",
            }}
          />
        </button>
      </div>
      {panel}
      {mounted && open && filtered.length === 0 && emptyMessage && panelPos.width > 0 && createPortal(
        <div style={{
          position: "fixed",
          top: panelPos.top,
          left: panelPos.left,
          width: panelPos.width,
          zIndex: 9999,
          backgroundColor: "#ffffff",
          border: "1px solid #E2E8F0",
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
          padding: "12px 14px",
          fontSize: "13px",
          color: "#9CA3AF",
        }}>
          {emptyMessage}
        </div>,
        document.body
      )}
    </div>
  );
}
