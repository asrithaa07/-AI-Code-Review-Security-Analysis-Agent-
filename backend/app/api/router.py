from fastapi import APIRouter

from app.api import knowledge_base, submissions

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(submissions.router, prefix="/submissions", tags=["submissions"])
api_router.include_router(knowledge_base.router, prefix="/knowledge-base", tags=["knowledge-base"])
