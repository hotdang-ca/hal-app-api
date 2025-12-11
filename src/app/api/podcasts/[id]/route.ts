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

        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const host = formData.get('host') as string;
        const file = formData.get('audio') as File | null;
        const imageFile = formData.get('image') as File | null;

        const data: any = {
            title, description, host
        };

        const uploadDir = join(process.cwd(), 'public/uploads');

        // Handle Audio Update
        if (file && file.size > 0) {
            await mkdir(uploadDir, { recursive: true });
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '') || 'podcast.m4a'}`;
            await writeFile(join(uploadDir, filename), buffer);
            data.audioUrl = `/uploads/${filename}`;
            // Could re-calculate duration here if needed
        }

        // Handle Image Update
        if (imageFile && imageFile.size > 0) {
            await mkdir(uploadDir, { recursive: true });
            const imgBytes = await imageFile.arrayBuffer();
            const imgBuffer = Buffer.from(imgBytes);
            const imgName = `${Date.now()}-thumb-${imageFile.name.replace(/[^a-zA-Z0-9.]/g, '') || 'image.jpg'}`;
            await writeFile(join(uploadDir, imgName), imgBuffer);
            data.imageUrl = `/uploads/${imgName}`;
        }

        const updated = await prisma.podcast.update({
            where: { id },
            data
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating podcast", error);
        return NextResponse.json({ error: 'Failed to update podcast' }, { status: 500 });
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
        await prisma.podcast.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete podcast' }, { status: 500 });
    }
}
