from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from datetime import datetime
from bson import ObjectId

from backend.mongo import users_collection
from backend.auth_utils import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/register")
def register(data: RegisterRequest):

    if users_collection.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(data.password)

    user_doc = {
        "email": data.email,
        "password_hash": hashed,
        "full_name": data.full_name,
        "role": "student",
        "is_active": True,
        "is_verified": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = users_collection.insert_one(user_doc)
    user_id = str(result.inserted_id)

    access_token = create_access_token({
        "sub": user_id,
        "email": data.email,
        "role": "student"
    })

    return {
        "access_token": access_token,
        "user": {
            "id": user_id,
            "email": data.email,
            "role": "student",
            "full_name": data.full_name
        }
    }


@router.post("/login")
def login(data: LoginRequest):

    user = users_collection.find_one({"email": data.email})

    if not user:
        raise HTTPException(status_code=400, detail="Invalid credentials")

    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    user_id = str(user["_id"])

    access_token = create_access_token({
        "sub": user_id,
        "email": user["email"],
        "role": user["role"]
    })

    return {
        "access_token": access_token,
        "user": {
            "id": user_id,
            "email": user["email"],
            "role": user["role"],
            "full_name": user["full_name"]
        }
    }