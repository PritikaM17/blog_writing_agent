from __future__ import annotations

import operator
import os
import re
from datetime import date, timedelta
from pathlib import Path
from typing import TypedDict, List, Optional, Literal, Annotated

from pydantic import BaseModel, Field

from langgraph.graph import StateGraph, START, END
from langgraph.types import Send

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_tavily import TavilySearch

from dotenv import load_dotenv


load_dotenv()

class Task(BaseModel):
    id: int
    title: str

    goal: str = Field(
        ...,
        description="One sentence describing what the reader should be able to do/understand after this section.",
    )
    bullets: List[str] = Field(
        ...,
        min_length=3,
        max_length=6,
        description="3–6 concrete, non-overlapping subpoints to cover in this section.",
    )
    target_words: int = Field(..., description="Target word count for this section (120–550).")

    tags: List[str] = Field(default_factory=list)
    requires_research: bool = False
    requires_citations: bool = False
    requires_code: bool = False

class Plan(BaseModel):
    blog_title: str
    audience: str
    tone: str
    blog_kind: Literal[
        # existing
        "explainer", "tutorial", "news_roundup", "comparison", "system_design",
        # new
        "listicle",        # "10 best...", "7 ways to..."
        "guide",           # long beginner or ultimate guides (travel guide, investing 101)
        "review",          # a product, book, movie, restaurant, place or app
        "personal_story",  # experiences, journeys, lessons learned
        "opinion",         # opinion pieces, hot takes, arguments
        "recipe",          # food and drink (ingredients plus steps)
        "case_study",      # business or success stories, real examples
    ] = "explainer"
    constraints: List[str] = Field(default_factory=list)
    tasks: List[Task]


class EvidenceItem(BaseModel):
    title: str
    url: str
    published_at: Optional[str] = None  # keep if Tavily provides; DO NOT rely on it
    snippet: Optional[str] = None
    source: Optional[str] = None


class RouterDecision(BaseModel):
    needs_research: bool
    mode: Literal["closed_book", "hybrid", "open_book"]
    queries: List[str] = Field(default_factory=list)


class EvidencePack(BaseModel):
    evidence: List[EvidenceItem] = Field(default_factory=list)

class ImageSpec(BaseModel):
    placeholder: str = Field(..., description="e.g. [[IMAGE_1]]")
    filename: str = Field(..., description="Save under images/, e.g. qkv_flow.png")
    alt: str
    caption: str
    prompt: str = Field(..., description="Prompt to send to the image model.")
    size: Literal["1024x1024", "1024x1536", "1536x1024"] = "1024x1024"
    quality: Literal["low", "medium", "high"] = "medium"


class GlobalImagePlan(BaseModel):
    md_with_placeholders: str
    images: List[ImageSpec] = Field(default_factory=list)

class State(TypedDict):
    topic: str

    # routing / research
    mode: str
    needs_research: bool
    queries: List[str]
    evidence: List[EvidenceItem]
    plan: Optional[Plan]

    # workers
    sections: Annotated[List[tuple[int, str]], operator.add]  # (task_id, section_md)

    # reducer/image
    merged_md: str
    md_with_placeholders: str
    image_specs: List[dict]

    final: str

llm = ChatOpenAI(model="gpt-4.1-mini")

ROUTER_SYSTEM = """You are a routing module for a versatile blog planner.
Topics can be about anything: technology, travel, food, health & wellness, personal finance,
lifestyle, parenting, culture, entertainment, business, education, opinion, personal stories, and more.

Decide whether web research is needed BEFORE planning.

Modes:
- closed_book (needs_research=false):
  Evergreen topics where accuracy does not depend on recent facts
  (concepts, life lessons, personal essays, timeless how-tos, recipes, habits, reflections).
- hybrid (needs_research=true):
  Mostly evergreen but benefits from current examples, stats, products, prices, places, or trends
  (e.g. "best budget travel tips", "how to start investing", "skincare routine for beginners").
- open_book (needs_research=true):
  Mostly volatile: news, "this week", "latest", trends, rankings, releases, events, pricing,
  sports results, policy/regulation, celebrity or entertainment updates.

If needs_research=true:
- Output 3–10 high-signal queries.
- Queries should be scoped and specific (avoid vague single-word queries).
- If the user asked for "last week/this week/latest/2026" etc., reflect that constraint IN THE QUERIES.
- For health, finance, or legal topics, include at least one query aimed at authoritative sources.
"""

