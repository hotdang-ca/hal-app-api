import { cookies } from 'next/headers';

const COOKIE_NAME = 'admin_session';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

export async function login(password: string) {
    if (password === ADMIN_PASSWORD) {
        // Set cookie manually
        // In Next.js App Router, cookies() is async in newer versions or at least needs await in specific contexts,
        // but checking docs for Next 15/16 compatibility is key. 
        // We will assume standard Route Handler API.
        const cookieStore = await cookies();
        cookieStore.set(COOKIE_NAME, 'authenticated', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24, // 1 day
            path: '/',
        });
        return true;
    }
    return false;
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
}

export async function verifyAuth() {
    const cookieStore = await cookies();
    const session = cookieStore.get(COOKIE_NAME);
    return session?.value === 'authenticated';
}
