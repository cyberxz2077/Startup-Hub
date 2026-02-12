import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const SECONDME_API_BASE_URL = process.env.SECONDME_API_BASE_URL || 'https://app.mindos.com/gate/lab';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    console.log('[OAuth Callback] Received callback:', {
        code: code ? `${code.substring(0, 20)}...` : null,
        error,
        redirectUri: process.env.SECONDME_REDIRECT_URI
    });

    if (error) {
        console.error('[OAuth Callback] OAuth error:', error);
        return NextResponse.redirect(new URL(`/?error=${error}`, request.url));
    }

    if (!code) {
        console.error('[OAuth Callback] No authorization code received');
        return NextResponse.redirect(new URL('/?error=no_code', request.url));
    }

    try {
        console.log('[OAuth Callback] Exchanging code for tokens...');
        const tokens = await exchangeCodeForTokens(code);
        console.log('[OAuth Callback] Tokens received successfully');

        console.log('[OAuth Callback] Fetching user info...');
        const userInfoResponse = await fetch(`${SECONDME_API_BASE_URL}/api/secondme/user/info`, {
            headers: {
                'Authorization': `Bearer ${tokens.accessToken}`,
            },
        });

        if (!userInfoResponse.ok) {
            const errBody = await userInfoResponse.text();
            console.error('[OAuth Callback] Failed to fetch user info:', userInfoResponse.status, errBody);
            throw new Error(`Failed to fetch user info: ${userInfoResponse.status} ${errBody}`);
        }

        const userInfoData = await userInfoResponse.json();
        console.log('[OAuth Callback] User info response:', JSON.stringify(userInfoData).substring(0, 200));

        if (userInfoData.code !== 0) {
            console.error('[OAuth Callback] Invalid user info response:', userInfoData);
            throw new Error(`Invalid user info response: ${JSON.stringify(userInfoData)}`);
        }

        const userInfo = userInfoData.data || userInfoData;
        const secondmeUserId = userInfo.userId || userInfo.user_id;
        console.log('[OAuth Callback] User ID:', secondmeUserId);

        if (!secondmeUserId) {
            throw new Error('No user ID received from SecondMe');
        }

        const prisma = new PrismaClient();

        try {
            console.log('[OAuth Callback] Upserting user in database...');
            const user = await prisma.user.upsert({
                where: { secondmeUserId: secondmeUserId },
                update: {
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    tokenExpiresAt: tokens.expiresAt,
                    name: userInfo.name || null,
                    avatar: userInfo.avatar || null,
                    bio: userInfo.bio || null,
                },
                create: {
                    secondmeUserId: secondmeUserId,
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    tokenExpiresAt: tokens.expiresAt,
                    name: userInfo.name || null,
                    avatar: userInfo.avatar || null,
                    bio: userInfo.bio || null,
                },
            });

            console.log('[OAuth Callback] User saved, setting cookie...');
            const cookieStore = await cookies();
            cookieStore.set('user_id', user.id, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 30,
                path: '/',
            });

            console.log('[OAuth Callback] Success! Redirecting to home...');
            return NextResponse.redirect(new URL('/', request.url));
        } finally {
            await prisma.$disconnect();
        }
    } catch (error) {
        console.error('[OAuth Callback] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.redirect(new URL(`/?error=auth_failed&details=${encodeURIComponent(errorMessage)}`, request.url));
    }
}
