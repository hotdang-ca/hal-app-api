import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

// Next.js 15/16 params handling might be async.
// In standard route handlers:
// export async function PUT(request: Request, { params }: { params: { id: string } }) { ... }

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const isAuthenticated = await verifyAuth();
    if (!isAuthenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const id = parseInt(params.id);
        const body = await request.json();

        const updatedBusiness = await prisma.business.update({
            where: { id },
            data: {
                name: body.name,
                category: body.category,
                address: body.address,
                phone: body.phone,
                website: body.website,
                summary: body.summary,
                description: body.description,
                imageUrl: body.imageUrl,
            },
        });
        return NextResponse.json(updatedBusiness);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update business' }, { status: 500 });
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
        // Soft delete
        await prisma.business.update({
            where: { id },
            data: { isDeleted: true },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete business' }, { status: 500 });
    }
}
