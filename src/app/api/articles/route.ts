import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

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
        const body = await request.json();
        const { title, summary, content, author, imageUrl } = body;

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
