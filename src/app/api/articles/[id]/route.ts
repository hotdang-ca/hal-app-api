import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const isAuthenticated = await verifyAuth();
    if (!isAuthenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const id = parseInt(params.id);
        const formData = await request.formData();

        // Fields to update
        const title = formData.get('title') as string;
        const summary = formData.get('summary') as string;
        const content = formData.get('content') as string;
        const author = formData.get('author') as string;
        const file = formData.get('image') as File | null;

        const data: any = {
            title, summary, content, author
        };

        // Handle Image Update
        if (file && file.size > 0) {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const uploadDir = join(process.cwd(), 'public/uploads');
            await mkdir(uploadDir, { recursive: true });

            const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '') || 'image.jpg'}`;
            await writeFile(join(uploadDir, filename), buffer);
            data.imageUrl = `/uploads/${filename}`;
        }

        const updated = await prisma.article.update({
            where: { id },
            data
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating article", error);
        return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const isAuthenticated = await verifyAuth();
    if (!isAuthenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const id = parseInt(params.id);
        await prisma.article.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 });
    }
}
