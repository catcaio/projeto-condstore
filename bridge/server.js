const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3333;
const WEBHOOK_SECRET = process.env.LINEAR_WEBHOOK_SECRET;
const ACCESS_TOKEN = process.env.LINEAR_ACCESS_TOKEN;
const OUTBOX_DIR = process.env.OUTBOX_DIR || './outbox';

// Ensure outbox exists
if (!fs.existsSync(OUTBOX_DIR)) {
  fs.mkdirSync(OUTBOX_DIR, { recursive: true });
}

// Middleware to capture raw body for signature verification
app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// 1. GET /health
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'linear-antigravity-bridge'
  });
});

// 2. POST /linear/webhook
app.post('/linear/webhook', (req, res) => {
  const secret = process.env.LINEAR_WEBHOOK_SECRET;
  const signature = req.headers['linear-signature'] || req.headers['x-linear-signature'];
  
  if (secret) {
    if (!signature || !req.rawBody) {
      console.warn('[BRIDGE] Missing signature or raw body');
      return res.status(401).send('Unauthorized');
    }

    const hmac = crypto.createHmac('sha256', secret.trim());
    hmac.update(req.rawBody);
    const digest = hmac.digest('hex');

    const digestBuffer = Buffer.from(digest, 'hex');
    const signatureBuffer = Buffer.from(signature, 'hex');

    let isMatch = false;
    try {
      if (digestBuffer.length === signatureBuffer.length) {
        isMatch = crypto.timingSafeEqual(digestBuffer, signatureBuffer);
      }
    } catch (e) {
      isMatch = false;
    }

    if (!isMatch) {
      console.error('[BRIDGE] SIGNATURE VALIDATION FAILED');
      return res.status(401).send('Unauthorized');
    }
    
    console.log('[BRIDGE] SIGNATURE VALIDATION ENFORCED & PASSED');
  } else {
    console.warn('[BRIDGE] WARNING: Running without LINEAR_WEBHOOK_SECRET verification (DEV MODE)');
  }

  const event = req.body;
  if (!event || !event.type) {
    return res.status(400).send('Invalid payload');
  }

  // ⚠️ SELF-TRIGGER PREVENTION & DEBUG LOGGING
  const actorId = event.actorId || (event.actor && event.actor.id);
  const authorId = event.data && (event.data.userId || event.data.authorId);
  const AGENT_ID = '559d8ce4-2cec-4af9-b19d-88a57520cf41';
  
  console.log(`[BRIDGE] Event: ${sanitizeForLog(event.type)} | Action: ${sanitizeForLog(event.action)} | Actor: ${actorId} | Author: ${authorId}`);

  if (actorId === AGENT_ID || authorId === AGENT_ID) {
    console.log('[BRIDGE] Loop Prevention: Skipping event from AGENT_ID');
    return res.status(200).send('OK');
  }

  // Double check body content for bridge's own status messages
  if (event.type === 'Comment' && event.data && event.data.body) {
    if (event.data.body.includes('ANTIGRAVITY BRIDGE ONLINE')) {
      console.log('[BRIDGE] Loop Prevention: Skipping bridge status message');
      return res.status(200).send('OK');
    }
  }

  handleLinearEvent(event);

  res.status(200).send('OK');
});

// 3. Logic Layer
function handleLinearEvent(event) {
  const trigger = shouldTriggerAntigravityAudit(event);
  if (trigger.triggered) {
    dispatchAntigravityAudit(event, trigger.reason);
  }
}

function shouldTriggerAntigravityAudit(event) {
  const { action, type, data } = event;
  const content = JSON.stringify(data).toLowerCase();

  // Helper to check for keywords
  const hasKeyword = (k) => content.includes(k.toLowerCase());

  const triggers = [
    { key: 'antigravity-audit', reason: 'Label: antigravity-audit' },
    { key: 'ANTIGRAVITY AUDIT GATE', reason: 'Text: AUDIT GATE' },
    { key: 'AUDIT PASS', reason: 'Text: AUDIT PASS' },
    { key: 'READY FOR PR-CLOSER', reason: 'Text: READY FOR CLOSER' },
    { key: 'In Review', reason: 'Status: In Review' },
    { key: 'Review', reason: 'Status: Review' },
    { key: 'Ready for audit', reason: 'Status: Ready for audit' },
    { key: 'CI green', reason: 'CI Signal: green' },
    { key: 'CI verde', reason: 'CI Signal: verde' },
    { key: 'Security green', reason: 'Security Signal: green' },
    { key: 'Vercel green', reason: 'Vercel Signal: green' },
    { key: 'checks passed', reason: 'Checks: passed' },
    { key: '@Anti', reason: 'Mention: @Anti' },
    { key: '@antigravitybridge', reason: 'Mention: @antigravitybridge' },
    { key: '@antigravity', reason: 'Mention: @antigravity' },
    { key: '@anti', reason: 'Mention: @anti' },
    { key: '@cr_bn20', reason: 'Mention: @cr_bn20' }
  ];

  // Specific check for labels in Issue nodes
  if (type === 'Issue' && data.labels && data.labels.nodes) {
    const labels = data.labels.nodes.map(l => l.name);
    if (labels.includes('antigravity-audit')) {
      return { triggered: true, reason: 'Label: antigravity-audit' };
    }
  }

  for (const t of triggers) {
    if (hasKeyword(t.key)) {
      return { triggered: true, reason: t.reason };
    }
  }

  return { triggered: false };
}

