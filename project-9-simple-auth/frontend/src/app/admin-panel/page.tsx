'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const API_URL = 'http://localhost:8000/api';

export default function AdminPanel() {
  const [adminMessage, setAdminMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/login');
      return;
    }
    const fetchAdminData = async () => {
      try {
        const response = await axios.get(`${API_URL}/admin-data`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAdminMessage(response.data.message);
      } catch (error) {
        setAdminMessage('Нет доступа или сессия истекла.');
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, [router]);

  if (loading) return <p className="text-center mt-10">Загрузка...</p>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Админ-панель</h1>
      <p className="bg-yellow-100 border border-yellow-400 rounded p-4 text-lg">{adminMessage}</p>
    </div>
  );
}