def router_node(state: State) -> dict:
    
    topic = state["topic"]
    decider = llm.with_structured_output(RouterDecision)
    decision = decider.invoke(
        [
            SystemMessage(content=ROUTER_SYSTEM),
            HumanMessage(content=f"Topic: {topic}"),
        ]
    )

    return {
        "needs_research": decision.needs_research,
        "mode": decision.mode,
        "queries": decision.queries,
    }

def route_next(state: State) -> str:
    return "research" if state["needs_research"] else "orchestrator"

def _tavily_search(query: str, max_results: int = 5) -> List[dict]:
    
    tool = TavilySearch(max_results=max_results)
    results = tool.invoke({"query": query})

    normalized: List[dict] = []
    for r in results or []:
        normalized.append(
            {
                "title": r.get("title") or "",
                "url": r.get("url") or "",
                "snippet": r.get("content") or r.get("snippet") or "",
                "published_at": r.get("published_date") or r.get("published_at"),
                "source": r.get("source"),
            }
        )
    return normalized
RESEARCH_SYSTEM = """You are a research synthesizer for blog writing on any subject.

Given raw web search results, produce a deduplicated list of EvidenceItem objects.

Rules:
- Only include items with a non-empty url.
- Prefer relevant + authoritative sources suited to the topic: reputable news outlets,
  official/government sites, academic or medical institutions, established publications,
  official brand/company pages, and well-known expert blogs. Avoid spammy or low-quality content farms.
- If a published date is explicitly present in the result payload, keep it as YYYY-MM-DD.
  If missing or unclear, set published_at=null. Do NOT guess.
- Keep snippets short.
- Deduplicate by URL.
"""

def research_node(state: State) -> dict:

    # take the first 10 queries from state
    queries = (state.get("queries", []) or [])
    max_results = 6

    raw_results: List[dict] = []

    for q in queries:
        raw_results.extend(_tavily_search(q, max_results=max_results))

    if not raw_results:
        return {"evidence": []}

    extractor = llm.with_structured_output(EvidencePack)
    pack = extractor.invoke(
        [
            SystemMessage(content=RESEARCH_SYSTEM),
            HumanMessage(content=f"Raw results:\n{raw_results}"),
        ]
    )

    # Deduplicate by URL
    dedup = {}
    for e in pack.evidence:
        if e.url:
            dedup[e.url] = e

    return {"evidence": list(dedup.values())}

