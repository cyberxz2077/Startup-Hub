import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const SECONDME_API_BASE_URL = process.env.SECONDME_API_BASE_URL!;

/**
 * OAuth 回调处理
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
        return NextResponse.redirect(new URL(`/?error=${error}`, request.url));
    }

    if (!code) {
        return NextResponse.redirect(new URL('/?error=no_code', request.url));
    }

    try {
        // 1. 换取 Access Token
        const tokens = await exchangeCodeForTokens(code);

        // 2. 获取用户信息
        const userInfoResponse = await fetch(`${SECONDME_API_BASE_URL}/api/secondme/user/info`, {
            headers: {
                'Authorization': `Bearer ${tokens.accessToken}`,
            },
        });

        if (!userInfoResponse.ok) {
            throw new Error('Failed to fetch user info');
        }

        const userInfoData = await userInfoResponse.json();

        if (userInfoData.code !== 0) {
            throw new Error('Invalid user info response');
        }

        const userInfo = userInfoData.data;

        // 3. 创建或更新用户
        const prisma = new PrismaClient();

        try {
            const user = await prisma.user.upsert({
                where: { secondmeUserId: userInfo.user_id },
                update: {
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    tokenExpiresAt: tokens.expiresAt,
                    name: userInfo.name || null,
                    avatar: userInfo.avatar || null,
                    bio: userInfo.bio || null,
                },
                create: {
                    secondmeUserId: userInfo.user_id,
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    tokenExpiresAt: tokens.expiresAt,
                    name: userInfo.name || null,
                    avatar: userInfo.avatar || null,
                    bio: userInfo.bio || null,
                },
            });

            // 4. 设置 Session Cookie
            const cookieStore = await cookies();
            cookieStore.set('user_id', user.id, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 30, // 30 天
                path: '/',
            });

            // 5. 重定向到首页
            return NextResponse.redirect(new URL('/', request.url));
        } finally {
            await prisma.$disconnect();
        }
    } catch (error) {
        console.error('OAuth callback error:', error);
        return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
    }
}
