'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface Post {
  id: string;
  text: string;
  timestamp: string;
  owner_id: string;
  owner_username: string;
}

const API_URL = 'http://localhost:8000/api';

export default function UserProfile({ params }: { params: { username: string } }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { username } = params;

  useEffect(() => {
    const fetchUserPosts = async () => {
      try {
        const res = await axios.get(`${API_URL}/users/${username}/posts`);
        setPosts(res.data);
      } catch (error) {
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchUserPosts();
  }, [username]);

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <h1 className="text-2xl font-bold mb-6">Посты пользователя: {username}</h1>
      {loading ? (
        <p>Загрузка...</p>
      ) : posts.length === 0 ? (
        <p>У пользователя нет постов.</p>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="bg-white p-4 rounded-lg shadow">
              <p>{post.text}</p>
              <div className="text-xs text-gray-500 mt-2">
                {new Date(post.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
      <button onClick={() => router.back()} className="mt-8 bg-gray-200 px-4 py-2 rounded">Назад</button>
    </div>
  );
}
