export function getOrCreateClientUserId(): string {
    if (typeof window === 'undefined') {
        return ''; // Guard for SSR
    }

    try {
        let userId = localStorage.getItem('cid');
        if (!userId) {
            // Check old key just in case we have to migrate it, though the prompt implies new key.
            const oldId = localStorage.getItem('anon_user_id');
            if (oldId) {
                userId = oldId;
                localStorage.setItem('cid', userId);
                localStorage.removeItem('anon_user_id');
            } else {
                userId = `anon_${crypto.randomUUID()}`;
                localStorage.setItem('cid', userId);
            }
        }

        // Ensure "entitled" cookie existence isn't handled here directly unless needed,
        // but the prompt says placeholder middleware reads "entitled" cookie.
        // We will leave cookie management to success hooks or components.

        return userId;
    } catch (e) {
        // Fallback for incognito mode or restricted localStorage
        return `anon_${Math.random().toString(36).substring(7)}`;
    }
}
