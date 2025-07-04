'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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

export default function PollPage() {
  const params = useParams();
  const pollId = params.id as string;

  const [pollData, setPollData] = useState<PollData | null>(null);
  const [voted, setVoted] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Функция для получения данных с сервера
  const fetchPollData = async () => {
    try {
      const response = await axios.get(`${API_URL}/poll/${pollId}`);
      setPollData(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch poll data:", error);
      setError('Не удалось загрузить опрос');
      setLoading(false);
    }
  };

  // Проверяем localStorage при загрузке
  useEffect(() => {
    const savedVote = localStorage.getItem(`poll_vote_${pollId}`);
    if (savedVote) {
      setVoted(savedVote);
    }
  }, [pollId]);

  // Основной эффект для поллинга
  useEffect(() => {
    if (pollId) {
      fetchPollData();
      const intervalId = setInterval(fetchPollData, 3000);
      return () => clearInterval(intervalId);
    }
  }, [pollId]);

  const handleVote = async (optionKey: string) => {
    if (voted) return;

    try {
      const response = await axios.post(`${API_URL}/poll/vote/${pollId}/${optionKey}`);
      setPollData(response.data);
      setVoted(optionKey);

      // Сохраняем голос в localStorage
      localStorage.setItem(`poll_vote_${pollId}`, optionKey);
    } catch (error) {
      console.error("Failed to cast vote:", error);
    }
  };

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gray-100 font-sans">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Загрузка опроса...</p>
        </div>
      </main>
    );
  }

  if (error || !pollData) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gray-100 font-sans">
        <div className="w-full max-w-2xl p-8 space-y-6 bg-white rounded-xl shadow-lg text-center">
          <h1 className="text-2xl font-bold text-red-600">Ошибка</h1>
          <p className="text-gray-600">{error || 'Опрос не найден'}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Вернуться к главной
          </Link>
        </div>
      </main>
    );
  }

  const totalVotes = Object.values(pollData.options).reduce((sum, option) => sum + option.votes, 0);

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-100 font-sans">
      <div className="w-full max-w-2xl p-8 space-y-6 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <Link
            href="/"
            className="text-blue-500 hover:text-blue-700 underline mb-4 inline-block"
          >
            ← Вернуться к главной
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">{pollData.question}</h1>
          <p className="text-sm text-gray-500 mt-2">
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
                  <span className="text-sm font-medium text-gray-500">
                    {option.votes} голосов ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8">
                  <div
                    className="bg-blue-500 h-8 rounded-full transition-all duration-500 ease-in-out"
                    style={{ width: `${percentage}%` }}
                  />
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
      </div>
    </main>
  );
}