ORCH_SYSTEM = """You are a senior, versatile blog editor and content strategist who can plan
great posts on ANY subject: technology, travel, food, lifestyle, health & wellness, finance,
business, career, parenting, education, culture, entertainment, opinion, and personal stories.
Your job is to produce a clear, engaging outline for a blog post.

Step 1 — Understand the topic:
- Infer the most likely audience (e.g. beginners, enthusiasts, professionals, parents, travelers)
  and set `audience` accordingly. Do NOT assume the reader is a developer unless the topic is technical.
- Pick a fitting `tone` (e.g. friendly & conversational, inspiring, practical, witty, authoritative,
  reflective, storytelling).
- Choose `blog_kind` from:
  * explainer      -> explains a concept, idea, or "what is / why" topic
  * tutorial       -> step-by-step how-to with a concrete end result (DIY, setup, coding)
  * guide          -> long, comprehensive beginner or "ultimate" guide covering many sub-topics
  * listicle       -> numbered list post ("10 best...", "7 ways to...")
  * comparison     -> X vs Y, pros & cons between options
  * review         -> evaluation of one product, book, movie, restaurant, place, or app
  * recipe         -> food or drink preparation
  * personal_story -> first-person experience, journey, or lessons learned
  * opinion        -> argues a clear viewpoint or take
  * case_study     -> real-world example of a business, project, or success/failure
  * news_roundup   -> recent news, trends, events, updates
  * system_design  -> ONLY for software architecture topics

Hard requirements:
- Create 5–9 sections (tasks) suitable for the topic and audience.
- Each task must include:
  1) goal (1 sentence)
  2) 3–6 bullets that are concrete, specific, and non-overlapping
  3) target word count (120–550)
- Start with an engaging hook/intro section and end with a conclusion / takeaway / call-to-action section.

Quality bar:
- Bullets must give the writer real substance: specific tips, examples, anecdotes, facts,
  steps, comparisons, or insights — not vague filler.
- Build a natural narrative flow from section to section.
- Where relevant to the topic, include some of these:
  * practical tips, steps, or checklists the reader can act on
  * real-world examples, stories, or scenarios
  * common mistakes, myths, or pitfalls
  * pros & cons / costs / trade-offs
  * safety, health, financial, or privacy caveats (when relevant)
- Set requires_code=True ONLY for technical/programming topics where a code snippet genuinely helps.
  For non-technical topics, requires_code must be False.

Grounding rules:
- Mode closed_book: keep it evergreen; do not depend on evidence.
- Mode hybrid:
  - Use evidence for up-to-date examples (stats, products, places, prices, trends, releases) in bullets.
  - Mark sections using fresh info as requires_research=True and requires_citations=True.
- Mode open_book:
  - Set blog_kind = "news_roundup".
  - Every section is about summarizing events + implications.
  - DO NOT include tutorial/how-to sections unless user explicitly asked for that.
  - If evidence is empty or insufficient, create a plan that transparently says "insufficient sources"
    and includes only what can be supported.

Output must strictly match the Plan schema.
"""

def orchestrator_node(state: State) -> dict:
    planner = llm.with_structured_output(Plan)

    evidence = state.get("evidence", [])
    mode = state.get("mode", "closed_book")
    plan = planner.invoke(
        [
            SystemMessage(content=ORCH_SYSTEM),
            HumanMessage(
                content=(
                    f"Topic: {state['topic']}\n"
                    f"Mode: {mode}\n\n"
                    f"Evidence (ONLY use for fresh claims; may be empty):\n"
                    f"{[e.model_dump() for e in evidence][:16]}"
                )
            ),
        ]
    )

    return {"plan": plan}

def fanout(state: State):
    return [
        Send(
            "worker",
            {
                "task": task.model_dump(),
                "topic": state["topic"],
                "mode": state["mode"],
                "plan": state["plan"].model_dump(),
                "evidence": [e.model_dump() for e in state.get("evidence", [])],
            },
        )
        for task in state["plan"].tasks
    ]

WORKER_SYSTEM = """You are a skilled, versatile blog writer who adapts to any subject and audience —
from technology and business to travel, food, lifestyle, health, finance, culture, and personal stories.
Write ONE section of a blog post in Markdown.

Hard constraints:
- Follow the provided Goal and cover ALL Bullets in order (do not skip or merge bullets).
- Stay close to Target words (±15%).
- Output ONLY the section content in Markdown (no blog title H1, no extra commentary).
- Start with a '## <Section Title>' heading.

Scope guard:
- If blog_kind == "news_roundup": do NOT turn this into a tutorial/how-to guide.
  Do NOT explain how to find or fetch the news unless bullets explicitly ask for it.
  Focus on summarizing events and why they matter to the reader.

Structure by blog_kind (apply only what fits THIS section):
- listicle: each item as a numbered '### N. Item Name' sub-heading with a short explanation.
- recipe: include ingredients (with quantities) and numbered steps where the bullets call for them;
  add tips, substitutions, or serving suggestions.
- review: be balanced; cover pros and cons; the final section gives a clear verdict or rating.
- personal_story: first person, vivid details, honest emotions; end with a lesson or takeaway.
- opinion: state the position clearly, back it with reasons or evidence, and address a counter-argument.
- case_study: cover background, challenge, approach, results (with numbers if available), and lessons.
- guide: thorough but scannable; use sub-headings and practical tips.
- comparison: use a Markdown table where it helps to compare options side by side.

Grounding policy:
- If mode == open_book:
  - Do NOT introduce any specific event/company/model/funding/policy claim unless it is supported by provided Evidence URLs.
  - For each event claim, attach a source as a Markdown link: ([Source](URL)).
  - Only use URLs provided in Evidence. If not supported, write: "Not found in provided sources."
- If requires_citations == true:
  - For outside-world claims, cite Evidence URLs the same way.
- Evergreen reasoning is OK without citations unless requires_citations is true.

Code:
- If requires_code == true, include at least one minimal, correct code snippet relevant to the bullets.
- If requires_code == false, do NOT include code.

Voice & style:
- Match the given Audience and Tone exactly (e.g. warm and conversational for lifestyle,
  vivid and sensory for travel/food, clear and trustworthy for health/finance,
  precise for technical topics).
- Write like a human blogger: engaging, relatable, and easy to read. Use examples, mini-stories,
  analogies, or concrete details to bring points to life.
- Short paragraphs, subheadings or bullets/numbered lists where helpful, code fences only for code.
- Avoid fluff, clichés, and generic filler; every paragraph should give the reader something useful or interesting.
- For health, finance, or legal topics, stay accurate and add a brief caveat to consult a professional where appropriate.
"""

