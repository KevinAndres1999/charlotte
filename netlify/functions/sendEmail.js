const sgMail = require('@sendgrid/mail');

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!process.env.SENDGRID_API_KEY) {
    return { statusCode: 500, body: 'SENDGRID_API_KEY not configured' };
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const to = body.to || [];
  const subject = body.subject || 'Notificación';
  const text = body.text || '';
  const from = process.env.FROM_EMAIL || 'no-reply@charlotte.example.com';

  if (!Array.isArray(to) || to.length === 0) {
    return { statusCode: 400, body: 'Missing recipients' };
  }

  try {
    // send one email per recipient
    const sends = to.map((recipient) => {
      const msg = {
        to: recipient,
        from,
        subject,
        text
      };
      return sgMail.send(msg);
    });

    await Promise.all(sends);
    return { statusCode: 200, body: 'Emails sent' };
  } catch (err) {
    console.error('sendEmail error', err);
    return { statusCode: 500, body: 'Error sending emails' };
  }
};
