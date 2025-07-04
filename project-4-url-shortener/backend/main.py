import secrets
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
import datetime

app = FastAPI()

# --- Настройка CORS ---
origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- "База данных" в памяти (словарь Python) ---
# Ключ - короткий код, значение - длинный URL
url_db = {}

# --- Pydantic модели ---
class URLCreate(BaseModel):
    long_url: HttpUrl # Pydantic проверит, что это валидный URL
    custom_code: str | None = None  # Необязательный параметр для пользовательского кода

class URLResponse(BaseModel):
    short_url: str
    clicks: int = 0

# --- Эндпоинты API ---

@app.post("/api/shorten")
def create_short_url(url_data: URLCreate, request: Request):
    """Создает короткий код для длинного URL."""
    long_url = str(url_data.long_url)
    custom_code = url_data.custom_code

    if custom_code:
        # Проверяем, что пользовательский код уникален
        if custom_code in url_db:
            raise HTTPException(status_code=400, detail="Custom code already exists")
        short_code = custom_code
    else:
        # Если пользовательский код не задан, генерируем случайный код
        # secrets.token_urlsafe(n) генерирует строку из n байт
        short_code = secrets.token_urlsafe(6)

    # Генерируем случайный безопасный код
    # secrets.token_urlsafe(n) генерирует строку из n байт
    short_code = secrets.token_urlsafe(6)

    # Убедимся, что код уникален (для простого примера можно пропустить)
    while short_code in url_db:
        short_code = secrets.token_urlsafe(6)

    url_db[short_code] = {
        "long_url": long_url,
        "clicks": 0,
        "created_at": datetime.datetime.utcnow()
    }

    # Формируем полный короткий URL для ответа
    base_url = str(request.base_url).rstrip('/')
    short_url = f"{base_url}{short_code}"

    return {"short_url": short_url, clicks: 0}

@app.get("/{short_code}")
async def redirect_to_long_url(short_code: str):
    entry = url_db.get(short_code)
    if not entry:
        raise HTTPException(status_code=404, detail="Short URL not found")

    created_at = entry["created_at"]
    expiration_date = created_at + datetime.timedelta(days=LINK_EXPIRATION_DAYS)
    if datetime.datetime.utcnow() > expiration_date:
        del url_db[short_code]  # Remove expired link
        raise HTTPException(status_code=404, detail="Short URL has expired")

    entry["clicks"] += 1

    return RedirectResponse(url=entry["long_url"])