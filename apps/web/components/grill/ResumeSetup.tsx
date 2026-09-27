"use client";

import { useRef, useState, type DragEvent } from "react";
import { Banner, Button, Card } from "@/components/ui";
import { errorMessage, uploadResume } from "@/lib/api";
import { cn } from "@/lib/cn";

export const MIN_RESUME_CHARS = 80;
export const MAX_RESUME_CHARS = 20_000;

export interface ResumeSetupProps {
  resume: string;
  onResumeChange: (text: string) => void;
  onStart: () => void;
}

export function ResumeSetup({ resume, onResumeChange, onStart }: ResumeSetupProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileNote, setFileNote] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const { text, pages } = await uploadResume(file);
      onResumeChange(text);
      setFileNote(`${file.name}${pages ? ` · ${pages} ${pages === 1 ? "page" : "pages"}` : ""}. Check the text below and fix anything that came through garbled.`);
    } catch (uploadError) {
      setError(errorMessage(uploadError));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(false);
    void handleFile(event.dataTransfer.files[0]);
  };

  const length = resume.trim().length;
  const ready = length >= MIN_RESUME_CHARS;

  return (
    <div className="grid gap-5">
      <Card padded={false}>
        <label
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors",
            dragging ? "border-synapse bg-synapse/10" : "border-line-strong hover:border-synapse/60 hover:bg-ink-800/60",
            uploading && "pointer-events-none opacity-70",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
            className="sr-only"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8 text-synapse" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8Z" />
            <path d="M14 3.5V8h4.5M12 17v-6m-2.5 2.5L12 11l2.5 2.5" />
          </svg>
          <span className="font-semibold text-fg">{uploading ? "Reading your resume…" : "Drop your resume here, or click to upload"}</span>
          <span className="text-sm text-fg-subtle">PDF, .txt, or .md, up to 5 MB</span>
        </label>
      </Card>

      {error ? (
        <Banner tone="danger" title="Upload failed" onDismiss={() => setError(null)}>
          {error}
        </Banner>
      ) : null}

      <Card>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="resume-text" className="font-semibold text-fg">
            Resume text
          </label>
          <span className={cn("text-xs tabular-nums", length > MAX_RESUME_CHARS ? "text-danger" : "text-fg-subtle")}>
            {length.toLocaleString()} / {MAX_RESUME_CHARS.toLocaleString()}
          </span>
        </div>
        {fileNote ? <p className="mb-3 text-sm text-fg-muted">{fileNote}</p> : null}
        <textarea
          id="resume-text"
          value={resume}
          onChange={(event) => onResumeChange(event.target.value)}
          placeholder="…or paste your resume here."
          rows={12}
          maxLength={MAX_RESUME_CHARS}
          className="scrollbar-thin w-full resize-y rounded-xl border border-line bg-ink-900 px-4 py-3 font-mono text-sm leading-relaxed text-fg placeholder:text-fg-faint focus:border-synapse focus:outline-none"
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-fg-subtle">Stays in this browser.</p>
          <Button size="lg" onClick={onStart} disabled={!ready} rightIcon={<span aria-hidden="true">→</span>}>
            Start the grill
          </Button>
        </div>
      </Card>
    </div>
  );
}
