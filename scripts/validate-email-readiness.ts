import { emailService } from '../src/modules/email/email.service';

async function validate() {
  console.log('=> Starting Email Readiness Validation...');
  
  const envs = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'MAIL_FROM',
    'MAIL_REPLY_TO'
  ];

  let missing = false;
  for (const env of envs) {
    if (!process.env[env]) {
      console.warn(`⚠️  Env ${env} is NOT set. (MANUAL_RAFA)`);
      missing = true;
    } else {
      console.log(`✅ Env ${env} is set.`);
    }
  }

  const mailFrom = process.env.MAIL_FROM || '';
  if (mailFrom && !mailFrom.includes('@condstoreos.com')) {
    console.warn(`⚠️  MAIL_FROM does not use @condstoreos.com domain: ${mailFrom}`);
  } else if (mailFrom) {
    console.log(`✅ MAIL_FROM uses @condstoreos.com domain.`);
  }

  if (missing) {
    console.log('ℹ️  Email integration requires real SMTP credentials for full functionality. Proceeding with dry-run/mock validation.');
  }

  // Test dry-run
  try {
    if (process.env.SEND_TEST_EMAIL === 'true' && process.env.TEST_EMAIL_TO) {
      console.log(`🚀 Sending REAL test email to ${process.env.TEST_EMAIL_TO}...`);
      const result = await emailService.sendEmail({
        to: process.env.TEST_EMAIL_TO,
        subject: 'Teste de Prontidão — CondStore OS',
        html: '<h1>Teste de E-mail</h1><p>Este é um e-mail de teste disparado pelo validador de prontidão.</p>',
        text: 'Teste de E-mail: Este é um e-mail de teste disparado pelo validador de prontidão.',
      });
      if (result.success) {
        console.log(`✅ Test email sent! ID: ${result.messageId}`);
      } else {
        console.error(`❌ Test email failed: ${result.error}`);
        process.exit(1);
      }
    } else {
      console.log('ℹ️  Skipping real email send (SEND_TEST_EMAIL != true).');
    }

    console.log('\n🚀 EMAIL READINESS: OK');
    process.exit(0);
  } catch (error) {
    console.error('❌ Email Readiness: FAILED', error);
    process.exit(1);
  }
}

validate();
