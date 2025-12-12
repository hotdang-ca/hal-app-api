import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

import { join } from 'path';
import { unlink } from 'fs/promises';

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;

    const isAuthenticated = await verifyAuth();
    if (!isAuthenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const id = parseInt(params.id);
        const body = await request.json();

        // If Archiving, delete the file
        if (body.isArchived) {
            const current = await prisma.hotlineMessage.findUnique({ where: { id } });
            if (current && current.audioUrl) {
                try {
                    // audioUrl is like /uploads/filename.ext
                    const filename = current.audioUrl.split('/uploads/')[1];
                    if (filename) {
                        const filePath = join(process.cwd(), 'public/uploads', filename);
                        await unlink(filePath);
                        console.log(`Deleted file: ${filePath}`);
                    }
                } catch (e) {
                    console.error("Error deleting file:", e);
                    // Continue archiving even if file delete fails (maybe file already gone)
                }
            }
        }

        const updated = await prisma.hotlineMessage.update({
            where: { id },
            data: {
                isRead: body.isRead,
                isArchived: body.isArchived,
                // Optional: set audioUrl to null if we want to indicate file is gone?
                // The prompt says "remove the uploaded mp3", implying the record stays.
                // Keeping audioUrl pointing to non-existent file might be misleading, 
                // but for now let's leave it or set a flag? 
                // Let's rely on isArchived to know we can't play it.
            },
        });
        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating message:", error);
        return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
    }
}
