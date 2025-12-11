import { NextResponse } from 'next/server';
import { getTwitterClient } from '@/lib/twitter';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET() {
    const isAuthenticated = await verifyAuth();
    if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const client = await getTwitterClient();
    if (!client) {
        return NextResponse.json({ error: 'Twitter not connected or expired' }, { status: 400 });
    }

    try {
        const account = await prisma.socialAccount.findFirst({ where: { platform: 'twitter' } });
        if (!account?.userId) return NextResponse.json({ error: 'No User ID found' }, { status: 400 });

        // Fetch User Timeline
        // We need media expansions to get images
        const timeline = await client.v2.userTimeline(account.userId, {
            max_results: 20,
            "tweet.fields": ["created_at", "entities", "text", "author_id"],
            "media.fields": ["url", "preview_image_url", "type"],
            "expansions": ["attachments.media_keys", "author_id"],
            "user.fields": ["name", "username", "profile_image_url"]
        });

        // Parse tweets into a friendly format for the frontend
        const data = timeline.data.data.map(tweet => {
            const mediaKeys = tweet.attachments?.media_keys || [];
            const media = mediaKeys.map(key => {
                const m = timeline.includes?.media?.find(m => m.media_key === key);
                return m ? (m.url || m.preview_image_url) : null;
            }).filter(Boolean) as string[];

            const author = timeline.includes?.users?.find(u => u.id === tweet.author_id);

            return {
                id: tweet.id,
                text: tweet.text,
                createdAt: tweet.created_at,
                media,
                author: {
                    name: author?.name || 'Unknown',
                    username: author?.username || 'unknown',
                    profileImageUrl: author?.profile_image_url
                },
                originalUrl: `https://twitter.com/${author?.username}/status/${tweet.id}`
            };
        });

        return NextResponse.json({ tweets: data });
    } catch (e: any) {
        if (e.code === 429) {
            console.error("Twitter Rate Limit Hit", e);
            // Twitter v2 headers often return reset time in seconds epoch
            // e.rateLimit might contain { limit, remaining, reset } if using twitter-api-v2
            const reset = e.rateLimit?.reset;
            let msg = 'Rate Limit Exceeded. Try again later.';
            if (reset) {
                const date = new Date(reset * 1000);
                msg = `Rate Limit Exceeded. Resets at ${date.toLocaleTimeString()}.`;
            }
            return NextResponse.json({ error: msg }, { status: 429 });
        }
        console.error("Fetch Error", e);
        return NextResponse.json({ error: 'Failed to fetch tweets' }, { status: 500 });
    }
}
