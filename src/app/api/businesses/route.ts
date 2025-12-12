import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET() {
    try {
        const businesses = await prisma.business.findMany({
            where: { isDeleted: false },
            orderBy: { name: 'asc' },
        });
        return NextResponse.json(businesses);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch businesses' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const isAuthenticated = await verifyAuth();
    if (!isAuthenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        // Basic validation could happen here
        const business = await prisma.business.create({
            data: {
                name: body.name,
                category: body.category || 'General',
                address: body.address || '',
                phone: body.phone || '',
                website: body.website || '',
                summary: body.summary || '',
                description: body.description || '',
                imageUrl: body.imageUrl || null,
            },
        });
        return NextResponse.json(business);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create business' }, { status: 500 });
    }
}
