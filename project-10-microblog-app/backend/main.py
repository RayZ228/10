import json
import uuid
from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Annotated
import aiofiles
from sqlmodel import SQLModel, Field, Session, select
from db import engine, get_session, init_db
from typing import Optional
from sqlalchemy import desc

app = FastAPI()

# --- CORS ---
origins = ["http://localhost:3000"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

DB_FILE = "data/posts.json"

# --- Фейковые данные пользователей ---
# В реальном приложении пароли должны быть хэшированы
FAKE_USERS_DB = {
    "user1": {"id": "1", "username": "user1", "password": "password1"},
    "user2": {"id": "2", "username": "user2", "password": "password2"},
}

# --- SQLModel модели ---
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str
    password: str

class Post(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    text: str
    timestamp: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    owner_id: int
    owner_username: str

class Like(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int
    post_id: int

class PostCreate(SQLModel):
    text: str

# --- Инициализация БД при старте ---
@app.on_event("startup")
def on_startup():
    init_db()
    # Добавим тестовых пользователей, если их нет
    from sqlmodel import Session, select
    with Session(engine) as session:
        for username, password in [("user1", "password1"), ("user2", "password2")]:
            user = session.exec(select(User).where(User.username == username)).first()
            if not user:
                session.add(User(username=username, password=password))
        session.commit()

# --- Вспомогательные функции для работы с файлом ---
async def read_posts() -> List[Post]:
    async with aiofiles.open(DB_FILE, mode='r', encoding='utf-8') as f:
        content = await f.read()
        return [Post(**item) for item in json.loads(content)] if content else []

async def write_posts(posts: List[Post]):
    export_data = [post.model_dump(mode='json') for post in posts]
    async with aiofiles.open(DB_FILE, mode='w', encoding='utf-8') as f:
        await f.write(json.dumps(export_data, indent=4, ensure_ascii=False))

# --- Аутентификация ---
async def get_current_user(authorization: Annotated[str, Header()], session: Session = Depends(get_session)) -> User:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid scheme")
    token = authorization.split(" ")[1]
    user = session.exec(select(User).where(User.username == token)).first()
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    return user

@app.post("/api/login")
async def login(form_data: Dict[str, str], session: Session = Depends(get_session)):
    username = form_data.get("username")
    password = form_data.get("password")
    user = session.exec(select(User).where(User.username == username)).first()
    if not user or user.password != password:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect username or password")
    return {"access_token": user.username, "token_type": "bearer", "user": {"id": user.id, "username": user.username}}

# --- Эндпоинты для постов ---
@app.get("/api/posts", response_model=List[Post])
async def list_posts(session: Session = Depends(get_session)):
    posts = session.exec(select(Post).order_by(desc(Post.timestamp))).all()
    return posts

@app.post("/api/posts", response_model=Post, status_code=201)
async def create_post(post_data: PostCreate, current_user: Annotated[User, Depends(get_current_user)], session: Session = Depends(get_session)):
    new_post = Post(
        text=post_data.text,
        owner_id=current_user.id,
        owner_username=current_user.username
    )
    session.add(new_post)
    session.commit()
    session.refresh(new_post)
    return new_post

@app.delete("/api/posts/{post_id}", status_code=204)
async def delete_post(post_id: int, current_user: Annotated[User, Depends(get_current_user)], session: Session = Depends(get_session)):
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    if post.owner_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized to delete this post")
    session.delete(post)
    session.commit()

# --- Лайки ---
@app.post("/api/posts/{post_id}/like")
async def like_post(post_id: int, current_user: Annotated[User, Depends(get_current_user)], session: Session = Depends(get_session)):
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    like = session.exec(select(Like).where(Like.user_id == current_user.id, Like.post_id == post_id)).first()
    if like:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Already liked")
    new_like = Like(user_id=current_user.id, post_id=post_id)
    session.add(new_like)
    session.commit()
    return {"detail": "Liked"}

@app.delete("/api/posts/{post_id}/like")
async def unlike_post(post_id: int, current_user: Annotated[User, Depends(get_current_user)], session: Session = Depends(get_session)):
    like = session.exec(select(Like).where(Like.user_id == current_user.id, Like.post_id == post_id)).first()
    if not like:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Like not found")
    session.delete(like)
    session.commit()
    return {"detail": "Unliked"}

@app.get("/api/posts/{post_id}/likes")
async def get_post_likes(post_id: int, session: Session = Depends(get_session)):
    likes = session.exec(select(Like).where(Like.post_id == post_id)).all()
    return {"likes": len(likes)}

# --- Посты пользователя ---
@app.get("/api/users/{username}/posts", response_model=List[Post])
async def user_posts(username: str, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.username == username)).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    posts = session.exec(select(Post).where(Post.owner_id == user.id).order_by(desc(Post.timestamp))).all()
    return posts