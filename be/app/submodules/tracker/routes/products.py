"""Product routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.submodules.tracker.schemas.product import (
    ProductCreate,
    ProductResponse,
    ProductUpdate,
)
from app.submodules.tracker.services import product as product_service
from app.submodules.tracker.services.product import (
    ProductKeyConflictError,
    ProductNotFoundError,
)

router = APIRouter(prefix="/products", tags=["Tracker"])


@router.get("/", response_model=list[ProductResponse])
async def list_products() -> list[ProductResponse]:
    products = await product_service.list_products()
    return [ProductResponse.model_validate(p) for p in products]


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(payload: ProductCreate) -> ProductResponse:
    try:
        p = await product_service.create_product(
            payload.key,
            payload.name,
            description=payload.description,
            status=payload.status,
            owner_id=payload.owner_id,
            target_date=payload.target_date,
        )
    except ProductKeyConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return ProductResponse.model_validate(p)


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str) -> ProductResponse:
    try:
        p = await product_service.get_product_by_id(product_id)
    except ProductNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return ProductResponse.model_validate(p)


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(product_id: str, payload: ProductUpdate) -> ProductResponse:
    try:
        p = await product_service.update_product(product_id, **payload.model_dump(exclude_unset=True))
    except ProductNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ProductKeyConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return ProductResponse.model_validate(p)
