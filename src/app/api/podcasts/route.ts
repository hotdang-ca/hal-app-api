import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { parseFile } from 'music-metadata';

export async function GET() {
    try {
        const podcasts = await prisma.podcast.findMany({
            where: { isPublished: true },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(podcasts);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch podcasts' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const isAuthenticated = await verifyAuth();
    if (!isAuthenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { title, description, host, audioUrl, imageUrl } = body;

        if (!audioUrl) {
            return NextResponse.json({ error: 'Audio URL required' }, { status: 400 });
        }

        // Duration extraction via server-side 'music-metadata' requires a file stream/buffer.
        // Since we are now getting a remote URL, we skip this complexity for the prototype.
        const duration = "00:00";

        const podcast = await prisma.podcast.create({
            data: {
                title,
                description,
                host,
                audioUrl,
                imageUrl,
                duration,
                isPublished: true,
            },
        });

        return NextResponse.json(podcast);
    } catch (error) {
        console.error('Podcast creation error:', error);
        return NextResponse.json({ error: 'Failed to create podcast' }, { status: 500 });
    }
}
