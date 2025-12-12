import { useState, useEffect, useRef } from 'react';

interface HotlineMessage {
    id: number;
    name: string;
    contact: string | null;
    audioUrl: string;
    isRead: boolean;
    isArchived: boolean;
    createdAt: string;
}

export default function HotlineManager() {
    const [messages, setMessages] = useState<HotlineMessage[]>([]);
    const [subTab, setSubTab] = useState<'inbox' | 'archived'>('inbox');
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const fetchMessages = async () => {
        const res = await fetch('/api/hotline');
        if (res.ok) setMessages(await res.json());
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    const playAudio = (url: string) => {
        if (audioRef.current) {
            audioRef.current.src = url;
            audioRef.current.play();
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

    return (
        <div className="bg-white p-6 rounded shadow">
            <div className="flex gap-4 mb-6 border-b pb-1">
                <button onClick={() => setSubTab('inbox')} className={`px-4 py-2 ${subTab === 'inbox' ? 'font-bold text-blue-600 border-b-2 border-blue-600' : ''}`}>Inbox</button>
                <button onClick={() => setSubTab('archived')} className={`px-4 py-2 ${subTab === 'archived' ? 'font-bold text-blue-600 border-b-2 border-blue-600' : ''}`}>Archived</button>
            </div>

            <h2 className="text-xl font-bold mb-6">
                {subTab === 'inbox' ? 'Active Messages' : 'Archived Messages'}
            </h2>
            <audio ref={audioRef} controls className="hidden" />

            <div className="flex flex-col gap-4">
                {messages.filter(m => subTab === 'inbox' ? !m.isArchived : m.isArchived).map(msg => (
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
            </div>
        </div>
    );
}
