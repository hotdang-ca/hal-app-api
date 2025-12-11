import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: Request) {
    const isAuthenticated = await verifyAuth();
    if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { items } = body; // Array of selected tweets

        if (!Array.isArray(items)) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        const savedItems = [];

        for (const item of items) {
            // Check if already exists to avoid duplicates
            const exists = await prisma.feedItem.findUnique({
                where: { externalId: item.id }
            });

            if (!exists) {
                const saved = await prisma.feedItem.create({
                    data: {
                        platform: 'twitter',
                        externalId: item.id,
                        content: item.text,
                        authorName: item.author.name,
                        authorHandle: item.author.username,
                        mediaUrls: JSON.stringify(item.media), // Store as JSON string
                        originalUrl: item.originalUrl,
                        postedAt: new Date(item.createdAt),
                        isHidden: false
                    }
                });
                savedItems.push(saved);
            }
        }

        return NextResponse.json({ success: true, count: savedItems.length });
    } catch (error) {
        console.error("Import Error", error);
        return NextResponse.json({ error: 'Import failed' }, { status: 500 });
    }
}
