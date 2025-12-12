import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, addDoc, onSnapshot, serverTimestamp, Timestamp, where, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';

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

export default function ChatManager() {
    const [topics, setTopics] = useState<ChatTopic[]>([]);
    const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [newTopicTitle, setNewTopicTitle] = useState('');
    const [chatInput, setChatInput] = useState('');

    // Listen for Topics
    useEffect(() => {
        const topicsQuery = query(collection(db, 'chat_topics'), orderBy('createdAt', 'desc'));
        const unsubscribeTopics = onSnapshot(topicsQuery, (snapshot) => {
            const fetchedTopics = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ChatTopic[];
            setTopics(fetchedTopics);

            // Default to active topic if none selected
            if (!selectedTopicId) {
                const active = fetchedTopics.find(t => t.isActive);
                if (active) setSelectedTopicId(active.id);
            }
        });
        return () => unsubscribeTopics();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Listen for Messages on Selected Topic
    useEffect(() => {
        if (!selectedTopicId) return;

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
    }, [selectedTopicId]);

    const handleCreateTopic = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTopicTitle.trim()) return;

        try {
            const batch = writeBatch(db);
            // Deactivate all
            topics.forEach(t => {
                if (t.isActive) {
                    batch.update(doc(db, 'chat_topics', t.id), { isActive: false });
                }
            });

            // Create new active topic
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
            topics.forEach(t => {
                if (t.isActive) {
                    batch.update(doc(db, 'chat_topics', t.id), { isActive: false });
                }
            });
            batch.update(doc(db, 'chat_topics', topicId), { isActive: true });
            await batch.commit();
            setSelectedTopicId(topicId);
        } catch (error) {
            console.error("Error activating topic", error);
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

    return (
        <div className="bg-white p-6 rounded shadow grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar: Topics */}
            <div className="lg:col-span-1 border-r pr-4">
                <h3 className="font-bold text-lg mb-4">Topics</h3>
                <form onSubmit={handleCreateTopic} className="flex gap-2 mb-4">
                    <input
                        value={newTopicTitle}
                        onChange={e => setNewTopicTitle(e.target.value)}
                        placeholder="New Topic..."
                        className="border p-2 rounded flex-1 text-sm"
                    />
                    <button type="submit" className="bg-blue-600 text-white px-3 text-sm rounded">Add</button>
                </form>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {topics.map(t => (
                        <div key={t.id}
                            onClick={() => setSelectedTopicId(t.id)}
                            className={`p-3 rounded border cursor-pointer hover:bg-gray-50 ${t.id === selectedTopicId ? 'border-blue-500 bg-blue-50' : ''}`}
                        >
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-sm block">{t.title}</span>
                                {t.isActive && <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded">Active</span>}
                            </div>
                            <div className="mt-2 text-xs text-gray-400 flex justify-between">
                                <span>{t.createdAt?.toDate ? new Date(t.createdAt.toDate()).toLocaleDateString() : ''}</span>
                                {!t.isActive && <button onClick={(e) => { e.stopPropagation(); handleActivateTopic(t.id); }} className="text-blue-600 hover:underline">Set Active</button>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main: Chat Feed */}
            <div className="lg:col-span-2 flex flex-col h-[600px]">
                <div className="flex-1 overflow-y-auto border rounded p-4 mb-4 bg-gray-50 flex flex-col-reverse">
                    {chatMessages.length === 0 && <p className="text-center text-gray-400 mt-10">No messages in this topic.</p>}
                    {chatMessages.map(msg => (
                        <div key={msg._id} className={`mb-3 flex flex-col ${msg.user._id === 'admin-hal' ? 'items-end' : 'items-start'}`}>
                            <div className={`p-3 rounded-lg max-w-md ${msg.user._id === 'admin-hal' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
                                {msg.user._id !== 'admin-hal' && <span className="text-xs font-bold block mb-1 text-gray-500">{msg.user.name}</span>}
                                {msg.text}
                            </div>
                            <span className="text-xs text-gray-400 mt-1">{msg.createdAt.toLocaleTimeString()}</span>
                        </div>
                    ))}
                </div>

                <form onSubmit={handleSendChat} className="flex gap-2">
                    <input
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        placeholder={selectedTopicId ? "Reply as Hal..." : "Select a topic first"}
                        disabled={!selectedTopicId}
                        className="border p-3 rounded flex-1"
                    />
                    <button type="submit" disabled={!selectedTopicId} className="bg-blue-600 text-white px-6 rounded font-bold hover:bg-blue-700 disabled:opacity-50">
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}
