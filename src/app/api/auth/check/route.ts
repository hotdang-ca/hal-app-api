import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export async function GET() {
    const isAuthenticated = await verifyAuth();
    return NextResponse.json({ authenticated: isAuthenticated });
}
