import { NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';

export async function GET() {
    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;

    // We assume the callback is set to <YOUR_DOMAIN>/api/auth/twitter/callback
    // For dev: http://localhost:3000/api/auth/twitter/callback
    const callbackUrl = process.env.TWITTER_CALLBACK_URL || 'http://localhost:3000/api/auth/twitter/callback';

    if (!clientId || !clientSecret) {
        return NextResponse.json({ error: 'Missing Twitter Credentials' }, { status: 500 });
    }

    const client = new TwitterApi({ clientId, clientSecret });

    // Generate Auth Link
    // Scopes needed for reading user info and timeline
    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(callbackUrl, {
        scope: ['tweet.read', 'users.read', 'offline.access']
    });

    // We need to store codeVerifier and state temporarily to verify in callback.
    // For simplicity in this Next.js API route, we can verify via cookies (stateless).

    const response = NextResponse.redirect(url);

    // Set cookies for verification
    response.cookies.set('twitter_code_verifier', codeVerifier, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/' });
    response.cookies.set('twitter_state', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/' });

    return response;
}
