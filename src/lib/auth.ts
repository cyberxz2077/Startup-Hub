/**
 * SecondMe OAuth 认证工具函数
 */

import { cookies } from 'next/headers';

const validateUrl = (url: string | undefined, name: string) => {
    if (!url) return '';
    if (!url.startsWith('http')) {
        console.warn(`Environment variable ${name} does not look like a valid URL: ${url}`);
        return '';
    }
    // Prevent common mistake where variable name is entered as value
    if (url === name) {
        console.warn(`Environment variable ${name} has its own name as value! Check Vercel settings.`);
        return '';
    }
    return url;
};

const getAuthConfig = () => ({
    clientId: process.env.SECONDME_CLIENT_ID || '',
    clientSecret: process.env.SECONDME_CLIENT_SECRET || '',
    oauthUrl: validateUrl(process.env.SECONDME_OAUTH_URL, 'SECONDME_OAUTH_URL'),
    tokenEndpoint: validateUrl(process.env.SECONDME_TOKEN_ENDPOINT, 'SECONDME_TOKEN_ENDPOINT'),
    redirectUri: validateUrl(process.env.SECONDME_REDIRECT_URI, 'SECONDME_REDIRECT_URI'),
});

export interface SecondMeTokens {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
}

/**
 * 生成 OAuth 授权 URL
 */
export function generateAuthUrl(): string {
    const config = getAuthConfig();
    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: 'user.info user.info.shades user.info.softmemory chat note.add',
        state: Math.random().toString(36).substring(7), // 简单的 state 生成
    });

    return `${config.oauthUrl}?${params.toString()}`;
}

/**
 * 用授权码换取 Access Token
 */
export async function exchangeCodeForTokens(code: string): Promise<SecondMeTokens> {
    const config = getAuthConfig();
    const response = await fetch(config.tokenEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uri: config.redirectUri,
        }),
    });

    if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();

    // 计算过期时间
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (data.expires_in || 7200));

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
    };
}

/**
 * 刷新 Access Token
 */
export async function refreshAccessToken(refreshToken: string): Promise<SecondMeTokens> {
    const config = getAuthConfig();
    const response = await fetch(config.tokenEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: config.clientId,
            client_secret: config.clientSecret,
        }),
    });

    if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    const data = await response.json();

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (data.expires_in || 7200));

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
    };
}

/**
 * 获取当前登录用户 Session
 */
export async function getSession() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
        return null;
    }

    // 从数据库获取用户信息
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                profile: true,
            },
        });

        if (!user) {
            return null;
        }

        // 检查 Token 是否过期
        if (new Date() > user.tokenExpiresAt) {
            // Token 已过期,尝试刷新
            try {
                const newTokens = await refreshAccessToken(user.refreshToken);

                // 更新数据库中的 Token
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        accessToken: newTokens.accessToken,
                        refreshToken: newTokens.refreshToken,
                        tokenExpiresAt: newTokens.expiresAt,
                    },
                });

                user.accessToken = newTokens.accessToken;
                user.refreshToken = newTokens.refreshToken;
                user.tokenExpiresAt = newTokens.expiresAt;
            } catch (error) {
                console.error('Token refresh failed:', error);
                return null;
            }
        }

        return user;
    } finally {
        await prisma.$disconnect();
    }
}

/**
 * 登出
 */
export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete('user_id');
}
