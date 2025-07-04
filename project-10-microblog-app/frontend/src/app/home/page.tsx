'use client';
import { useState, useEffect, FormEvent } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface Post {
  id: string;
  text: string;
  timestamp: string;
  owner_id: string;
  owner_username: string;
}
interface User { id: string; username: string; }

const API_URL = 'http://localhost:8000/api';

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const router = useRouter();

  const fetchLikes = async (posts: Post[]) => {
    const likesObj: Record<string, number> = {};
    const token = localStorage.getItem('auth_token');
    const likedSet = new Set<string>();
    await Promise.all(posts.map(async (post) => {
      try {
        const res = await axios.get(`${API_URL}/posts/${post.id}/likes`);
        likesObj[post.id] = res.data.likes;
        if (token) {
          // Проверяем, лайкнул ли текущий пользователь
          const likeRes = await axios.get(`${API_URL}/posts/${post.id}/likes`, { headers: { Authorization: `Bearer ${token}` } });
          if (likeRes.data.liked) likedSet.add(post.id);
        }
      } catch {}
    }));
    setLikes(likesObj);
    setLikedPosts(likedSet);
  };

  const fetchPosts = async () => {
    try {
      const res = await axios.get(`${API_URL}/posts`);
      setPosts(res.data);
      await fetchLikes(res.data);
    } catch (error) { console.error("Failed to fetch posts:", error); }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) router.push('/login');
    else {
      setUser(JSON.parse(storedUser));
      fetchPosts();
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleCreatePost = async (e: FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('auth_token');
    try {
      await axios.post(`${API_URL}/posts`, { text: newPostText }, { headers: { Authorization: `Bearer ${token}` } });
      setNewPostText('');
      fetchPosts(); // Обновляем ленту
    } catch (error) { console.error("Failed to create post:", error); }
  };

  const handleDeletePost = async (postId: string) => {
    const token = localStorage.getItem('auth_token');
    if (window.confirm("Вы уверены, что хотите удалить этот пост?")) {
        try {
            await axios.delete(`${API_URL}/posts/${postId}`, { headers: { Authorization: `Bearer ${token}` } });
            fetchPosts(); // Обновляем ленту
        } catch (error) { console.error("Failed to delete post:", error); }
    }
  };

  const handleLike = async (postId: string) => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    try {
      if (likedPosts.has(postId)) {
        await axios.delete(`${API_URL}/posts/${postId}/like`, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(`${API_URL}/posts/${postId}/like`, {}, { headers: { Authorization: `Bearer ${token}` } });
      }
      fetchPosts();
    } catch (error) { console.error('Like error:', error); }
  };

  if (!user) return <p>Загрузка...</p>;

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Лента</h1>
        <div>
          <span>Привет, <strong>{user.username}</strong>!</span>
          <button onClick={handleLogout} className="ml-4 bg-red-500 text-white py-1 px-3 rounded text-sm">Выйти</button>
        </div>
      </header>

      <form onSubmit={handleCreatePost} className="mb-8 p-4 bg-white rounded-lg shadow">
        <textarea
          value={newPostText}
          onChange={(e) => setNewPostText(e.target.value)}
          placeholder="Что нового?"
          className="w-full p-2 border rounded mb-2"
          rows={3}
        ></textarea>
        <button type="submit" className="w-full bg-green-500 text-white p-2 rounded">Опубликовать</button>
      </form>

      <div className="space-y-4">
        {posts.map(post => (
          <div key={post.id} className="bg-white p-4 rounded-lg shadow relative">
            <p>{post.text}</p>
            <div className="text-xs text-gray-500 mt-2 flex items-center gap-2">
              <a href={`/users/${post.owner_username}`} className="font-bold text-blue-600 hover:underline">{post.owner_username}</a>
              <span>- {new Date(post.timestamp).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => handleLike(post.id)}
                className={`text-lg ${likedPosts.has(post.id) ? 'text-red-500' : 'text-gray-400'} hover:text-red-600`}
                title={likedPosts.has(post.id) ? 'Убрать лайк' : 'Поставить лайк'}
              >
                ♥
              </button>
              <span>{likes[post.id] || 0}</span>
            </div>
            {user && user.id === post.owner_id && (
              <button onClick={() => handleDeletePost(post.id)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold">✕</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}