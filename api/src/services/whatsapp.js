import axios from 'axios';
import logger from '../utils/logger.js';

/**
 * WhatsApp Business API Integration
 * Using Africa's Talking WhatsApp or WhatsApp Business Cloud API
 */

const WHATSAPP_CONFIG = {
  apiKey: process.env.AFRICASTALKING_API_KEY,
  username: process.env.AFRICASTALKING_USERNAME,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  provider: process.env.WHATSAPP_PROVIDER || 'africastalking', // 'africastalking' or 'meta'
};

/**
 * Send WhatsApp message (text)
 */
export async function sendWhatsAppMessage(to, message) {
  try {
    const formattedPhone = to.startsWith('+') ? to : `+${to}`;

    if (WHATSAPP_CONFIG.provider === 'africastalking') {
      // Africa's Talking WhatsApp
      const response = await axios.post(
        'https://api.africastalking.com/v1/messaging',
        {
          username: WHATSAPP_CONFIG.username,
          to: formattedPhone,
          message: message,
          channel: 'WhatsApp',
        },
        {
          headers: {
            'apiKey': WHATSAPP_CONFIG.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('WhatsApp message sent via Africa\'s Talking:', {
        to: formattedPhone,
        status: response.data.SMSMessageData.Recipients[0].status,
      });

      return { success: true, provider: 'africastalking' };
    } else {
      // Meta WhatsApp Business Cloud API
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${WHATSAPP_CONFIG.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: formattedPhone.replace('+', ''),
          type: 'text',
          text: { body: message },
        },
        {
          headers: {
            'Authorization': `Bearer ${WHATSAPP_CONFIG.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('WhatsApp message sent via Meta:', {
        to: formattedPhone,
        messageId: response.data.messages[0].id,
      });

      return { success: true, provider: 'meta' };
    }
  } catch (error) {
    logger.error('WhatsApp sending failed:', error.response?.data || error.message);
    throw new Error('Failed to send WhatsApp message');
  }
}

/**
 * Send rent reminder via WhatsApp
 */
export async function sendRentReminderWhatsApp(tenant, amount, dueDate, paybill) {
  const message = `🏠 *Haven Property Management*

Habari ${tenant.name},

*Kumbusho ya Kodi* 📅
━━━━━━━━━━━━━━━━━━
Kiasi: *KES ${amount.toLocaleString()}*
Muda: ${new Date(dueDate).toLocaleDateString('en-KE')}

*Jinsi ya Kulipa:* 💳
1️⃣ Nenda M-Pesa
2️⃣ Lipa Bill
3️⃣ Paybill: ${paybill}
4️⃣ Account: ${tenant.id}
5️⃣ Amount: ${amount}

Lipa mapema uepuke faini! ⏰

Ahsante,
Haven Team 💚`;

  return await sendWhatsAppMessage(tenant.phone, message);
}

/**
 * Send payment confirmation via WhatsApp
 */
export async function sendPaymentConfirmationWhatsApp(tenant, amount, receiptNumber) {
  const message = `✅ *Malipo Yamekamilika!*

Habari ${tenant.name},

Tumepokea malipo yako:
━━━━━━━━━━━━━━━━━━
💰 Kiasi: *KES ${amount.toLocaleString()}*
📄 Risiti: ${receiptNumber}
📅 Tarehe: ${new Date().toLocaleDateString('en-KE')}

Ahsante sana kwa kulipa kwa wakati! 🙏

Haven Property Management 🏠
_Ikiwa una swali, tuma ujumbe hapa_ ↩️`;

  return await sendWhatsAppMessage(tenant.phone, message);
}

/**
 * Send viewing appointment confirmation
 */
export async function sendViewingConfirmationWhatsApp(contact, property, dateTime) {
  const message = `📅 *Appointment Confirmed*

Habari ${contact.name},

Your property viewing is confirmed:
━━━━━━━━━━━━━━━━━━
🏠 Property: ${property.title}
📍 Location: ${property.address}
📅 Date: ${new Date(dateTime).toLocaleDateString('en-KE')}
⏰ Time: ${new Date(dateTime).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}

*What to bring:*
✓ Valid ID
✓ This confirmation

See you there! 👋
Haven Property Management`;

  return await sendWhatsAppMessage(contact.phone, message);
}

/**
 * Send maintenance update via WhatsApp
 */
export async function sendMaintenanceUpdateWhatsApp(tenant, property, issue, status) {
  const statusEmoji = {
    pending: '⏳',
    in_progress: '🔧',
    completed: '✅',
  };

  const message = `${statusEmoji[status]} *Maintenance Update*

Habari ${tenant.name},

Your maintenance request for ${property.title}:
━━━━━━━━━━━━━━━━━━
📋 Issue: ${issue}
Status: *${status.replace('_', ' ').toUpperCase()}*

${status === 'completed' 
  ? 'Matengenezo yamekamilika! ✅' 
  : 'Tutakujulisha mabadiliko yoyote. 🔔'}

Haven Property Management`;

  return await sendWhatsAppMessage(tenant.phone, message);
}

/**
 * Send lease expiry alert via WhatsApp
 */
export async function sendLeaseExpiryWhatsApp(tenant, property, daysRemaining) {
  const message = `⏰ *Lease Expiry Notice*

Habari ${tenant.name},

Your lease for ${property.title} will expire in *${daysRemaining} days*.

Please contact us to discuss renewal options:
📞 Call: 0700 000 000
💬 Reply to this message

Haven Property Management 🏠`;

  return await sendWhatsAppMessage(tenant.phone, message);
}

/**
 * Generate WhatsApp contact link
 */
export function generateWhatsAppLink(phoneNumber, message = '') {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}${message ? `?text=${encodedMessage}` : ''}`;
}

/**
 * Send WhatsApp template message (for business API)
 */
export async function sendWhatsAppTemplate(to, templateName, parameters) {
  try {
    if (WHATSAPP_CONFIG.provider !== 'meta') {
      throw new Error('Template messages only available with Meta WhatsApp API');
    }

    const formattedPhone = to.startsWith('+') ? to : `+${to}`;

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${WHATSAPP_CONFIG.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: formattedPhone.replace('+', ''),
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: parameters.map(p => ({ type: 'text', text: p })),
            },
          ],
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_CONFIG.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('WhatsApp template sent:', {
      to: formattedPhone,
      template: templateName,
    });

    return { success: true };
  } catch (error) {
    logger.error('WhatsApp template failed:', error.response?.data || error.message);
    throw error;
  }
}