def worker_node(payload: dict) -> dict:
    
    task = Task(**payload["task"])
    plan = Plan(**payload["plan"])
    evidence = [EvidenceItem(**e) for e in payload.get("evidence", [])]
    topic = payload["topic"]
    mode = payload.get("mode", "closed_book")

    bullets_text = "\n- " + "\n- ".join(task.bullets)

    evidence_text = ""
    if evidence:
        evidence_text = "\n".join(
            f"- {e.title} | {e.url} | {e.published_at or 'date:unknown'}".strip()
            for e in evidence[:20]
        )

    section_md = llm.invoke(
        [
            SystemMessage(content=WORKER_SYSTEM),
            HumanMessage(
                content=(
                    f"Blog title: {plan.blog_title}\n"
                    f"Audience: {plan.audience}\n"
                    f"Tone: {plan.tone}\n"
                    f"Blog kind: {plan.blog_kind}\n"
                    f"Constraints: {plan.constraints}\n"
                    f"Topic: {topic}\n"
                    f"Mode: {mode}\n\n"
                    f"Section title: {task.title}\n"
                    f"Goal: {task.goal}\n"
                    f"Target words: {task.target_words}\n"
                    f"Tags: {task.tags}\n"
                    f"requires_research: {task.requires_research}\n"
                    f"requires_citations: {task.requires_citations}\n"
                    f"requires_code: {task.requires_code}\n"
                    f"Bullets:{bullets_text}\n\n"
                    f"Evidence (ONLY use these URLs when citing):\n{evidence_text}\n"
                )
            ),
        ]
    ).content.strip()

    return {"sections": [(task.id, section_md)]}

def merge_content(state: State) -> dict:

    plan = state["plan"]

    ordered_sections = [md for _, md in sorted(state["sections"], key=lambda x: x[0])]
    body = "\n\n".join(ordered_sections).strip()
    merged_md = f"# {plan.blog_title}\n\n{body}\n"
    return {"merged_md": merged_md}


DECIDE_IMAGES_SYSTEM = """You are an expert blog editor and visual content curator for blogs on any subject.
Decide if images are needed for THIS blog.

Rules:
- Max 3 images total.
- Each image must add real value: help understanding, set the mood, or make the post more engaging.
- Choose the image style that fits the topic:
  * technical topics -> clean diagrams/flowcharts with short labels
  * travel/food/lifestyle -> realistic, vivid, appealing photos or scenes
  * how-tos -> step illustrations or simple infographics
  * finance/business/health -> clean infographics, charts, or illustrative scenes
  * stories/opinion -> evocative, thematic illustrations
- Write detailed image prompts (subject, setting, style, mood, composition). Avoid text-heavy images.
- Insert placeholders exactly: [[IMAGE_1]], [[IMAGE_2]], [[IMAGE_3]].
- If no images needed: md_with_placeholders must equal input and images=[].
Return strictly GlobalImagePlan.
"""

