import { NextResponse } from 'next/server';
import { generateAuthUrl } from '@/lib/auth';

/**
 * OAuth 登录 - 重定向到 SecondMe 授权页
 */
export async function GET() {
    try {
        const authUrl = generateAuthUrl();
        console.log('Generated Auth URL:', authUrl);

        if (!authUrl || authUrl.startsWith('?')) {
            console.error('Invalid Auth URL generated - likely missing SECONDME_OAUTH_URL');
            return NextResponse.json({ error: 'Auth configuration missing' }, { status: 500 });
        }

        return NextResponse.redirect(authUrl);
    } catch (error: unknown) {
        console.error('Login Route Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        return NextResponse.json({
            error: 'Internal Server Error',
            details: errorMessage,
            stack: errorStack
        }, { status: 500 });
    }
}
