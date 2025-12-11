"use client";

import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, addDoc, onSnapshot, serverTimestamp, Timestamp, where, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';

// --- Interfaces ---
interface SocialStatus {
    twitter: { connected: boolean; username?: string };
    stats: { importedCount: number };
}

interface Tweet {
    id: string;
    text: string;
    createdAt: string;
    media: string[];
    author: { name: string; username: string; profileImageUrl?: string };
    originalUrl: string;
}
interface Business {
    id: number;
    name: string;
    category: string;
    address: string;
    phone: string;
    website: string;
    summary: string;
    description: string;
    imageUrl: string | null;
}

interface HotlineMessage {
    id: number;
    name: string;
    contact: string | null;
    audioUrl: string;
    isRead: boolean;
    isArchived: boolean;
    createdAt: string;
}

interface Article {
    id: number;
    title: string;
    summary: string;
    content: string; // Added for editing
    author: string;
    imageUrl: string | null;
    createdAt: string;
}

interface Podcast {
    id: number;
    title: string;
    host: string;
    description: string; // Added for editing
    audioUrl: string;
    playCount: number;
    createdAt: string;
}

interface ChatTopic {
    id: string;
    title: string;
    isActive: boolean;
    createdAt: any;
}

interface ChatMessage {
    _id: string;
    text: string;
    createdAt: Date;
    user: {
        _id: string | number;
        name: string;
        avatar?: string;
    };
    topicId?: string;
}


