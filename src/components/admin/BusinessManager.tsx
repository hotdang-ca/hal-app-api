import { useState, useEffect } from 'react';

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

export default function BusinessManager() {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);

    const fetchBusinesses = async () => {
        const res = await fetch('/api/businesses');
        if (res.ok) setBusinesses(await res.json());
    };

    useEffect(() => {
        fetchBusinesses();
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
    };

    return (
        <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-bold mb-4">Business Directory</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
    );
}
