import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';

export async function GET() {
    const isAuthenticated = await verifyAuth();
    if (!isAuthenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const messages = await prisma.hotlineMessage.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(messages);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('audio') as File | null;
        const name = formData.get('name') as string | null;
        const userId = formData.get('userId') as string | null;

        if (!file || !name) {
            return NextResponse.json({ error: 'Missing file or name' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure upload directory exists
        const uploadDir = join(process.cwd(), 'public/uploads');
        await mkdir(uploadDir, { recursive: true });

        // Save file locally
        // Use timestamp to unique filename
        const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '') || 'audio.m4a'}`;
        const path = join(uploadDir, filename);
        await writeFile(path, buffer);

        // Save DB Record
        // public URL is /uploads/filename
        const message = await prisma.hotlineMessage.create({
            data: {
                name,
                userId: userId || null,
                audioUrl: `/uploads/${filename}`,
                isRead: false,
            },
        });

        return NextResponse.json(message);
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Failed to upload message' }, { status: 500 });
    }
}
