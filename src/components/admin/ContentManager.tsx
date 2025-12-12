import { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { useToast } from '../../context/ToastContext';

interface Article {
    id: number;
    title: string;
    summary: string;
    content: string;
    author: string;
    imageUrl: string | null;
    createdAt: string;
}

interface Podcast {
    id: number;
    title: string;
    host: string;
    description: string;
    audioUrl: string;
    imageUrl: string | null;
    playCount: number;
    createdAt: string;
}

export default function ContentManager() {
    const [subTab, setSubTab] = useState<'articles' | 'podcasts'>('articles');

    // Articles State
    const [articles, setArticles] = useState<Article[]>([]);
    const [editingArticle, setEditingArticle] = useState<Article | null>(null);

    // Podcast State
    const [podcasts, setPodcasts] = useState<Podcast[]>([]);
    const [editingPodcast, setEditingPodcast] = useState<Podcast | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        fetchArticles();
        fetchPodcasts();
    }, []);

    const fetchArticles = async () => {
        const res = await fetch('/api/articles');
        if (res.ok) setArticles(await res.json());
    };

    const fetchPodcasts = async () => {
        const res = await fetch('/api/podcasts');
        if (res.ok) setPodcasts(await res.json());
    };

    const handleFileUpload = async (file: File | null, path: string): Promise<string | null> => {
        if (!file) return null;
        try {
            const storageRef = ref(storage, `${path}/${Date.now()}-${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            return await getDownloadURL(snapshot.ref);
        } catch (error) {
            console.error("Upload failed", error);
            alert("File upload failed");
            return null;
        }
    };

    // --- Article Logic ---
    const handleSubmitArticle = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const file = formData.get('image') as File;

        try {
            let imageUrl = editingArticle?.imageUrl || null;
            if (file && file.size > 0) {
                imageUrl = await handleFileUpload(file, 'articles');
            }

            const payload = {
                title: formData.get('title'),
                summary: formData.get('summary'),
                content: formData.get('content'),
                author: formData.get('author'),
                imageUrl: imageUrl
            };

            let res;
            if (editingArticle) {
                res = await fetch(`/api/articles/${editingArticle.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                res = await fetch('/api/articles', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            if (res.ok) {
                showToast('Article saved successfully', 'success');
                setEditingArticle(null);
                fetchArticles();
                (e.target as HTMLFormElement).reset();
            } else {
                throw new Error('Failed to save article');
            }
        } catch (error) {
            console.error(error);
            showToast('Error submitting article', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Podcast Logic ---
    const handleSubmitPodcast = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const audioFile = formData.get('audio') as File;
        const imageFile = formData.get('image') as File;

        try {
            let audioUrl = editingPodcast?.audioUrl || '';
            if (audioFile && audioFile.size > 0) {
                const url = await handleFileUpload(audioFile, 'podcasts/audio');
                if (url) audioUrl = url;
            }

            let imageUrl = editingPodcast?.imageUrl || null;
            if (imageFile && imageFile.size > 0) {
                imageUrl = await handleFileUpload(imageFile, 'podcasts/images');
            }

            if (!audioUrl) {
                showToast("Audio file is required", 'error');
                setIsSubmitting(false);
                return;
            }

            const payload = {
                title: formData.get('title'),
                description: formData.get('description'),
                host: formData.get('host'),
                audioUrl,
                imageUrl
            };

            let res;
            if (editingPodcast) {
                res = await fetch(`/api/podcasts/${editingPodcast.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                res = await fetch('/api/podcasts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            if (res.ok) {
                showToast('Podcast saved successfully', 'success');
                setEditingPodcast(null);
                fetchPodcasts();
                (e.target as HTMLFormElement).reset();
            } else {
                throw new Error('Failed to save podcast');
            }
        } catch (error) {
            console.error(error);
            showToast('Error submitting podcast', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded shadow">
            <div className="flex gap-4 mb-6 border-b pb-1">
                <button onClick={() => setSubTab('articles')} className={`px-4 py-2 ${subTab === 'articles' ? 'font-bold text-blue-600' : ''}`}>Articles</button>
                <button onClick={() => setSubTab('podcasts')} className={`px-4 py-2 ${subTab === 'podcasts' ? 'font-bold text-blue-600' : ''}`}>Podcasts</button>
            </div>

            {subTab === 'articles' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <form onSubmit={handleSubmitArticle} className="flex flex-col gap-3">
                        <h3 className="font-bold">{editingArticle ? 'Edit Article' : 'Add Article'}</h3>
                        {editingArticle && <button type="button" onClick={() => setEditingArticle(null)} className="text-sm text-red-500 text-left mb-2">Cancel Edit</button>}
                        <input name="title" defaultValue={editingArticle?.title} className="border p-2 rounded" placeholder="Title" required />
                        <input name="author" defaultValue={editingArticle?.author} className="border p-2 rounded" placeholder="Author" required />
                        <input name="summary" defaultValue={editingArticle?.summary} className="border p-2 rounded" placeholder="Summary" required />
                        <textarea name="content" defaultValue={editingArticle?.content} className="border p-2 rounded" placeholder="Content (Markdown)" rows={5} required />
                        <input type="file" name="image" className="border p-2 rounded" accept="image/*" />
                        <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSubmitting ? 'Saving Article...' : (editingArticle ? 'Update Article' : 'Create Article')}
                        </button>
                    </form>
                    <div className="space-y-4">
                        <h3 className="font-bold">Existing Articles</h3>
                        {articles.map(a => (
                            <div key={a.id} className="border p-3 rounded flex justify-between items-start group">
                                <div>
                                    <h4 className="font-bold">{a.title}</h4>
                                    <p className="text-xs text-gray-500">By {a.author}</p>
                                </div>
                                <div className="flex gap-2 opacity-10 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingArticle(a)} className="text-blue-500 text-sm">Edit</button>
                                    <button onClick={async () => {
                                        if (confirm('Delete Article?')) {
                                            await fetch(`/api/articles/${a.id}`, { method: 'DELETE' });
                                            fetchArticles();
                                        }
                                    }} className="text-red-500 text-sm">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {subTab === 'podcasts' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <form onSubmit={handleSubmitPodcast} className="flex flex-col gap-3">
                        <h3 className="font-bold">{editingPodcast ? 'Edit Podcast' : 'Add Podcast'}</h3>
                        {editingPodcast && <button type="button" onClick={() => setEditingPodcast(null)} className="text-sm text-red-500 text-left mb-2">Cancel Edit</button>}
                        <input name="title" defaultValue={editingPodcast?.title} className="border p-2 rounded" placeholder="Title" required />
                        <input name="host" defaultValue={editingPodcast?.host} className="border p-2 rounded" placeholder="Host" required />
                        <textarea name="description" defaultValue={editingPodcast?.description} className="border p-2 rounded" placeholder="Description" rows={3} required />

                        <label className="text-sm font-bold">Cover Image {editingPodcast && "(Leave empty to keep)"}</label>
                        <input type="file" name="image" className="border p-2 rounded" accept="image/*" />

                        <label className="text-sm font-bold">Audio File {editingPodcast && "(Leave empty to keep)"}</label>
                        <input type="file" name="audio" className="border p-2 rounded" accept="audio/*" required={!editingPodcast} />

                        <button type="submit" disabled={isSubmitting} className="bg-purple-600 text-white p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSubmitting ? 'Saving Podcast...' : (editingPodcast ? 'Update Podcast' : 'Upload Podcast')}
                        </button>
                    </form>
                    <div className="space-y-4">
                        <h3 className="font-bold">Existing Podcasts</h3>
                        {podcasts.map(p => (
                            <div key={p.id} className="border p-3 rounded group relative">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold">{p.title}</h4>
                                        <p className="text-xs text-gray-500">Host: {p.host}</p>
                                    </div>
                                    <div className="bg-gray-100 px-2 py-1 rounded text-xs">
                                        ▶ {p.playCount || 0}
                                    </div>
                                </div>
                                <audio src={p.audioUrl} controls className="w-full mt-2" />

                                <div className="absolute top-2 right-2 flex gap-2 opacity-10 group-hover:opacity-100 transition-opacity bg-white p-1 rounded shadow">
                                    <button onClick={() => setEditingPodcast(p)} className="text-blue-500 text-xs">Edit</button>
                                    <button onClick={async () => {
                                        if (confirm('Delete Podcast?')) {
                                            await fetch(`/api/podcasts/${p.id}`, { method: 'DELETE' });
                                            fetchPodcasts();
                                        }
                                    }} className="text-red-500 text-xs">Del</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
