import { randomBytes } from 'node:crypto';
import { createServer, type Socket } from 'node:net';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/infra/log/logger', () => ({
    structuredLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// This fixture receives mail only on loopback. It does not relay or contact an SMTP provider.
async function startSmtpFixture(credentials: { user: string; pass: string }) {
    const sockets = new Set<Socket>();
    const received: Array<{ from: string; recipients: string[]; message: string }> = [];
    const authenticatedUsers: string[] = [];
    const errors: Error[] = [];
    const server = createServer((socket) => {
        sockets.add(socket);
        socket.setEncoding('utf8');
        socket.setTimeout(5000, () => socket.destroy(new Error('Local SMTP fixture timed out')));
        socket.on('close', () => sockets.delete(socket));
        socket.on('error', (error) => errors.push(error));
        let buffer = '';
        let authenticated = false;
        let waitingForAuth = false;
        let receivingData = false;
        let from = '';
        let recipients: string[] = [];
        let messageLines: string[] = [];

        const authenticate = (encoded: string) => {
            const [, user, pass] = Buffer.from(encoded, 'base64').toString('utf8').split('\0');
            authenticated = user === credentials.user && pass === credentials.pass;
            if (authenticated) authenticatedUsers.push(user);
            socket.write(authenticated ? '235 2.7.0 Authenticated\r\n' : '535 5.7.8 Authentication failed\r\n');
        };

        socket.write('220 localhost ESMTP test fixture\r\n');
        socket.on('data', (chunk: string) => {
            buffer += chunk;
            let newline = buffer.indexOf('\r\n');
            while (newline !== -1) {
                const line = buffer.slice(0, newline);
                buffer = buffer.slice(newline + 2);
                if (receivingData) {
                    if (line === '.') {
                        received.push({ from, recipients: [...recipients], message: messageLines.join('\r\n') });
                        receivingData = false;
                        socket.write('250 2.0.0 Accepted locally\r\n');
                    } else {
                        messageLines.push(line.startsWith('..') ? line.slice(1) : line);
                    }
                } else if (waitingForAuth) {
                    waitingForAuth = false;
                    authenticate(line);
                } else if (/^(EHLO|HELO)\b/i.test(line)) {
                    // STARTTLS is deliberately absent; the fixture never opens a TLS or external connection.
                    socket.write('250-localhost\r\n250-AUTH PLAIN\r\n250 PIPELINING\r\n');
                } else if (/^AUTH PLAIN(?:\s|$)/i.test(line)) {
                    const encoded = line.slice('AUTH PLAIN'.length).trim();
                    if (encoded) authenticate(encoded);
                    else { waitingForAuth = true; socket.write('334 \r\n'); }
                } else if (/^MAIL FROM:/i.test(line)) {
                    if (!authenticated) socket.write('530 5.7.0 Authentication required\r\n');
                    else {
                        from = line.match(/^MAIL FROM:<([^>]+)>/i)?.[1] ?? '';
                        recipients = [];
                        messageLines = [];
                        socket.write('250 2.1.0 Sender accepted\r\n');
                    }
                } else if (/^RCPT TO:/i.test(line)) {
                    const recipient = line.match(/^RCPT TO:<([^>]+)>/i)?.[1];
                    if (!authenticated || !from || !recipient) socket.write('503 5.5.1 Invalid envelope\r\n');
                    else { recipients.push(recipient); socket.write('250 2.1.5 Recipient accepted\r\n'); }
                } else if (/^DATA$/i.test(line)) {
                    if (!authenticated || !from || !recipients.length) socket.write('503 5.5.1 Invalid envelope\r\n');
                    else { receivingData = true; socket.write('354 End with a single dot\r\n'); }
                } else if (/^QUIT$/i.test(line)) {
                    socket.end('221 2.0.0 Closing local connection\r\n');
                } else {
                    socket.write('500 5.5.1 Unsupported fixture command\r\n');
                }
                newline = buffer.indexOf('\r\n');
            }
        });
    });
    await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve(); });
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Local SMTP fixture did not bind a TCP port');
    return {
        port: address.port, received, authenticatedUsers, errors,
        async close() {
            for (const socket of sockets) socket.destroy();
            if (server.listening) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
        },
    };
}

