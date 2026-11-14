from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from bwa_backend import graph
from typing import List

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

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/blogs/generate", response_model=BlogDetail)
def generate_blog(req: GenerateRequest):
    try:
        result = graph.invoke({"topic": req.topic})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    plan = result['plan']
    images = [
        spec['filename']
        for spec in result.get("image_specs", [])
        if (Path('images') / spec['filename']).exists()
    ]

    return storage.save_blog(
        topic=req.topic,
        title=plan.blog_title,
        markdown=result['final'],
        mode=result.get('mode', 'closed_book'),
        images=images,
        evidence=[e.model_dump() for e in result.get('evidence', [])]
    )


@app.get('/api/blogs', response_model=List[BlogSummary])
def list_blogs():
    return storage.list_blogs()

@app.get('/api/blogs/{slug}', response_model=BlogDetail)
def get_blog(slug: str):
    blog = storage.get_blog(slug)
    if blog is None:
        raise HTTPException(status_code=404, detail='Blog not found')
    return blog