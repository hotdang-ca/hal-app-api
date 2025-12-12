import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET() {
    const isAuthenticated = await verifyAuth();
    if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const twitter = await prisma.socialAccount.findFirst({ where: { platform: 'twitter' } });

    // Also get counts of imported items
    const feedCount = await prisma.feedItem.count();

    return NextResponse.json({
        twitter: {
            connected: !!twitter,
            username: twitter?.username,
        },
        stats: {
            importedCount: feedCount
        }
    });
}
