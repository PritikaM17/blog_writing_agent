from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from bwa_backend import graph
from typing import List
from sse_starlette.sse import EventSourceResponse
import json

from schemas import BlogDetail, BlogSummary, GenerateRequest
import storage

app = FastAPI(title="Blog Writing Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"]
)

Path("images").mkdir(exist_ok=True)
app.mount("/images", StaticFiles(directory="images"), name='images')

def _save_result(topic: str, result: dict) -> dict:
    """Turn the graph's final state into a saved blog"""

    plan = result['plan']
    images = [
        spec['filename']
        for spec in result.get("image_specs", [])
        if (Path('images') / spec['filename']).exists()
    ]

    return storage.save_blog(
        topic=topic,
        title=plan.blog_title,
        markdown=result['final'],
        mode=result.get('mode', 'closed_book'),
        images=images,
        evidence=[e.model_dump() for e in result.get('evidence', [])]
    )

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/blogs/generate", response_model=BlogDetail)
def generate_blog(req: GenerateRequest):
    try:
        result = graph.invoke({"topic": req.topic})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    return _save_result(req.topic, result)

def _sse(event: str, data: dict) -> dict:
    """Format one SSE message"""
    return {"event": event, "data": json.dumps(data, ensure_ascii=False)}

@app.post("/api/blogs/stream")
def stream_blog(req: GenerateRequest):
    def event_generator():
        state = {}
        sections_done = 0
        total_sections = 0

        yield _sse("status", {"step": "start", "message": "Starting..."})

        try:
            for update in graph.stream({"topic": req.topic}, stream_mode="updates"):
                for node, data in update.items():
                    data = data or {}
                    if node == "worker":
                        sections_done += 1
                        yield _sse("section", {"done": sections_done, "total": total_sections})
                        if sections_done == total_sections:
                            yield _sse("status", {"step": "images", "message": "Adding images..."})
                        continue
                    state.update(data)

                    if node == "router":
                        msg = f"Mode: {data['mode']}"
                        if data.get("needs_research"):
                            msg += f" - researching {len(data.get('queries', []))} queries"
                        yield _sse("status", {"step": "router", "message": msg})
                    
                    elif node == 'research':
                        n = len(data.get("evidence", []))
                        yield _sse("status", {"step": "research", "message": f"Found {n} sources"})
                    
                    elif node == "orchestrator":
                        plan = data['plan']
                        total_sections = len(plan.tasks)
                        yield _sse("plan", {
                            "title": plan.blog_title,
                            "sections": [t.title for t in plan.tasks]
                        })

            blog = _save_result(req.topic, state)
            yield _sse("done", blog)
        
        except Exception as e:
            yield _sse("error", {"detail": str(e)})

    return EventSourceResponse(event_generator())


@app.get('/api/blogs', response_model=List[BlogSummary])
def list_blogs():
    return storage.list_blogs()

@app.get('/api/blogs/{slug}', response_model=BlogDetail)
def get_blog(slug: str):
    blog = storage.get_blog(slug)
    if blog is None:
        raise HTTPException(status_code=404, detail='Blog not found')
    return blog

