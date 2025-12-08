"use client";

import { useState } from 'react';

export default function AdminDashboard() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [log, setLog] = useState<string[]>([]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'admin123') {
            setIsAuthenticated(true);
        } else {
            alert('Invalid password');
        }
    };

    const handleSend = () => {
        if (!message) return;
        // Stub implementation
        const timestamp = new Date().toLocaleTimeString();
        setLog(prev => [`[${timestamp}] BROADCASING: "${message}"`, ...prev]);
        alert(`Message "${message}" broadcasted! (Console only)`);
        setMessage('');
    };

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md">
                    <h1 className="text-xl mb-4 text-black">Admin Login</h1>
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="border p-2 mb-4 w-full text-black"
                        placeholder="Enter password"
                    />
                    <button type="submit" className="bg-blue-500 text-white p-2 rounded w-full">Login</button>
                </form>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-black p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">Hal App Admin</h1>

                <div className="bg-white p-6 rounded shadow mb-8">
                    <h2 className="text-xl font-bold mb-4">Send Broadcast Notification</h2>
                    <div className="flex gap-4">
                        <input
                            type="text"
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            className="border p-2 flex-1 rounded"
                            placeholder="Message to all users..."
                        />
                        <button onClick={handleSend} className="bg-red-500 text-white px-6 py-2 rounded font-bold">
                            SEND
                        </button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded shadow">
                    <h2 className="text-xl font-bold mb-4">System Logs</h2>
                    <div className="bg-gray-900 text-green-400 p-4 rounded font-mono h-64 overflow-y-auto">
                        {log.length === 0 && <span className="opacity-50">No activity...</span>}
                        {log.map((line, i) => (
                            <div key={i}>{line}</div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
