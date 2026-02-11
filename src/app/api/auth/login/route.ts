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
    } catch (error: any) {
        console.error('Login Route Error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
