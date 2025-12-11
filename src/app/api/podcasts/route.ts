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
        const formData = await request.formData();
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const host = formData.get('host') as string;
        const file = formData.get('audio') as File | null;
        const imageFile = formData.get('image') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'Audio file required' }, { status: 400 });
        }

        const uploadDir = join(process.cwd(), 'public/uploads');
        await mkdir(uploadDir, { recursive: true });

        // Handle Audio
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '') || 'podcast.m4a'}`;
        await writeFile(join(uploadDir, filename), buffer);
        const audioUrl = `/uploads/${filename}`;

        // Handle Image
        let imageUrl = null;
        if (imageFile) {
            const imgBytes = await imageFile.arrayBuffer();
            const imgBuffer = Buffer.from(imgBytes);
            const imgName = `${Date.now()}-thumb-${imageFile.name.replace(/[^a-zA-Z0-9.]/g, '') || 'image.jpg'}`;
            await writeFile(join(uploadDir, imgName), imgBuffer);
            imageUrl = `/uploads/${imgName}`;
        }

        // Extract Duration
        let duration = "00:00";
        try {
            const metadata = await parseFile(join(uploadDir, filename));
            if (metadata.format.duration) {
                const totalSeconds = Math.floor(metadata.format.duration);
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds % 60;
                duration = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
            }
        } catch (e) {
            console.error("Error parsing audio metadata:", e);
        }

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
