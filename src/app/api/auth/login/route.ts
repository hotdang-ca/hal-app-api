import { NextResponse } from 'next/server';
import { login } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { password } = body;

        const success = await login(password);

        if (success) {
            return NextResponse.json({ success: true, message: 'Logged in' });
        } else {
            return NextResponse.json({ success: false, message: 'Invalid password' }, { status: 401 });
        }
    } catch (error) {
        return NextResponse.json({ success: false, message: 'Error processing request' }, { status: 500 });
    }
}
