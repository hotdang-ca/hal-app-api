import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { readFile, stat } from 'fs/promises';
import mime from 'mime';

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ path: string[] }> }
) {
    // Await params to ensure we have the path data
    const params = await props.params;
    const { path } = params;

    if (!path || path.length === 0) {
        return new NextResponse('File not found', { status: 404 });
    }

    const filename = path.join('/');
    const filePath = join(process.cwd(), 'public/uploads', filename);

    try {
        await stat(filePath);
        const fileBuffer = await readFile(filePath);
        const mimeType = mime.getType(filePath) || 'application/octet-stream';

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': mimeType,
                'Content-Length': fileBuffer.length.toString(),
            },
        });
    } catch (error) {
        console.error('Error serving file:', error);
        return new NextResponse('File not found', { status: 404 });
    }
}
