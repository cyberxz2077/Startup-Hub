/**
 * SecondMe API 客户端工具函数
 */

const SECONDME_API_BASE_URL = process.env.SECONDME_API_BASE_URL!;

export interface SecondMeUserInfo {
    user_id: string;
    name?: string;
    avatar?: string;
    bio?: string;
}

export interface SecondMeShade {
    id: string;
    name: string;
    category?: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

/**
 * 获取用户基础信息
 */
export async function getUserInfo(accessToken: string): Promise<SecondMeUserInfo> {
    const response = await fetch(`${SECONDME_API_BASE_URL}/api/secondme/user/info`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.code !== 0) {
        throw new Error(`API error: ${data.message || 'Unknown error'}`);
    }

    return data.data;
}

/**
 * 获取用户兴趣标签 (Shades)
 */
export async function getUserShades(accessToken: string): Promise<SecondMeShade[]> {
    const response = await fetch(`${SECONDME_API_BASE_URL}/api/secondme/user/shades`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch user shades: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.code !== 0) {
        throw new Error(`API error: ${data.message || 'Unknown error'}`);
    }

    return data.data.shades || [];
}

/**
 * 获取用户软记忆
 */
export async function getUserSoftMemory(accessToken: string): Promise<string> {
    const response = await fetch(`${SECONDME_API_BASE_URL}/api/secondme/user/softmemory`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch soft memory: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.code !== 0) {
        throw new Error(`API error: ${data.message || 'Unknown error'}`);
    }

    return data.data.soft_memory || '';
}

/**
 * 发送聊天消息 (流式)
 */
export async function sendChatMessage(
    accessToken: string,
    messages: ChatMessage[],
    onChunk: (text: string) => void,
    onComplete: () => void
): Promise<void> {
    const response = await fetch(`${SECONDME_API_BASE_URL}/api/secondme/chat`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
        throw new Error(`Chat request failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
        throw new Error('No response body');
    }

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                        onComplete();
                        return;
                    }

                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.delta) {
                            onChunk(parsed.delta);
                        }
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}

/**
 * 添加笔记到 SecondMe
 */
export async function addNote(accessToken: string, content: string): Promise<void> {
    const response = await fetch(`${SECONDME_API_BASE_URL}/api/secondme/note`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
    });

    if (!response.ok) {
        throw new Error(`Failed to add note: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.code !== 0) {
        throw new Error(`API error: ${data.message || 'Unknown error'}`);
    }
}
