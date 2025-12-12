import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const { id } = params;
    const podcastId = parseInt(id);

    if (isNaN(podcastId)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    try {
        const podcast = await prisma.podcast.update({
            where: { id: podcastId },
            data: { playCount: { increment: 1 } },
        });

        return NextResponse.json(podcast);
    } catch (error) {
        console.error('Error incrementing play count:', error);
        return NextResponse.json({ error: 'Failed to update play count' }, { status: 500 });
    }
}
