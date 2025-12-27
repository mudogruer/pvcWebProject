from fastapi import APIRouter, HTTPException

from ..data_loader import load_json

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _jobs():
  return load_json("jobs.json")


@router.get("/")
def list_jobs():
  return _jobs()


@router.get("/{job_id}")
def get_job(job_id: str):
  for job in _jobs():
    if job.get("id") == job_id:
      return job
  raise HTTPException(status_code=404, detail="Job not found")

