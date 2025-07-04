from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List
import json
import os
import uuid
from datetime import datetime

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

# --- Файл для сохранения данных ---
DATA_FILE = "polls.json"


# --- Инициализация данных ---
def load_polls_data():
    """Загружает данные опросов из файла"""
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            pass

    # Возвращаем данные по умолчанию
    return {
        "polls": {
            "default": {
                "id": "default",
                "question": "Ваш любимый фреймворк для бэкенда?",
                "options": {
                    "fastapi": {"label": "FastAPI", "votes": 0},
                    "django": {"label": "Django", "votes": 0},
                    "flask": {"label": "Flask", "votes": 0},
                    "nodejs": {"label": "Node.js (Express)", "votes": 0}
                },
                "created_at": datetime.now().isoformat()
            }
        }
    }


def save_polls_data():
    """Сохраняет данные опросов в файл"""
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(polls_data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Ошибка при сохранении данных: {e}")


# Загружаем данные при старте
polls_data = load_polls_data()


# --- Pydantic модели ---
class PollOption(BaseModel):
    label: str
    votes: int = 0


class PollResponse(BaseModel):
    id: str
    question: str
    options: Dict[str, PollOption]
    created_at: str


class CreatePollRequest(BaseModel):
    question: str
    options: List[str]


class PollsListResponse(BaseModel):
    polls: Dict[str, PollResponse]


# --- Эндпоинты API ---

@app.get("/api/polls", response_model=PollsListResponse)
async def get_all_polls():
    """Возвращает все опросы"""
    return {"polls": polls_data["polls"]}


@app.get("/api/poll/{poll_id}", response_model=PollResponse)
async def get_poll_data(poll_id: str = "default"):
    """Возвращает данные конкретного опроса"""
    if poll_id not in polls_data["polls"]:
        raise HTTPException(status_code=404, detail="Poll not found")
    return polls_data["polls"][poll_id]


@app.post("/api/poll/create", response_model=PollResponse)
async def create_poll(poll_request: CreatePollRequest):
    """Создает новый опрос"""
    if len(poll_request.options) < 2:
        raise HTTPException(status_code=400, detail="Poll must have at least 2 options")

    poll_id = str(uuid.uuid4())
    options = {}

    for i, option_text in enumerate(poll_request.options):
        option_key = f"option_{i}"
        options[option_key] = {"label": option_text, "votes": 0}

    new_poll = {
        "id": poll_id,
        "question": poll_request.question,
        "options": options,
        "created_at": datetime.now().isoformat()
    }

    polls_data["polls"][poll_id] = new_poll
    save_polls_data()

    return new_poll


@app.post("/api/poll/vote/{poll_id}/{option_key}", response_model=PollResponse)
async def cast_vote(poll_id: str, option_key: str):
    """Принимает голос за один из вариантов в конкретном опросе"""
    if poll_id not in polls_data["polls"]:
        raise HTTPException(status_code=404, detail="Poll not found")

    poll = polls_data["polls"][poll_id]
    if option_key not in poll["options"]:
        raise HTTPException(status_code=404, detail="Option not found")

    poll["options"][option_key]["votes"] += 1
    save_polls_data()

    return poll


# Совместимость со старым API (для опроса по умолчанию)
@app.get("/api/poll", response_model=PollResponse)
async def get_default_poll_data():
    """Возвращает опрос по умолчанию (для обратной совместимости)"""
    return await get_poll_data("default")


@app.post("/api/poll/vote/{option_key}", response_model=PollResponse)
async def cast_vote_default(option_key: str):
    """Принимает голос в опросе по умолчанию (для обратной совместимости)"""
    return await cast_vote("default", option_key)