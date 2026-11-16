export interface GenerateRequest {
    topic: string;
}

export interface BlogSummary {
    slug: string;
    title: string;
    topic: string;
    mode: string;
    created_at: string;
}

/** Matches EvidenceItem in bwa_backend.py */
export interface Evidence {
    title: string;
    url: string;
    published_at?: string | null;
    snippet?: string | null;
    source?: string | null;
}

export interface BlogDetail extends BlogSummary {
    markdown: string;
    images: string[];
    evidence: Evidence[];
}

export interface StatusEvent {
    event: "status";
    data: {step: string; message: string}
}

export interface PlanEvent {
    event: "plan"
    data: {title: string; sections: string[]}
}

export interface SectionEvent {
    event: "section";
    data: { done: number; total: number };
}

export interface DoneEvent {
    event: "done";
    data: BlogDetail;
}

export interface StreamErrorEvent {
    event: "error";
    data: { detail: string };
}

export type StreamEvent =
  | StatusEvent
  | PlanEvent
  | SectionEvent
  | DoneEvent
  | StreamErrorEvent;