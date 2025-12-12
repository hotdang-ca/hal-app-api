import { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';

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

export default function SocialManager() {
    const [socialStatus, setSocialStatus] = useState<SocialStatus | null>(null);
    const [fetchedTweets, setFetchedTweets] = useState<Tweet[]>([]);
    const [selectedTweets, setSelectedTweets] = useState<Set<string>>(new Set());

    // Loading States
    const [isFetching, setIsFetching] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = () => {
        fetch('/api/social/status').then(res => res.json()).then(setSocialStatus);
    };

    const handleFetchPixels = async () => {
        setIsFetching(true);
        try {
            const res = await fetch('/api/social/twitter/fetch');
            if (res.ok) {
                const data = await res.json();
                setFetchedTweets(data.tweets || []);
                showToast(`Fetched ${data.tweets?.length || 0} new tweets`, 'success');
            } else {
                const err = await res.json();
                showToast(err.error || 'Failed to fetch tweets', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Network error fetching tweets', 'error');
        } finally {
            setIsFetching(false);
        }
    };

    const handleImportTweets = async () => {
        const toImport = fetchedTweets.filter(t => selectedTweets.has(t.id));
        if (toImport.length === 0) return;

        setIsImporting(true);
        try {
            const res = await fetch('/api/social/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: toImport })
            });

            if (res.ok) {
                showToast('Imported successfully!', 'success');
                setSelectedTweets(new Set());
                fetchStatus();
            } else {
                showToast('Import failed', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Error importing tweets', 'error');
        } finally {
            setIsImporting(false);
        }
    };

    return (
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
                        <button onClick={handleFetchPixels} disabled={!socialStatus?.twitter.connected || isFetching} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 flex items-center gap-2">
                            {isFetching && <span className="animate-spin">↻</span>}
                            {isFetching ? 'Fetching...' : 'Fetch Latest Posts'}
                        </button>
                        <button onClick={handleImportTweets} disabled={selectedTweets.size === 0 || isImporting} className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50 flex items-center gap-2">
                            {isImporting && <span className="animate-spin">↻</span>}
                            {isImporting ? 'Importing...' : `Import Selected (${selectedTweets.size})`}
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
                                    <div>
                                        <div className="font-bold text-sm">{tweet.author.name}</div>
                                        <div className="text-xs text-gray-500">@{tweet.author.username}</div>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-400">{new Date(tweet.createdAt).toLocaleDateString()}</div>
                            </div>
                            <p className="text-sm mb-2">{tweet.text}</p>
                            {tweet.media && tweet.media.length > 0 && (
                                <div className="flex gap-1 overflow-x-auto">
                                    {tweet.media.map((url, i) => (
                                        <img key={i} src={url} alt="" className="h-20 rounded" />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {fetchedTweets.length === 0 && <p className="text-gray-400 col-span-full text-center py-10">No recent tweets fetched. Click "Fetch Latest Posts".</p>}
                </div>
            </div>
        </div>
    );
}
