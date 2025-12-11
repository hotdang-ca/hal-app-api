import { NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    // Retrieve cookies
    // Note: Next.js 15/16 style cookies might differ slightly, checking standard Request usage
    // Using standard Web API for request.headers.get('cookie') parsing or better yet, cookies() from next/headers if server comp, 
    // but in Route Handlers we use request.cookies (NextRequest)
    // Casting request to NextRequest to behave nicely with TS if needed, or using raw headers.
    // Let's use request.cookies if available or standard parsing. 
    // Wait, Route Handler 'request' is standard Request. NextRequest extends it.

    // Helper to get cookie
    const getCookie = (name: string) => {
        const cookieHeader = request.headers.get('cookie') || '';
        const cookies = Object.fromEntries(cookieHeader.split('; ').map(c => c.split('=')));
        return cookies[name];
    };

    const storedState = getCookie('twitter_state');
    const codeVerifier = getCookie('twitter_code_verifier');

    if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
        return NextResponse.json({ error: 'Invalid State or Code' }, { status: 400 });
    }

    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;
    const callbackUrl = process.env.TWITTER_CALLBACK_URL || 'http://localhost:3000/api/auth/twitter/callback';

    if (!clientId || !clientSecret) return NextResponse.json({ error: 'Config Error' }, { status: 500 });

    try {
        const client = new TwitterApi({ clientId, clientSecret });

        const { client: loggedClient, accessToken, refreshToken, expiresIn } = await client.loginWithOAuth2({
            code,
            codeVerifier,
            redirectUri: callbackUrl,
        });

        const me = await loggedClient.v2.me();

        // Save to DB
        // Check if exists
        console.log('Prisma Models:', Object.keys(prisma));
        const existing = await prisma.socialAccount.findFirst({ where: { platform: 'twitter' } });

        const data = {
            platform: 'twitter',
            accessToken,
            refreshToken,
            expiresAt: new Date(Date.now() + (expiresIn * 1000)),
            username: me.data.username,
            userId: me.data.id,
        };

        if (existing) {
            await prisma.socialAccount.update({ where: { id: existing.id }, data });
        } else {
            await prisma.socialAccount.create({ data });
        }

        return NextResponse.redirect(new URL('/admin?tab=social', request.url));
    } catch (e) {
        console.error('Twitter Login Error', e);
        // Cast error to any to access message or data safely
        const errorMessage = (e as any)?.message || (e as any)?.data || 'Unknown error';
        return NextResponse.json({ error: `Login Failed: ${errorMessage}` }, { status: 500 });
    }
}
