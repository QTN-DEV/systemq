from fastapi import APIRouter

router = APIRouter()


@router.get("/", tags=["Health"])
async def read_root() -> dict[str, str]:
    return {"message": "Hello, World!"}
