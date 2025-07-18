import os
import httpx # Библиотека для асинхронных HTTP запросов
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv # Для загрузки переменных из .env файла
from pydantic import BaseModel

# Загружаем переменные окружения из .env файла
load_dotenv()

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

# --- Получение API ключа и базового URL ---
API_KEY = os.getenv("OPENWEATHER_API_KEY")
WEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5/weather"
FORECAST_BASE_URL = "https://api.openweathermap.org/data/2.5/forecast"

class Coords(BaseModel):
    lat: float
    lon: float

# --- Эндпоинт API ---
@app.get("/api/weather/{city}")
async def get_weather(city: str):
    if not API_KEY:
        raise HTTPException(status_code=500, detail="API key is not configured")

    # Параметры для запроса к OpenWeatherMap
    params = {
        "q": city,
        "appid": API_KEY,
        "units": "metric",  # для получения температуры в Цельсиях
        "lang": "ru"        # для получения описания на русском
    }

    # Асинхронно запрашиваем данные с погодного сервиса
    async with httpx.AsyncClient() as client:
        response = await client.get(WEATHER_BASE_URL, params=params)

    # Обработка ошибок
    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="City not found")
    if response.status_code != 200:
        # Возвращаем текст ошибки от самого API OpenWeather
        error_detail = response.json().get("message", "Error fetching weather data")
        raise HTTPException(status_code=response.status_code, detail=error_detail)

    data = response.json()

    # Возвращаем только нужную нам часть данных
    relevant_data = {
        "city_name": data["name"],
        "temperature": data["main"]["temp"],
        "description": data["weather"][0]["description"],
        "icon": data["weather"][0]["icon"]
    }

    return relevant_data

@app.get("/api/forecast/{city}")
async def forecast(city: str):
    if not API_KEY:
        raise HTTPException(status_code=500, detail="API key is not configured")
    params = {
        "q": city,
        "appid": API_KEY,
        "units": "metric",
        "lang": "ru"
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(FORECAST_BASE_URL, params=params)
    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="City not found")
    if response.status_code != 200:
        error_detail = response.json().get("message", "Error fetching forecast data")
        raise HTTPException(status_code=response.status_code, detail=error_detail)
    data = response.json()
    forecast_data = []
    for item in data["list"]:
        forecast_data.append({
            "date": item["dt_txt"],
            "temperature": item["main"]["temp"],
            "description": item["weather"][0]["description"],
            "icon": item["weather"][0]["icon"]
        })
    return {
        "city_name": data["city"]["name"],
        "forecast": forecast_data
    }

@app.post("/api/weather/coords")
async def get_weather_by_coords(coords: Coords):
    if not API_KEY:
        raise HTTPException(status_code=500, detail="API key is not configured")

    params = {
        "lat": coords.lat,
        "lon": coords.lon,
        "appid": API_KEY,
        "units": "metric",
        "lang": "ru"
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(WEATHER_BASE_URL, params=params)

    if response.status_code != 200:
        error_detail = response.json().get("message", "Error fetching weather data")
        raise HTTPException(status_code=response.status_code, detail=error_detail)

    data = response.json()

    relevant_data = {
        "city_name": data["name"],
        "temperature": data["main"]["temp"],
        "description": data["weather"][0]["description"],
        "icon": data["weather"][0]["icon"]
    }

    return relevant_data