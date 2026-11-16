import { EventSourceParserStream } from "eventsource-parser/stream";
import type { BlogDetail, BlogSummary, StreamEvent } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"


export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message)
    }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, init);

    if (!res.ok) {
        let detail = res.statusText;
        try {
            const body = await res.json();
            detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);

        } catch {

        }
        throw new ApiError(res.status, detail)
    }

    return res.json() as Promise<T>
}

export async function listBlogs() {
    return await request<BlogSummary[]>("/api/blogs")
}

export async function getBlog(slug: string): Promise<BlogDetail | null> {
    try {
        return await request<BlogDetail>(`/api/blogs/${encodeURIComponent(slug)}`);
    } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null
        throw e
    }
}

export function imageUrl(filename: string): string {
    return `${API_URL}/images/${filename}`
}

export async function streamBlog(
    topic: string,
    onEvent: (event: StreamEvent) => void,
    signal?: AbortSignal,
): Promise<void> {
    const res = await fetch(`${API_URL}/api/blogs/stream`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({topic}),
        signal
    })

    if (!res.ok || !res.body) {
        let detail = res.statusText
        try {
            const body = await res.json()
            detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail)
        } catch {}
        throw new ApiError(res.status, detail)
    }

    const reader = res.body
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new EventSourceParserStream())
        .getReader()

    while (true) {
        const { value, done } = await reader.read()
        if (done) break;
        onEvent({event: value.event, data: JSON.parse(value.data)} as StreamEvent)
    }
}