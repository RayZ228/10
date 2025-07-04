from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Annotated
import uuid
from datetime import datetime, timedelta

app = FastAPI()

# --- CORS ---
origins = ["http://localhost:3000"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- Фейковые данные ---
FAKE_USER = {"username": "user", "password": "password", "role": "admin"}  # Можно поменять на 'user' для обычного пользователя

# --- Живые токены ---
TOKENS = {}  # token: {"username": str, "role": str, "created_at": datetime}
TOKEN_LIFETIME = timedelta(hours=1)

# --- Модель ответа для токена ---
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

# --- Зависимость для проверки токена и роли ---
async def token_verifier(authorization: Annotated[str, Header()], admin_only: bool = False):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication scheme")
    token = authorization.split(" ")[1]
    token_data = TOKENS.get(token)
    if not token_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    # Проверка времени жизни токена
    if datetime.utcnow() - token_data["created_at"] > TOKEN_LIFETIME:
        del TOKENS[token]
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    # Проверка роли
    if admin_only and token_data["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return token_data

# --- Эндпоинты API ---

@app.post("/api/login", response_model=Token)
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    """Проверяет логин/пароль и возвращает токен."""
    if form_data.username == FAKE_USER["username"] and form_data.password == FAKE_USER["password"]:
        token = str(uuid.uuid4())
        TOKENS[token] = {
            "username": FAKE_USER["username"],
            "role": FAKE_USER["role"],
            "created_at": datetime.utcnow()
        }
        return {"access_token": token, "token_type": "bearer", "role": FAKE_USER["role"]}
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

@app.post("/api/logout")
async def logout(authorization: Annotated[str, Header()]):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication scheme")
    token = authorization.split(" ")[1]
    if token in TOKENS:
        del TOKENS[token]
    return {"detail": "Logged out"}

@app.get("/api/secret-data")
async def get_secret_data(token_data: Annotated[dict, Depends(token_verifier)]):
    return {"message": f"Привет, {token_data['username']}! Секретное сообщение: 42."}

@app.get("/api/admin-data")
async def get_admin_data(token_data: Annotated[dict, Depends(lambda authorization: token_verifier(authorization, admin_only=True))]):
    return {"message": f"Привет, {token_data['username']}! Это админ-панель."}