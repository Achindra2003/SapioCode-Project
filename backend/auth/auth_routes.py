from fastapi import APIRouter, HTTPException
from datetime import datetime
from bson import ObjectId
import logging

from mongo import users_collection
from auth_utils import hash_password, verify_password, create_access_token
from schemas import RegisterRequest, LoginRequest

logger = logging.getLogger("sapiocode.auth")

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register")
def register(data: RegisterRequest):
    try:
        existing = users_collection.find_one({"email": data.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        hashed = hash_password(data.password)
        role = data.role if data.role in ("student", "teacher") else "student"

        user_doc = {
            "email": data.email,
            "password_hash": hashed,
            "full_name": data.full_name,
            "role": role,
            "is_active": True,
            "is_verified": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        result = users_collection.insert_one(user_doc)
        user_id = str(result.inserted_id)
        logger.info("User registered: role=%s", role)

        access_token = create_access_token({
            "sub": user_id,
            "email": data.email,
            "role": role
        })

        return {
            "access_token": access_token,
            "user": {
                "id": user_id,
                "email": data.email,
                "role": role,
                "full_name": data.full_name
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Register failed")
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")


@router.post("/login")
def login(data: LoginRequest):
    try:
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
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Login failed")
        raise HTTPException(status_code=500, detail="Login failed. Please try again.")
