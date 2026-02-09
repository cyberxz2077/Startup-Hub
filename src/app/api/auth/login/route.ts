import { NextResponse } from 'next/server';
import { generateAuthUrl } from '@/lib/auth';

/**
 * OAuth 登录 - 重定向到 SecondMe 授权页
 */
export async function GET() {
    const authUrl = generateAuthUrl();
    return NextResponse.redirect(authUrl);
}
