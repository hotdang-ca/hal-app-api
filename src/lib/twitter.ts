import { TwitterApi } from 'twitter-api-v2';
import { prisma } from '@/lib/prisma';

export async function getTwitterClient() {
    const account = await prisma.socialAccount.findFirst({
        where: { platform: 'twitter' }
    });

    if (!account) return null;

    const client = new TwitterApi({
        clientId: process.env.TWITTER_CLIENT_ID!,
        clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    });

    // Check if expired (give 5 min buffer)
    const isExpired = account.expiresAt && new Date() > new Date(account.expiresAt.getTime() - 5 * 60 * 1000);

    if (isExpired && account.refreshToken) {
        try {
            const { client: refreshedClient, accessToken, refreshToken: newRefreshToken, expiresIn } = await client.refreshOAuth2Token(account.refreshToken);

            await prisma.socialAccount.update({
                where: { id: account.id },
                data: {
                    accessToken,
                    refreshToken: newRefreshToken,
                    expiresAt: new Date(Date.now() + (expiresIn * 1000)),
                }
            });

            return refreshedClient;
        } catch (error) {
            console.error("Failed to refresh Twitter token", error);
            return null;
        }
    }

    // Return client with current access token
    return new TwitterApi(account.accessToken);
}
