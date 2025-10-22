import AfricasTalking from 'africastalking';
import logger from '../utils/logger.js';
import { smsCircuitBreaker } from './circuitBreaker.js';

/**
 * Africa's Talking SMS Service
 * For rent reminders, payment confirmations, and notifications
 */

const credentials = {
  apiKey: process.env.AFRICASTALKING_API_KEY,
  username: process.env.AFRICASTALKING_USERNAME,
};

const africastalking = AfricasTalking(credentials);
const sms = africastalking.SMS;

/**
 * Send SMS via Africa's Talking
 */
export async function sendSMS(to, message) {
  return await smsCircuitBreaker.execute(async () => {
    // Format phone number (must be +254...)
    const formattedPhone = to.startsWith('+') ? to : `+${to}`;

    const options = {
      to: [formattedPhone],
      message: message,
      from: process.env.AFRICASTALKING_SENDER_ID || 'Haven', // Your approved sender ID
    };

    const result = await sms.send(options);
    
    logger.info('SMS sent successfully:', {
      to: formattedPhone,
      status: result.SMSMessageData.Recipients[0].status,
    });

    return {
      success: true,
      messageId: result.SMSMessageData.Recipients[0].messageId,
      status: result.SMSMessageData.Recipients[0].status,
    };
  });
}

/**
 * Send rent reminder SMS
 */
export async function sendRentReminderSMS(tenant, amount, dueDate, paybill) {
  const message = `Habari ${tenant.name},
Kumbusho: Kodi yako ya KES ${amount.toLocaleString()} inastahili tarehe ${new Date(dueDate).toLocaleDateString('en-KE')}.

Lipa kupitia M-Pesa:
Paybill: ${paybill}
Account: ${tenant.id}

Asante,
Haven Property Management`;

  return await sendSMS(tenant.phone, message);
}

/**
 * Send payment confirmation SMS
 */
export async function sendPaymentConfirmationSMS(tenant, amount, receiptNumber) {
  const message = `Habari ${tenant.name},
Malipo yamekamilika!

Kiasi: KES ${amount.toLocaleString()}
Risiti: ${receiptNumber}
Tarehe: ${new Date().toLocaleDateString('en-KE')}

Ahsante kwa kulipa kwa wakati.
- Haven Property Management`;

  return await sendSMS(tenant.phone, message);
}

/**
 * Send lease expiry reminder SMS
 */
export async function sendLeaseExpirySMS(tenant, property, daysRemaining) {
  const message = `Habari ${tenant.name},
Lease yako ya ${property.title} itaisha baada ya siku ${daysRemaining}.

Tafadhali wasiliana nasi kujadili kuendelea.

Ahsante,
Haven Property Management
Tel: 0700 000 000`;

  return await sendSMS(tenant.phone, message);
}

/**
 * Send maintenance update SMS
 */
export async function sendMaintenanceUpdateSMS(tenant, property, status) {
  const statusSwahili = {
    pending: 'inasubiri',
    in_progress: 'inafanywa',
    completed: 'imekamilika',
  };

  const message = `Habari ${tenant.name},
Ombi lako la matengenezo kwa ${property.title} ${statusSwahili[status]}.

Tutakujulisha mabadiliko yoyote.

Ahsante,
Haven Property Management`;

  return await sendSMS(tenant.phone, message);
}

/**
 * Send bulk SMS to multiple recipients
 */
export async function sendBulkSMS(recipients, message) {
  try {
    const formattedPhones = recipients.map(phone => 
      phone.startsWith('+') ? phone : `+${phone}`
    );

    const options = {
      to: formattedPhones,
      message: message,
      from: process.env.AFRICASTALKING_SENDER_ID || 'Haven',
    };

    const result = await sms.send(options);
    
    logger.info('Bulk SMS sent:', {
      count: recipients.length,
      recipients: result.SMSMessageData.Recipients.map(r => ({
        phone: r.number,
        status: r.status,
      })),
    });

    return {
      success: true,
      recipients: result.SMSMessageData.Recipients,
    };
  } catch (error) {
    logger.error('Bulk SMS failed:', error.message);
    throw new Error('Failed to send bulk SMS');
  }
}

/**
 * Get SMS delivery status
 */
export async function getSMSDeliveryStatus(messageId) {
  try {
    // Fetch delivery reports
    const result = await sms.fetchMessages({ lastReceivedId: messageId });
    return result;
  } catch (error) {
    logger.error('Failed to fetch SMS status:', error.message);
    throw error;
  }
}

/**
 * Send viewing appointment confirmation SMS
 */
export async function sendViewingConfirmationSMS(contact, property, dateTime) {
  const message = `Habari,
Appointment yako ya kuangalia ${property.title} imethib iti shwa.

Tarehe: ${new Date(dateTime).toLocaleDateString('en-KE')}
Saa: ${new Date(dateTime).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
Mahali: ${property.address}

Tutakunja na picha ya kitambulisho.

Haven Property Management
Tel: 0700 000 000`;

  return await sendSMS(contact.phone, message);
}