def decide_images(state: State) -> dict:
    planner = llm.with_structured_output(GlobalImagePlan)
    merged_md = state["merged_md"]
    plan = state['plan']

    assert plan is not None

    image_plan = planner.invoke(
        [
            SystemMessage(content=DECIDE_IMAGES_SYSTEM),
            HumanMessage(
                content=(
                    f"Blog kind: {plan.blog_kind}\n"
                    f"Topic: {state['topic']}\n\n"
                    "Insert placeholders + propose image prompts.\n\n"
                    f"{merged_md}"
                )
            )
        ]
    )

    return {
        "md_with_placeholders": image_plan.md_with_placeholders,
        "image_specs": [img.model_dump() for img in image_plan.images],
    }


def _gemini_generate_image_bytes(prompt: str) -> bytes:

    from google import genai
    from google.genai import types

    api_key = os.environ.get("GOOGLE_API_KEY")

    if not api_key:
        raise RuntimeError("Google Api Key not available")
    
    client = genai.Client(api_key=api_key)

    resp = client.models.generate_content(
        model="gemini-3.1-flash-image",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE"],
            safety_settings=[
                types.SafetySetting(
                    category="HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold="BLOCK_ONLY_HIGH",
                )
            ],
        ),
    )

    parts = getattr(resp, "parts", None)
    if not parts and getattr(resp, "candidates", None):
        try:
            parts = resp.candidates[0].content.parts
        except Exception:
            parts = None

    if not parts:
        raise RuntimeError("No image content returned (safety/quota/SDK change).")

    for part in parts:
        inline = getattr(part, "inline_data", None)
        if inline and getattr(inline, "data", None):
            return inline.data

    raise RuntimeError("No inline image bytes found in response.")

def generate_and_place_images(state: State) -> dict:

    plan = state["plan"]
    assert plan is not None

    md = state.get("md_with_placeholders") or state["merged_md"]
    image_specs = state.get("image_specs", []) or []

    # If no images requested, just write merged markdown
    if not image_specs:
        return {"final": md}

    images_dir = Path("images")
    images_dir.mkdir(exist_ok=True)

    for spec in image_specs:
        placeholder = spec["placeholder"]
        filename = spec["filename"]
        out_path = images_dir / filename

        # generate only if needed
        if not out_path.exists():
            try:
                img_bytes = _gemini_generate_image_bytes(spec["prompt"])
                out_path.write_bytes(img_bytes)
            except Exception as e:
                # graceful fallback: keep doc usable
                prompt_block = (
                    f"> **[IMAGE GENERATION FAILED]** {spec.get('caption','')}\n>\n"
                    f"> **Alt:** {spec.get('alt','')}\n>\n"
                                        f"> **Prompt:** {spec.get('prompt','')}\n>\n"
                    f"> **Error:** {e}\n"
                )
                md = md.replace(placeholder, prompt_block)
                continue

        img_md = f"![{spec['alt']}](images/{filename})\n*{spec['caption']}*"
        md = md.replace(placeholder, img_md)

    return {"final": md}

reducer_graph = StateGraph(State)
reducer_graph.add_node("merge_content", merge_content)
reducer_graph.add_node("decide_images", decide_images)
reducer_graph.add_node("generate_and_place_images", generate_and_place_images)
reducer_graph.add_edge(START, "merge_content")
reducer_graph.add_edge("merge_content", "decide_images")
reducer_graph.add_edge("decide_images", "generate_and_place_images")
reducer_graph.add_edge("generate_and_place_images", END)
reducer_subgraph = reducer_graph.compile()

g = StateGraph(State)
g.add_node("router", router_node)
g.add_node("research", research_node)
g.add_node("orchestrator", orchestrator_node)
g.add_node("worker", worker_node)
g.add_node("reducer", reducer_subgraph)

g.add_edge(START, "router")
g.add_conditional_edges("router", route_next, {"research": "research", "orchestrator": "orchestrator"})
g.add_edge("research", "orchestrator")

g.add_conditional_edges("orchestrator", fanout, ["worker"])
g.add_edge("worker", "reducer")
g.add_edge("reducer", END)

graph = g.compile()