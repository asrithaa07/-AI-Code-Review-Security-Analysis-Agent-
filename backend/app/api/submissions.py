from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.submission import Language
from app.schemas.submission import (
    PasteSubmissionRequest,
    SubmissionListResponse,
    SubmissionResponse,
)
from app.services.code_validator import detect_language_from_filename
from app.services.submission_service import submission_service

router = APIRouter()

MAX_FILE_SIZE = 500_000  # 500 KB


@router.post("/paste", response_model=SubmissionResponse, status_code=201)
def submit_paste(
    payload: PasteSubmissionRequest,
    db: Session = Depends(get_db),
):
    submission = submission_service.create_paste_submission(
        db=db,
        source_code=payload.source_code,
        language=Language(payload.language.value),
        filename=payload.filename,
    )
    return submission


@router.post("/upload", response_model=SubmissionResponse, status_code=201)
async def submit_upload(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    language = detect_language_from_filename(file.filename)
    if language is None:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Only .py and .java files are allowed.",
        )

    raw = await file.read()
    if len(raw) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds maximum size of 500KB")

    try:
        source_code = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="File must be valid UTF-8 text") from exc

    submission = submission_service.create_upload_submission(
        db=db,
        source_code=source_code,
        language=language,
        filename=file.filename,
    )
    return submission


@router.get("/{submission_id}", response_model=SubmissionResponse)
def get_submission(submission_id: UUID, db: Session = Depends(get_db)):
    submission = submission_service.get_submission(db, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    return submission


@router.get("", response_model=SubmissionListResponse)
def list_submissions(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    items, total = submission_service.list_submissions(db, skip=skip, limit=limit)
    return SubmissionListResponse(items=items, total=total)
