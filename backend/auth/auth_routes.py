from fastapi import APIRouter, HTTPException
from datetime import datetime
from bson import ObjectId
import traceback

from mongo import users_collection
from auth_utils import hash_password, verify_password, create_access_token
from schemas import RegisterRequest, LoginRequest

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register")
def register(data: RegisterRequest):
    try:
        print(f"Register request: {data.email}")
        existing = users_collection.find_one({"email": data.email})
        print(f"Existing user check done: {existing}")
        
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        hashed = hash_password(data.password)
        print("Password hashed")

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
        print(f"User created: {user_id}")

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
        print(f"ERROR in register: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


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
        print(f"ERROR in login: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