const { exec } = require('child_process');

function dispatchAntigravityAudit(event, reason) {
  const { data, type } = event;
  const issue = type === 'Comment' ? data.issue : data;
  
  if (!issue) {
    console.error('[BRIDGE] Could not resolve issue context for dispatch');
    return;
  }

  const handoff = {
    issueId: issue.id,
    issueIdentifier: issue.identifier || 'UNKNOWN',
    title: issue.title || 'No Title',
    url: issue.url || `https://linear.app/issue/${issue.identifier}`,
    labels: issue.labels && issue.labels.nodes ? issue.labels.nodes.map(l => l.name) : [],
    triggerReason: reason,
    receivedAt: new Date().toISOString(),
    recommendedPrompt: buildAuditPrompt(issue)
  };

  const fileName = `antigravity-audit-handoff-${issue.identifier || 'ID'}-${Date.now()}.json`;
  const filePath = path.join(OUTBOX_DIR, fileName);
  fs.writeFileSync(filePath, JSON.stringify(handoff, null, 2));

  // 🚀 ACTIVE DISPATCHER: Parse command from mention and execute
  if (type === 'Comment' && reason.toLowerCase().includes('mention')) {
    const body = (data.body || '').trim();
    executeRequestedCommand(issue.id, body, issue.identifier);
  }
}

function executeRequestedCommand(issueId, body, issueIdentifier) {
  // 1. Parse Intent by cleaning up mentions
  const cleanBody = body.replace(/@antigravitybridge/gi, '')
                        .replace(/@antigravity/gi, '')
                        .replace(/@anti/gi, '')
                        .replace(/@cr_bn20/gi, '')
                        .trim();

  if (!cleanBody) {
    postLinearComment(issueId, `⚠️ **COMANDO NÃO RECONHECIDO**\n\nPor favor, informe o comando após a menção. Exemplo: \`@antigravity npm run test\``);
    return;
  }

  if (cleanBody.toLowerCase() === 'status') {
    postLinearComment(issueId, `✅ **SYSTEM STATUS**\nBridge: ONLINE\nPort: ${PORT}\nEnvironment: ${process.env.NODE_ENV || 'development'}`);
    return;
  }

  const cmdToRun = cleanBody;
  const intentName = `Command: ${cmdToRun}`;

  // 2. Post acknowledgment
  postLinearComment(issueId, `⏳ **ANTIGRAVITY ACTIVE DISPATCHER**\n\nComando recebido. Iniciando execução local...\n\n_Comando:_ \`${cmdToRun}\``);

  console.log(`[BRIDGE] Executing mapped intent: ${intentName} -> ${cmdToRun}`);

  // 3. Execute
  const execOptions = { 
    cwd: path.resolve(__dirname, '..'), // Run from project root
    maxBuffer: 1024 * 1024 * 5 // 5MB buffer for large outputs
  };

  const startTime = Date.now();
  
  exec(cmdToRun, execOptions, (error, stdout, stderr) => {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const statusIcon = error ? '❌ FALHA' : '✅ SUCESSO';
    
    // Truncate output to fit Linear comment limits (keep last ~2000 chars of stdout/err)
    const formatOutput = (out) => out ? (out.length > 2000 ? '...\n' + out.slice(-2000) : out) : 'No output';
    
    const reply = `**RESULTADO: ${intentName}** (${statusIcon})\n*Tempo de execução: ${duration}s*\n\n**Comando:** \`${cmdToRun}\`\n\n**Saída (Stdout):**\n\`\`\`bash\n${formatOutput(stdout)}\n\`\`\`\n\n**Erros (Stderr):**\n\`\`\`bash\n${formatOutput(stderr)}\n\`\`\``;

    postLinearComment(issueId, reply);
    console.log(`[BRIDGE] Execution complete. Posted results to issue.`);
  });
}

async function postLinearComment(issueId, body) {
  if (!ACCESS_TOKEN) return;
  try {
    await axios.post('https://api.linear.app/graphql', {
      query: `mutation CommentCreate($issueId: String!, $body: String!) { commentCreate(input: { issueId: $issueId, body: $body }) { success } }`,
      variables: { issueId, body }
    }, { headers: { 'Authorization': ACCESS_TOKEN, 'Content-Type': 'application/json' }});
  } catch (e) {
    console.error('[BRIDGE] Failed to post auto-reply:', e.message);
  }
}

function buildAuditPrompt(issue) {
  return `Execute como PR Auditor adversarial do CONDSTORE OS.`;
}

function sanitizeForLog(input) {
  if (typeof input !== 'string') return String(input);
  return input.replace(/[a-f0-9]{32,}/gi, '[REDACTED]');
}

app.listen(PORT, () => {
  console.log(`[BRIDGE] Linear-Antigravity Bridge active on port ${PORT}`);
});
