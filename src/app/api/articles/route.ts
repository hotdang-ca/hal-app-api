import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';

export async function GET() {
    try {
        const articles = await prisma.article.findMany({
            where: { isPublished: true },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(articles);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
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
        const summary = formData.get('summary') as string;
        const content = formData.get('content') as string;
        const author = formData.get('author') as string;
        const file = formData.get('image') as File | null;

        let imageUrl = null;

        if (file) {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const uploadDir = join(process.cwd(), 'public/uploads');
            await mkdir(uploadDir, { recursive: true });
            const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '') || 'image.jpg'}`;
            await writeFile(join(uploadDir, filename), buffer);
            imageUrl = `/uploads/${filename}`;
        }

        const article = await prisma.article.create({
            data: {
                title,
                summary,
                content,
                author,
                imageUrl,
                isPublished: true, // Auto-publish for now
            },
        });

        return NextResponse.json(article);
    } catch (error) {
        console.error('Article creation error:', error);
        return NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
    }
}
