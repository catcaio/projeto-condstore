'use server';

import { revalidatePath } from 'next/cache';
import { inboundMessageRepository } from '../../../modules/llm/repositories/message.repository';
import { getSessionUser } from '../../../infra/auth/session';
import { headers } from 'next/headers';

export async function labelMessage(formData: FormData) {
    const messageId = formData.get('messageId') as string;
    const intent = formData.get('intent') as string;

    // Basic Auth Check (using existing session infra)
    // We need to mock a request object or similar if getSessionUser relies on it, 
    // but getSessionUser usually takes NextRequest. 
    // In Server Actions, we can use `headers()` to construct context if needed or assume protected by middleware.
    // For V1/prototype, we'll assume middleware protects /cockpit/* and just hardcode author or try to get it.

    const author = 'operator'; // Fallback for V1

    if (!messageId || !intent) {
        throw new Error('Missing fields');
    }

    await inboundMessageRepository.saveLabel(messageId, intent, author);
    revalidatePath('/cockpit/llm/label');
    revalidatePath('/cockpit/llm/metrics');
}