// --- Main Component ---
export default function AdminDashboard() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [activeTab, setActiveTab] = useState<'businesses' | 'hotline' | 'content' | 'chat' | 'social'>('businesses');
    const [contentSubTab, setContentSubTab] = useState<'articles' | 'podcasts'>('articles');
    const [hotlineSubTab, setHotlineSubTab] = useState<'inbox' | 'archived'>('inbox');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);


    // Data State
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [messages, setMessages] = useState<HotlineMessage[]>([]);
    const [articles, setArticles] = useState<Article[]>([]);
    const [podcasts, setPodcasts] = useState<Podcast[]>([]);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [topics, setTopics] = useState<ChatTopic[]>([]);
    const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

    // Forms
    const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
    const [editingArticle, setEditingArticle] = useState<Article | null>(null);
    const [editingPodcast, setEditingPodcast] = useState<Podcast | null>(null);
    const [businessForm, setBusinessForm] = useState<Partial<Business>>({});
    const [chatInput, setChatInput] = useState('');
    const [newTopicTitle, setNewTopicTitle] = useState('');

    // Hotline Player
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playingUrl, setPlayingUrl] = useState<string | null>(null);

    // Initial Load & Listeners
    useEffect(() => {
        if (isAuthenticated) {
            fetchBusinesses();
            fetchMessages();
            fetchArticles();
            fetchPodcasts();
            // Topics Listener
            const topicsQuery = query(collection(db, 'chat_topics'), orderBy('createdAt', 'desc'));
            const unsubscribeTopics = onSnapshot(topicsQuery, (snapshot) => {
                const fetchedTopics = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as ChatTopic[];
                setTopics(fetchedTopics);

                // If no topic selected, default to active one or first one
                if (!selectedTopicId) {
                    const active = fetchedTopics.find(t => t.isActive);
                    if (active) setSelectedTopicId(active.id);
                }
            });

            return () => {
                unsubscribeTopics();
            };
        }
    }, [isAuthenticated]);

    // Chat Message Listener (Dependent on selectedTopicId)
    useEffect(() => {
        if (!isAuthenticated || !selectedTopicId) return;

        const q = query(
            collection(db, 'messages'),
            where('topicId', '==', selectedTopicId),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMessages = snapshot.docs.map(doc => {
                const data = doc.data();
                let createdAt = new Date();
                if (data.createdAt instanceof Timestamp) {
                    createdAt = data.createdAt.toDate();
                }
                return {
                    _id: doc.id,
                    text: data.text,
                    createdAt: createdAt,
                    user: data.user,
                    topicId: data.topicId,
                } as ChatMessage;
            });
            setChatMessages(fetchedMessages);
        });

        return () => unsubscribe();
    }, [isAuthenticated, selectedTopicId]);


    // --- Fetchers ---
    const fetchBusinesses = async () => {
        const res = await fetch('/api/businesses');
        if (res.ok) setBusinesses(await res.json());
    };
    const fetchMessages = async () => {
        const res = await fetch('/api/hotline');
        if (res.ok) setMessages(await res.json());
    };
    const fetchArticles = async () => {
        const res = await fetch('/api/articles');
        if (res.ok) setArticles(await res.json());
    };
    const fetchPodcasts = async () => {
        const res = await fetch('/api/podcasts');
        if (res.ok) setPodcasts(await res.json());
    };

    // Social State
    const [socialStatus, setSocialStatus] = useState<SocialStatus | null>(null);
    const [fetchedTweets, setFetchedTweets] = useState<Tweet[]>([]);
    const [selectedTweets, setSelectedTweets] = useState<Set<string>>(new Set());

    // Fetch Social Status on load
    useEffect(() => {
        if (isAuthenticated && activeTab === 'social') {
            fetch('/api/social/status').then(res => res.json()).then(setSocialStatus);
        }
    }, [isAuthenticated, activeTab]);

    const handleFetchPixels = async () => {
        const res = await fetch('/api/social/twitter/fetch');
        if (res.ok) {
            const data = await res.json();
            setFetchedTweets(data.tweets || []);
        } else {
            const err = await res.json();
            alert(err.error || 'Failed to fetch tweets');
        }
    };

    const handleImportTweets = async () => {
        const toImport = fetchedTweets.filter(t => selectedTweets.has(t.id));
        if (toImport.length === 0) return;

        const res = await fetch('/api/social/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: toImport })
        });

        if (res.ok) {
            alert('Imported successfully!');
            setSelectedTweets(new Set());
            // Refresh stats
            fetch('/api/social/status').then(res => res.json()).then(setSocialStatus);
        } else {
            alert('Import failed');
        }
    };
    // --- Auth ---
    // Check persistent auth status
    useEffect(() => {
        if (mounted) {
            fetch('/api/auth/check')
                .then(res => res.json())
                .then(data => {
                    if (data.authenticated) setIsAuthenticated(true);
                })
                .catch(err => console.error("Auth check failed", err));
        }
    }, [mounted]);

    if (!mounted) return null;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            if (res.ok) setIsAuthenticated(true);
            else alert('Invalid password');
        } catch { alert('Login failed'); }
    };
    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        setIsAuthenticated(false); setPassword('');
    };

    // --- Articles Logic ---
    const handleSubmitArticle = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        try {
            const res = await fetch('/api/articles', { method: 'POST', body: formData });
            if (res.ok) {
                alert('Article created!');
                fetchArticles();
                (e.target as HTMLFormElement).reset();
            } else alert('Failed to create article');
        } catch { alert('Error submitting article'); }
    };

    // --- Podcast Logic ---
    const handleSubmitPodcast = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        try {
            const res = await fetch('/api/podcasts', { method: 'POST', body: formData });
            if (res.ok) {
                alert('Podcast created!');
                fetchPodcasts();
                (e.target as HTMLFormElement).reset();
            } else alert('Failed to create podcast');
        } catch { alert('Error submitting podcast'); }
    };

    // --- Chat Logic ---
    const handleCreateTopic = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTopicTitle.trim()) return;

        try {
            // Create new topic, set as active, deactivate others
            const batch = writeBatch(db);

            // Deactivate all others
            topics.forEach(t => {
                if (t.isActive) {
                    batch.update(doc(db, 'chat_topics', t.id), { isActive: false });
                }
            });

            // Add new active topic
            const newTopicRef = doc(collection(db, 'chat_topics'));
            batch.set(newTopicRef, {
                title: newTopicTitle,
                isActive: true,
                createdAt: serverTimestamp()
            });

            await batch.commit();
            setNewTopicTitle('');
            setSelectedTopicId(newTopicRef.id);
        } catch (error) {
            console.error("Error creating topic", error);
            alert("Failed to create topic");
        }
    };

    const handleActivateTopic = async (topicId: string) => {
        try {
            const batch = writeBatch(db);

            // Deactivate all others
            topics.forEach(t => {
                if (t.isActive) {
                    batch.update(doc(db, 'chat_topics', t.id), { isActive: false });
                }
            });

            // Activate target
            batch.update(doc(db, 'chat_topics', topicId), { isActive: true });

            await batch.commit();
            setSelectedTopicId(topicId);
        } catch (error) {
            console.error("Error activating topic", error);
        }
    };

    const handleDeactivateAllTopics = async () => {
        try {
            const batch = writeBatch(db);
            topics.forEach(t => {
                if (t.isActive) {
                    batch.update(doc(db, 'chat_topics', t.id), { isActive: false });
                }
            });
            await batch.commit();
            setSelectedTopicId(null);
        } catch (error) {
            console.error("Error deactivating topics", error);
        }
    };

    const handleSendChat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !selectedTopicId) return;

        try {
            await addDoc(collection(db, 'messages'), {
                text: chatInput,
                createdAt: serverTimestamp(),
                topicId: selectedTopicId,
                user: {
                    _id: 'admin-hal',
                    name: 'Hal Anderson',
                    avatar: 'https://placeimg.com/140/140/arch',
                }
            });
            setChatInput('');
        } catch (error) {
            console.error("Error sending message", error);
            alert("Failed to send message");
        }
    };


    // --- Hotline Logic ---
    const playAudio = (url: string) => {
        if (audioRef.current) {
            audioRef.current.src = url;
            audioRef.current.play();
            setPlayingUrl(url);
        }
    };
    const toggleReadStatus = async (msg: HotlineMessage) => {
        await fetch(`/api/hotline/${msg.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isRead: !msg.isRead }),
        });
        fetchMessages();
    };

    const handleArchiveMessage = async (msg: HotlineMessage) => {
        if (!confirm("Are you sure? This will delete the audio file permanently.")) return;

        await fetch(`/api/hotline/${msg.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isArchived: true }),
        });
        fetchMessages();
    };


    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 text-black">
                <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-96">
                    <h1 className="text-xl mb-4 font-bold text-center">Admin Login</h1>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="border p-2 mb-4 w-full rounded" placeholder="Enter password" />
                    <button type="submit" className="bg-blue-600 text-white p-2 rounded w-full hover:bg-blue-700">Login</button>
                </form>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Hal Knows A Guy - CMS</h1>
                    <button onClick={handleLogout} className="text-red-500 hover:underline">Logout</button>
                </div>

                <div className="flex gap-4 mb-6 border-b pb-1">
                    {['businesses', 'hotline', 'content', 'chat', 'social'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-4 py-2 font-bold capitalize ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {activeTab === 'businesses' && (
                    <div className="bg-white p-6 rounded shadow">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const data = Object.fromEntries(formData.entries());

                                try {
                                    if (editingBusiness) {
                                        const res = await fetch(`/api/businesses/${editingBusiness.id}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(data),
                                        });
                                        if (res.ok) alert('Business updated');
                                    } else {
                                        const res = await fetch('/api/businesses', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(data),
                                        });
                                        if (res.ok) alert('Business created');
                                    }
                                    setEditingBusiness(null);
                                    fetchBusinesses();
                                    (e.target as HTMLFormElement).reset();
                                } catch { alert('Error submitting business'); }
                            }} className="flex flex-col gap-3">
                                <h3 className="font-bold">{editingBusiness ? 'Edit Business' : 'Add Business'}</h3>
                                {editingBusiness && <button type="button" onClick={() => setEditingBusiness(null)} className="text-sm text-red-500 text-left mb-2">Cancel Edit</button>}
                                <input name="name" defaultValue={editingBusiness?.name} className="border p-2 rounded" placeholder="Name" required />
                                <input name="category" defaultValue={editingBusiness?.category} className="border p-2 rounded" placeholder="Category" required />
                                <input name="address" defaultValue={editingBusiness?.address} className="border p-2 rounded" placeholder="Address" required />
                                <input name="phone" defaultValue={editingBusiness?.phone} className="border p-2 rounded" placeholder="Phone" required />
                                <input name="website" defaultValue={editingBusiness?.website} className="border p-2 rounded" placeholder="Website" required />
                                <input name="summary" defaultValue={editingBusiness?.summary} className="border p-2 rounded" placeholder="Short Summary" required />
                                <textarea name="description" defaultValue={editingBusiness?.description} className="border p-2 rounded" placeholder="Full Description" rows={3} required />
                                <button type="submit" className="bg-green-600 text-white p-2 rounded">{editingBusiness ? 'Update' : 'Create'}</button>
                            </form>

                            <div className="space-y-4">
                                <h3 className="font-bold">Existing Businesses</h3>
                                {businesses.map(b => (
                                    <div key={b.id} className="border p-4 rounded flex justify-between items-center group">
                                        <div>
                                            <h4 className="font-bold">{b.name}</h4>
                                            <p className="text-xs text-gray-500">{b.category} • {b.phone}</p>
                                        </div>
                                        <div className="flex gap-2 opacity-10 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setEditingBusiness(b)} className="text-blue-500 text-sm">Edit</button>
                                            <button onClick={async () => {
                                                if (confirm('Delete?')) {
                                                    await fetch(`/api/businesses/${b.id}`, { method: 'DELETE' });
                                                    fetchBusinesses();
                                                }
                                            }} className="text-red-500 text-sm">Delete</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'hotline' && (
                    <div className="bg-white p-6 rounded shadow">
                        <div className="flex gap-4 mb-6 border-b pb-1">
                            <button onClick={() => setHotlineSubTab('inbox')} className={`px-4 py-2 ${hotlineSubTab === 'inbox' ? 'font-bold text-blue-600 border-b-2 border-blue-600' : ''}`}>Inbox</button>
                            <button onClick={() => setHotlineSubTab('archived')} className={`px-4 py-2 ${hotlineSubTab === 'archived' ? 'font-bold text-blue-600 border-b-2 border-blue-600' : ''}`}>Archived</button>
                        </div>

                        <h2 className="text-xl font-bold mb-6">
                            {hotlineSubTab === 'inbox' ? 'Active Messages' : 'Archived Messages'}
                        </h2>
                        <audio ref={audioRef} controls className="hidden" />

                        <div className="flex flex-col gap-4">
                            {messages.filter(m => hotlineSubTab === 'inbox' ? !m.isArchived : m.isArchived).map(msg => (
                                <div key={msg.id} className={`border p-4 rounded flex justify-between items-center ${msg.isRead ? 'bg-gray-50 opacity-75' : 'bg-white border-blue-200'}`}>
                                    <div className="flex items-center gap-4">
                                        {!msg.isArchived && (
                                            <button onClick={() => playAudio(msg.audioUrl)} className="text-blue-600 font-bold border rounded px-3 py-1 hover:bg-blue-50">Play</button>
                                        )}
                                        <div>
                                            <h3 className="font-bold">{msg.name}</h3>
                                            <p className="text-xs text-gray-500">{new Date(msg.createdAt).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 items-center">
                                        {!msg.isArchived && (
                                            <>
                                                <a href={msg.audioUrl} download className="text-sm text-gray-600 hover:text-black">Download</a>
                                                <button onClick={() => toggleReadStatus(msg)} className="text-sm underline text-blue-500">{msg.isRead ? 'Mark Unread' : 'Mark Read'}</button>
                                                <button onClick={() => handleArchiveMessage(msg)} className="text-sm text-red-500 hover:font-bold">Archive</button>
                                            </>
                                        )}
                                        {msg.isArchived && (
                                            <span className="text-sm text-gray-400 italic">Audio Deleted</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {messages.filter(m => hotlineSubTab === 'inbox' ? !m.isArchived : m.isArchived).length === 0 && (
                                <p className="text-gray-400 text-center py-10">No messages found.</p>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'content' && (
                    <div className="bg-white p-6 rounded shadow">
                        <div className="flex gap-4 mb-6 border-b pb-1">
                            <button onClick={() => setContentSubTab('articles')} className={`px-4 py-2 ${contentSubTab === 'articles' ? 'font-bold text-blue-600' : ''}`}>Articles</button>
                            <button onClick={() => setContentSubTab('podcasts')} className={`px-4 py-2 ${contentSubTab === 'podcasts' ? 'font-bold text-blue-600' : ''}`}>Podcasts</button>
                        </div>

                        {contentSubTab === 'articles' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);

                                    try {
                                        if (editingArticle) {
                                            const res = await fetch(`/api/articles/${editingArticle.id}`, { method: 'PUT', body: formData });
                                            if (res.ok) alert('Article updated');
                                        } else {
                                            const res = await fetch('/api/articles', { method: 'POST', body: formData });
                                            if (res.ok) alert('Article created');
                                        }
                                        setEditingArticle(null);
                                        fetchArticles();
                                        (e.target as HTMLFormElement).reset();
                                    } catch { alert('Error saving article'); }
                                }} className="flex flex-col gap-3">
                                    <h3 className="font-bold">{editingArticle ? 'Edit Article' : 'Add Article'}</h3>
                                    {editingArticle && <button type="button" onClick={() => setEditingArticle(null)} className="text-sm text-red-500 text-left mb-2">Cancel Edit</button>}
                                    <input name="title" defaultValue={editingArticle?.title} className="border p-2 rounded" placeholder="Title" required />
                                    <input name="author" defaultValue={editingArticle?.author} className="border p-2 rounded" placeholder="Author" required />
                                    <input name="summary" defaultValue={editingArticle?.summary} className="border p-2 rounded" placeholder="Summary" required />
                                    <textarea name="content" defaultValue={editingArticle?.content} className="border p-2 rounded" placeholder="Content (Markdown)" rows={5} required />
                                    <input type="file" name="image" className="border p-2 rounded" accept="image/*" />
                                    <button type="submit" className="bg-blue-600 text-white p-2 rounded">{editingArticle ? 'Update Article' : 'Create Article'}</button>
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

                        {contentSubTab === 'podcasts' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);

                                    try {
                                        if (editingPodcast) {
                                            const res = await fetch(`/api/podcasts/${editingPodcast.id}`, { method: 'PUT', body: formData });
                                            if (res.ok) alert('Podcast updated');
                                        } else {
                                            const res = await fetch('/api/podcasts', { method: 'POST', body: formData });
                                            if (res.ok) alert('Podcast created');
                                        }
                                        setEditingPodcast(null);
                                        fetchPodcasts();
                                        (e.target as HTMLFormElement).reset();
                                    } catch { alert('Error saving podcast'); }
                                }} className="flex flex-col gap-3">
                                    <h3 className="font-bold">{editingPodcast ? 'Edit Podcast' : 'Add Podcast'}</h3>
                                    {editingPodcast && <button type="button" onClick={() => setEditingPodcast(null)} className="text-sm text-red-500 text-left mb-2">Cancel Edit</button>}
                                    <input name="title" defaultValue={editingPodcast?.title} className="border p-2 rounded" placeholder="Title" required />
                                    <input name="host" defaultValue={editingPodcast?.host} className="border p-2 rounded" placeholder="Host" required />
                                    <textarea name="description" defaultValue={editingPodcast?.description} className="border p-2 rounded" placeholder="Description" rows={3} required />

                                    <label className="text-sm font-bold">Cover Image {editingPodcast && "(Leave empty to keep)"}</label>
                                    <input type="file" name="image" className="border p-2 rounded" accept="image/*" />

                                    <label className="text-sm font-bold">Audio File {editingPodcast && "(Leave empty to keep)"}</label>
                                    <input type="file" name="audio" className="border p-2 rounded" accept="audio/*" required={!editingPodcast} />

                                    <button type="submit" className="bg-purple-600 text-white p-2 rounded">{editingPodcast ? 'Update Podcast' : 'Upload Podcast'}</button>
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
                )}

                {activeTab === 'social' && (
                    <div className="bg-white p-6 rounded shadow space-y-6">
                        <div className="flex justify-between items-center border-b pb-4">
                            <h2 className="text-xl font-bold">Social Feed Integration</h2>
                            <div className="flex items-center gap-4">
                                <div className="text-sm">
                                    <span className="text-gray-500">Twitter/X: </span>
                                    {socialStatus?.twitter.connected ? (
                                        <span className="text-green-600 font-bold">Connected as @{socialStatus.twitter.username}</span>
                                    ) : (
                                        <span className="text-red-500">Not Connected</span>
                                    )}
                                </div>
                                {!socialStatus?.twitter.connected && (
                                    <a href="/api/auth/twitter/login" className="bg-black text-white px-4 py-2 rounded font-bold hover:bg-gray-800">
                                        Connect X
                                    </a>
                                )}
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg">Import Content</h3>
                                <div className="flex gap-2">
                                    <button onClick={handleFetchPixels} disabled={!socialStatus?.twitter.connected} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
                                        Fetch Latest Posts
                                    </button>
                                    <button onClick={handleImportTweets} disabled={selectedTweets.size === 0} className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50">
                                        Import Selected ({selectedTweets.size})
                                    </button>
                                </div>
                            </div>

                            <p className="text-sm text-gray-500 mb-4">Total items in public feed: {socialStatus?.stats.importedCount || 0}</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {fetchedTweets.map(tweet => (
                                    <div key={tweet.id} className={`border p-4 rounded cursor-pointer transition-colors ${selectedTweets.has(tweet.id) ? 'border-green-500 bg-green-50' : 'hover:bg-gray-50'}`}
                                        onClick={() => {
                                            const next = new Set(selectedTweets);
                                            if (next.has(tweet.id)) next.delete(tweet.id);
                                            else next.add(tweet.id);
                                            setSelectedTweets(next);
                                        }}
                                    >
                                        <div className="flex justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                {tweet.author.profileImageUrl && <img src={tweet.author.profileImageUrl} alt="" className="w-8 h-8 rounded-full" />}
                                                <span className="font-bold text-sm">@{tweet.author.username}</span>
                                            </div>
                                            <input type="checkbox" checked={selectedTweets.has(tweet.id)} readOnly className="h-5 w-5" />
                                        </div>
                                        <p className="text-sm mb-2">{tweet.text}</p>
                                        {tweet.media.length > 0 && (
                                            <div className="flex gap-1 mt-2 overflow-hidden rounded h-32">
                                                {tweet.media.map((url, i) => (
                                                    <img key={i} src={url} className="w-full h-full object-cover" alt="" />
                                                ))}
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-400 mt-2">{new Date(tweet.createdAt).toLocaleString()}</p>
                                    </div>
                                ))}
                                {fetchedTweets.length === 0 && (
                                    <div className="col-span-full text-center py-10 text-gray-400 bg-gray-50 rounded border border-dashed">
                                        Click "Fetch Latest Posts" to see your timeline.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'chat' && (
                    <div className="bg-white p-6 rounded shadow flex gap-6 h-[700px]">
                        {/* Sidebar: Topic Manager */}
                        <div className="w-1/3 border-r pr-4 flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">Topics</h2>
                                <button
                                    onClick={handleDeactivateAllTopics}
                                    className="text-[10px] text-red-500 hover:bg-red-50 px-2 py-1 rounded border border-red-200"
                                    title="Deactivate Current Topic"
                                >
                                    Clear Active
                                </button>
                            </div>

                            <form onSubmit={handleCreateTopic} className="mb-4 flex gap-2">
                                <input
                                    value={newTopicTitle}
                                    onChange={e => setNewTopicTitle(e.target.value)}
                                    className="border rounded p-2 flex-1 text-sm"
                                    placeholder="New Topic Name..."
                                />
                                <button className="bg-green-600 text-white px-2 rounded font-bold">+</button>
                            </form>

                            <div className="flex-1 overflow-y-auto space-y-2">
                                {topics.map(topic => (
                                    <div
                                        key={topic.id}
                                        className={`p-3 rounded cursor-pointer border ${selectedTopicId === topic.id ? 'bg-blue-50 border-blue-500' : 'bg-white hover:bg-gray-50'}`}
                                        onClick={() => setSelectedTopicId(topic.id)}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-sm block">{topic.title}</span>
                                            {topic.isActive && <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-bold">ACTIVE</span>}
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-gray-500">
                                                {/* {topic.createdAt?.toDate().toLocaleDateString()} */}
                                            </span>
                                            {!topic.isActive && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleActivateTopic(topic.id);
                                                    }}
                                                    className="text-[10px] text-blue-600 hover:underline"
                                                >
                                                    Set Active
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Main Chat Area */}
                        <div className="flex-1 flex flex-col">
                            <h2 className="text-xl font-bold mb-4">
                                {topics.find(t => t.id === selectedTopicId)?.title || "Select a Topic"}
                            </h2>

                            <div className="flex-1 overflow-y-auto border p-4 rounded mb-4 flex flex-col-reverse gap-3 bg-gray-50">
                                {chatMessages.map(msg => {
                                    const isAdmin = msg.user._id === 'admin-hal';
                                    return (
                                        <div key={msg._id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] p-3 rounded-xl ${isAdmin ? 'bg-blue-600 text-white' : 'bg-white border text-gray-800'}`}>
                                                {!isAdmin && <p className="text-xs font-bold mb-1 text-gray-500">{msg.user.name}</p>}
                                                <p>{msg.text}</p>
                                                <p className={`text-[10px] mt-1 ${isAdmin ? 'text-blue-200 text-right' : 'text-gray-400'}`}>
                                                    {msg.createdAt?.toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {chatMessages.length === 0 && (
                                    <p className="text-center text-gray-400 mt-10">No messages in this topic yet.</p>
                                )}
                            </div>

                            <form onSubmit={handleSendChat} className="flex gap-2">
                                <input
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    className="flex-1 border p-2 rounded"
                                    placeholder={`Message in "${topics.find(t => t.id === selectedTopicId)?.title || '...'}"`}
                                    disabled={!selectedTopicId}
                                />
                                <button
                                    type="submit"
                                    className={`px-6 rounded font-bold text-white ${!selectedTopicId ? 'bg-gray-400' : 'bg-blue-600'}`}
                                    disabled={!selectedTopicId}
                                >
                                    Send
                                </button>
                            </form>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
