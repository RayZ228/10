'use client';

import { useState, useEffect, FormEvent } from 'react';
import axios from 'axios';
import Image from 'next/image';

interface WeatherData {
  city_name: string;
  temperature: number;
  description: string;
  icon: string;
}

interface ForecastData {
  city_name: string;
  forecast: {
    date: string;
    temperature: number;
    description: string;
    icon: string;
  }[];
}

const API_URL = 'http://localhost:8000/api';

export default function Home() {
  const [city, setCity] = useState('Almaty'); // Default city
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchWeatherByCity = async (cityName: string) => {
    setLoading(true);
    setError('');
    setWeather(null);
    setForecast(null);
    try {
      const weatherResponse = await axios.get(`${API_URL}/weather/${cityName}`);
      setWeather(weatherResponse.data);

      const forecastResponse = await axios.get(`${API_URL}/forecast/${cityName}`);
      setForecast(forecastResponse.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Не удалось загрузить данные о погоде.');
    } finally {
      setLoading(false);
    }
  };

  const fetchWeatherByCoords = async (lat: number, lon: number) => {
    setLoading(true);
    setError('');
    setWeather(null);
    setForecast(null);
    try {
      const weatherResponse = await axios.post(`${API_URL}/weather/coords`, { lat, lon });
      setWeather(weatherResponse.data);

      const forecastResponse = await axios.get(`${API_URL}/forecast/${weatherResponse.data.city_name}`);
      setForecast(forecastResponse.data);
      setCity(weatherResponse.data.city_name); // Update city input
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Не удалось загрузить данные о погоде.');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchWeatherByCoords(latitude, longitude);
        },
        (err) => {
          console.error('Geolocation error:', err);
          setError('Не удалось получить местоположение. Используется город по умолчанию.');
          fetchWeatherByCity('Almaty');
        }
      );
    } else {
      setError('Геолокация не поддерживается вашим браузером.');
      fetchWeatherByCity('Almaty');
    }
  }, []);


  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (city.trim()) {
      fetchWeatherByCity(city.trim());
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-200 to-purple-300 p-4">
      <div className="w-full max-w-sm bg-white/50 backdrop-blur-md p-6 rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">Погода</h1>
        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Введите город"
            className="flex-grow p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold p-2 rounded-lg disabled:bg-blue-300"
          >
            {loading ? '...' : '➔'}
          </button>
        </form>

        {loading && <p className="text-center text-gray-700">Загрузка...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}

        {weather && !loading && (
          <div className="flex flex-col items-center text-center text-gray-900 mb-6">
            <h2 className="text-3xl font-semibold">{weather.city_name}</h2>
            <div className="flex items-center">
              <p className="text-6xl font-light">{Math.round(weather.temperature)}°C</p>
              <Image
                src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                alt={weather.description}
                width={100}
                height={100}
              />
            </div>
            <p className="text-lg capitalize">{weather.description}</p>
          </div>
        )}

        {forecast && !loading && (
          <div className="flex flex-col">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Прогноз на 5 дней</h3>
            <div className="space-y-3">
              {forecast.forecast.map((day) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between p-3 bg-white/30 rounded-lg"
                >
                  <div>
                    <p className="font-semibold text-gray-800">
                      {new Date(day.date).toLocaleDateString('ru-RU', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                    <p className="text-sm capitalize text-gray-700">{day.description}</p>
                  </div>
                  <div className="flex items-center">
                    <p className="text-lg text-gray-800">{Math.round(day.temperature)}°C</p>
                    <Image
                      src={`https://openweathermap.org/img/wn/${day.icon}.png`}
                      alt={day.description}
                      width={40}
                      height={40}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}