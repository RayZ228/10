'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';

// Типы для данных голосования
interface PollOption {
  label: string;
  votes: number;
}
interface PollData {
  id: string;
  question: string;
  options: Record<string, PollOption>;
  created_at: string;
}

const API_URL = 'http://localhost:8000/api';

export default function Home() {
  const [pollData, setPollData] = useState<PollData | null>(null);
  const [voted, setVoted] = useState<string | null>(null);

  // Функция для получения данных с сервера
  const fetchPollData = async () => {
    try {
      const response = await axios.get(`${API_URL}/poll`);
      setPollData(response.data);
    } catch (error) {
      console.error("Failed to fetch poll data:", error);
    }
  };

  // Проверяем localStorage при загрузке
  useEffect(() => {
    const savedVote = localStorage.getItem('poll_vote_default');
    if (savedVote) {
      setVoted(savedVote);
    }
  }, []);

  // Основной эффект для поллинга
  useEffect(() => {
    fetchPollData(); // Получаем данные при первой загрузке
    const intervalId = setInterval(fetchPollData, 3000); // Опрашиваем сервер каждые 3 секунды

    // Очищаем интервал при размонтировании компонента, чтобы избежать утечек памяти
    return () => clearInterval(intervalId);
  }, []);

  const handleVote = async (optionKey: string) => {
    if (voted) return; // Позволяем голосовать только один раз
    try {
      const response = await axios.post(`${API_URL}/poll/vote/${optionKey}`);
      setPollData(response.data); // Сразу обновляем данные, не дожидаясь следующего опроса
      setVoted(optionKey); // Отмечаем, что пользователь проголосовал

      // Сохраняем голос в localStorage
      localStorage.setItem('poll_vote_default', optionKey);
    } catch (error) {
      console.error("Failed to cast vote:", error);
    }
  };

  const totalVotes = pollData ? Object.values(pollData.options).reduce((sum, option) => sum + option.votes, 0) : 0;

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-100 font-sans">
      <div className="w-full max-w-2xl p-8 space-y-6 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Система опросов в реальном времени</h1>
          <div className="flex justify-center gap-4 mb-6">
            <Link
              href="/create"
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              Создать опрос
            </Link>
            <Link
              href="/polls"
              className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
            >
              Все опросы
            </Link>
          </div>
        </div>

        {pollData ? (
          <>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{pollData.question}</h2>
              <p className="text-sm text-gray-500">
                Создан: {new Date(pollData.created_at).toLocaleString('ru-RU')}
              </p>
            </div>
            <div className="space-y-4">
              {Object.entries(pollData.options).map(([key, option]) => {
                const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-gray-700">{option.label}</span>
                      <span className="text-sm font-medium text-gray-500">{option.votes} голосов ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-8">
                      <div
                        className="bg-blue-500 h-8 rounded-full transition-all duration-500 ease-in-out text-white flex items-center px-2"
                        style={{ width: `${percentage}%` }}
                      >
                      </div>
                    </div>
                    <button
                      onClick={() => handleVote(key)}
                      disabled={!!voted}
                      className={`w-full mt-2 py-2 text-white font-semibold rounded-lg transition-colors ${
                        voted ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'
                      } ${voted === key ? '!bg-blue-700' : ''}`}
                    >
                      {voted === key ? 'Ваш голос' : voted ? 'Уже проголосовали' : 'Голосовать'}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="text-center text-gray-600 font-bold pt-4 border-t">
              Всего голосов: {totalVotes}
            </div>
            {voted && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <p className="text-green-700 font-medium">
                  Спасибо за участие в опросе! Ваш голос сохранен.
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-gray-500">Загрузка данных голосования...</p>
        )}
      </div>
    </main>
  );
}