describe('EmailService transport compatibility', () => {
    it('authenticates and delivers one MIME message to a real local SMTP server', async () => {
        const credentials = { user: randomBytes(12).toString('hex'), pass: randomBytes(24).toString('hex') };
        const smtp = await startSmtpFixture(credentials);
        const externalFetch = vi.fn(async () => { throw new Error('External HTTP is forbidden in the local SMTP test'); });
        try {
            vi.resetModules();
            vi.stubEnv('NODE_ENV', 'production');
            vi.stubEnv('SMTP_HOST', '127.0.0.1');
            vi.stubEnv('SMTP_PORT', String(smtp.port));
            vi.stubEnv('SMTP_SECURE', 'false');
            vi.stubEnv('SMTP_USER', credentials.user);
            vi.stubEnv('SMTP_PASS', credentials.pass);
            vi.stubEnv('RESEND_API_KEY', randomBytes(24).toString('hex'));
            vi.stubGlobal('fetch', externalFetch);
            const { emailService } = await import('../email.service');
            const result = await emailService.sendEmail({
                from: 'sender@example.invalid', to: 'recipient@example.invalid', replyTo: 'reply@example.invalid',
                subject: 'Local SMTP compatibility', html: '<p>Local SMTP fixture</p>', text: 'Local SMTP fixture',
            });

            expect(result.success).toBe(true);
            expect(result.messageId).toMatch(/^<[^>]+>$/);
            expect(smtp.authenticatedUsers).toEqual([credentials.user]);
            expect(smtp.received).toHaveLength(1);
            const delivery = smtp.received[0];
            expect(delivery.from).toBe('sender@example.invalid');
            expect(delivery.recipients).toEqual(['recipient@example.invalid']);
            expect(delivery.message).toMatch(/^Subject: Local SMTP compatibility\r?$/m);
            expect(delivery.message).toContain('Content-Type: multipart/alternative;');
            expect(delivery.message).toContain('Content-Type: text/plain; charset=utf-8');
            expect(delivery.message).toContain('Content-Type: text/html; charset=utf-8');
            expect(delivery.message).toContain('<p>Local SMTP fixture</p>');
            expect(delivery.message).toMatch(/\r\n\r\nLocal SMTP fixture\r\n/);
            expect(delivery.message.match(/^Message-ID:\s*(.+)$/im)?.[1].trim()).toBe(result.messageId);
            expect(smtp.errors).toEqual([]);
            expect(externalFetch).not.toHaveBeenCalled();
        } finally {
            try {
                await smtp.close();
            } finally {
                vi.unstubAllEnvs();
                vi.unstubAllGlobals();
                vi.resetModules();
            }
        }
    }, 15000);

    it('reports failure in production when no provider is configured', async () => {
        const externalFetch = vi.fn(async () => { throw new Error('External HTTP is forbidden in the provider absence test'); });
        try {
            vi.resetModules();
            vi.stubEnv('NODE_ENV', 'production');
            for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'RESEND_API_KEY']) vi.stubEnv(key, '');
            vi.stubGlobal('fetch', externalFetch);
            const { emailService } = await import('../email.service');
            const result = await emailService.sendEmail({
                from: 'sender@example.invalid', to: 'recipient@example.invalid', replyTo: 'reply@example.invalid',
                subject: 'Provider absence', html: '<p>Local test only</p>',
            });
            expect(result).toEqual({ success: false, error: 'No email provider configured or all providers failed' });
            expect(result.messageId).toBeUndefined();
            expect(externalFetch).not.toHaveBeenCalled();
        } finally {
            vi.unstubAllEnvs();
            vi.unstubAllGlobals();
            vi.resetModules();
        }
    });
});
