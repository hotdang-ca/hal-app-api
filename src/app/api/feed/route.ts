import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const items = await prisma.feedItem.findMany({
            where: { isHidden: false },
            orderBy: { postedAt: 'desc' }
        });

        // Parse mediaUrls JSON
        const parsed = items.map(item => ({
            ...item,
            mediaUrls: JSON.parse(item.mediaUrls)
        }));

        return NextResponse.json(parsed);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 });
    }
}
