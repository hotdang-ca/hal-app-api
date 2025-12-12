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
        const body = await request.json();
        const { name, userId, audioUrl } = body;

        if (!audioUrl || !name) {
            return NextResponse.json({ error: 'Missing audioUrl or name' }, { status: 400 });
        }

        // Save DB Record
        const message = await prisma.hotlineMessage.create({
            data: {
                name,
                userId: userId || null,
                audioUrl, // Direct URL from Firebase
                isRead: false,
            },
        });

        return NextResponse.json(message);
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }
}
