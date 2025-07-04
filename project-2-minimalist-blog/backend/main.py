from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

# --- Конфигурация приложения ---
app = FastAPI()

# --- Настройка CORS ---
origins = [
    "http://localhost:3000",
    "http://localhost",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic модели (структура данных) ---
class PostBase(BaseModel):
    slug: str
    title: str

class PostFull(PostBase):
    content: str
    author: str
    date: str

# --- База данных в памяти (простой список Python) ---
fake_posts_db: List[PostFull] = [
    PostFull(
        slug="first-post",
        title="Мой первый пост",
        content="Это содержимое моего первого поста. Здесь много интересного текста о веб-разработке!",
        author="First Author",
        date="2024-04-01"
    ),
    PostFull(
        slug="fastapi-and-nextjs",
        title="FastAPI + Next.js = ❤️",
        content="Сочетание FastAPI для бэкенда и Next.js для фронтенда - это мощный и современный стек. Асинхронность FastAPI и рендеринг Next.js творят чудеса.",
        author="Second Author",
        date="2024-04-02"
    ),
    PostFull(
        slug="why-i-love-python",
        title="Почему я люблю Python",
        content="Python - это язык с простым синтаксисом и огромной экосистемой. Он отлично подходит для бэкенда, анализа данных и многого другого.",
        author="Third Author",
        date="2024-04-03"
    )
]

# --- Эндпоинты API ---

# Отдает краткий список всех постов (slug и title)
@app.get("/api/posts", response_model=List[PostBase])
async def get_all_posts():
    return fake_posts_db

# Отдает полную информацию о конкретном посте по его slug
@app.get("/api/posts/{slug}", response_model=PostFull)
async def get_post_by_slug(slug: str):
    for post in fake_posts_db:
        if post.slug == slug:
            return post
    raise HTTPException(status_code=404, detail="Post not found")

@app.get("/")
async def root():
    return {"message": "Blog API is running"}