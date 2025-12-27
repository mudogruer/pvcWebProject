from fastapi import APIRouter

from ..data_loader import load_json

router = APIRouter(prefix="/stock", tags=["stock"])


@router.get("/items")
def list_items():
  return load_json("stockItems.json")


@router.get("/movements")
def list_movements():
  return load_json("stockMovements.json")


@router.get("/reservations")
def list_reservations():
  return load_json("reservations.json")

