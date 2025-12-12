"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import BusinessManager from '../../components/admin/BusinessManager';
import HotlineManager from '../../components/admin/HotlineManager';
import ContentManager from '../../components/admin/ContentManager';
import ChatManager from '../../components/admin/ChatManager';
import SocialManager from '../../components/admin/SocialManager';

function AdminContent() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [activeTab, setActiveTab] = useState<'businesses' | 'hotline' | 'content' | 'chat' | 'social'>('businesses');
    const [mounted, setMounted] = useState(false);
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
        // Check querystring for tab (e.g. from Twitter auth callback)
        const tab = searchParams.get('tab');
        if (tab && ['businesses', 'hotline', 'content', 'chat', 'social'].includes(tab)) {
            setActiveTab(tab as any);
        }
    }, [searchParams]);

    // Check Auth
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

    const renderTab = () => {
        switch (activeTab) {
            case 'businesses': return <BusinessManager />;
            case 'hotline': return <HotlineManager />;
            case 'content': return <ContentManager />;
            case 'chat': return <ChatManager />;
            case 'social': return <SocialManager />;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Hal Knows A Guy - CMS</h1>
                    <button onClick={handleLogout} className="text-red-500 hover:underline">Logout</button>
                </div>

                <div className="flex gap-4 mb-6 border-b pb-1 overflow-x-auto">
                    {['businesses', 'hotline', 'content', 'chat', 'social'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab as any);
                                // Optional: Update URL without reload to persist tab on refresh
                                router.replace(`/admin?tab=${tab}`);
                            }}
                            className={`px-4 py-2 font-bold capitalize whitespace-nowrap ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {renderTab()}
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    return (
        <Suspense fallback={<div>Loading Admin...</div>}>
            <AdminContent />
        </Suspense>
    );
}
