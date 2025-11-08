/**
 * SMS Templates for Haven Property Management
 * Keep messages under 160 characters for single SMS
 */

export const smsTemplates = {
  // Welcome & Onboarding
  welcome: (data) => 
    `Welcome to Haven! Your lease at ${data.propertyName} Unit ${data.unitNumber} starts ${data.startDate}. First payment due ${data.dueDate}. Portal: ${data.portalUrl}`,

  // Payment Reminders
  rentReminder: (data) =>
    `Rent Reminder: KES ${data.amount} due on ${data.dueDate} for ${data.propertyName} Unit ${data.unitNumber}. Pay via M-Pesa ${data.mpesaNumber}. Ref: ${data.reference}`,

  rentDueToday: (data) =>
    `URGENT: Rent payment of KES ${data.amount} is due TODAY for Unit ${data.unitNumber}. Pay now to avoid late fees. M-Pesa: ${data.mpesaNumber}`,

  rentDueTomorrow: (data) =>
    `Reminder: Your rent of KES ${data.amount} is due tomorrow (${data.dueDate}). Please pay via M-Pesa ${data.mpesaNumber} or online portal.`,

  // Payment Confirmations
  paymentReceived: (data) =>
    `Payment Confirmed! KES ${data.amount} received for ${data.propertyName} Unit ${data.unitNumber}. Receipt: ${data.receiptNumber}. Thank you!`,

  paymentPending: (data) =>
    `Payment Processing: Your M-Pesa payment of KES ${data.amount} is being processed. You'll receive confirmation shortly. Ref: ${data.reference}`,

  // Late Payments
  latePaymentWarning: (data) =>
    `OVERDUE: Rent payment of KES ${data.amount} is ${data.daysLate} days late. Late fee: KES ${data.lateFee}. Total due: KES ${data.totalDue}. Pay now: ${data.paymentUrl}`,

  finalNotice: (data) =>
    `FINAL NOTICE: Payment of KES ${data.totalDue} overdue by ${data.daysLate} days. Contact us immediately at ${data.phone} to avoid lease termination.`,

  // Lease Management
  leaseExpiring30Days: (data) =>
    `Your lease at ${data.propertyName} expires in 30 days (${data.expiryDate}). Contact us to renew or discuss options. Call: ${data.phone}`,

  leaseExpiring7Days: (data) =>
    `URGENT: Your lease expires in 7 days (${data.expiryDate}). Please contact us immediately to renew or arrange move-out. ${data.phone}`,

  leaseRenewed: (data) =>
    `Lease Renewed! Your new lease for ${data.propertyName} Unit ${data.unitNumber} is active until ${data.newEndDate}. Welcome back!`,

  // Maintenance
  maintenanceReceived: (data) =>
    `Maintenance request #${data.requestId} received. We'll contact you within ${data.responseTime} to schedule. Track: ${data.trackingUrl}`,

  maintenanceScheduled: (data) =>
    `Maintenance scheduled for ${data.date} at ${data.time}. Technician: ${data.technicianName}. Issue: ${data.issue}. Call ${data.phone} to reschedule.`,

  maintenanceCompleted: (data) =>
    `Maintenance completed for request #${data.requestId}. Please confirm satisfaction via portal or reply YES. Issues? Call ${data.phone}`,

  maintenanceEmergency: (data) =>
    `EMERGENCY maintenance request received. Our team will arrive within ${data.eta}. Stay safe. Emergency line: ${data.emergencyPhone}`,

  // Inspections
  inspectionScheduled: (data) =>
    `Property inspection scheduled for ${data.date} at ${data.time} at ${data.propertyName} Unit ${data.unitNumber}. Please ensure access.`,

  inspectionReminder: (data) =>
    `Reminder: Property inspection tomorrow at ${data.time}. Please be available or arrange access. Contact: ${data.phone}`,

  // Utilities
  utilityBillReady: (data) =>
    `Your ${data.utilityType} bill for ${data.period} is ready. Amount: KES ${data.amount}. View in portal: ${data.portalUrl}`,

  waterShutdown: (data) =>
    `NOTICE: Water shutdown on ${data.date} from ${data.startTime} to ${data.endTime} for maintenance. Plan accordingly.`,

  powerOutage: (data) =>
    `ALERT: Scheduled power outage on ${data.date} from ${data.startTime} to ${data.endTime}. Maintenance work in progress.`,

  // Security & Notices
  securityAlert: (data) =>
    `SECURITY ALERT: ${data.message} at ${data.propertyName}. Stay vigilant. Report suspicious activity to ${data.securityPhone}`,

  guestRegistration: (data) =>
    `Guest ${data.guestName} registered for Unit ${data.unitNumber} on ${data.date}. Valid until ${data.validUntil}. Security: ${data.securityPhone}`,

  packageDelivery: (data) =>
    `Package delivered for Unit ${data.unitNumber}. Collect from ${data.location}. ID required. Office hours: ${data.officeHours}`,

  // Account & Portal
  passwordReset: (data) =>
    `Haven Portal: Your password reset code is ${data.code}. Valid for ${data.validMinutes} minutes. Don't share this code.`,

  loginAlert: (data) =>
    `New login to your Haven account from ${data.device} at ${data.time}. Not you? Change password immediately: ${data.securityUrl}`,

  accountSuspended: (data) =>
    `Your account has been suspended due to ${data.reason}. Contact ${data.phone} immediately to resolve.`,

  // Move In/Out
  moveInConfirmed: (data) =>
    `Move-in confirmed for ${data.date} at ${data.propertyName} Unit ${data.unitNumber}. Keys ready at office. Bring ID. Office: ${data.officeHours}`,

  moveOutScheduled: (data) =>
    `Move-out inspection scheduled for ${data.date} at ${data.time}. Ensure unit is clean. Security deposit refund in ${data.refundDays} days.`,

  securityDepositRefund: (data) =>
    `Security deposit of KES ${data.amount} processed. Deductions: KES ${data.deductions}. Net refund: KES ${data.netAmount}. Expect in ${data.days} days.`,

  // Caretaker & Staff
  caretakerAssigned: (data) =>
    `Your new caretaker is ${data.name}. Phone: ${data.phone}. Available ${data.availability}. For emergencies, call ${data.emergencyPhone}`,

  // Promotions & Updates
  rentIncrease: (data) =>
    `NOTICE: Rent for Unit ${data.unitNumber} will increase to KES ${data.newAmount} effective ${data.effectiveDate}. Details sent via email.`,

  specialOffer: (data) =>
    `Special Offer! ${data.offerDetails}. Valid until ${data.expiryDate}. Terms apply. More info: ${data.url}`,

  systemMaintenance: (data) =>
    `Haven Portal maintenance on ${data.date} from ${data.startTime} to ${data.endTime}. Services temporarily unavailable.`,

  // Feedback & Surveys
  feedbackRequest: (data) =>
    `How's your experience at ${data.propertyName}? Share feedback: ${data.surveyUrl}. Takes 2 mins. Your input helps us improve!`,

  // Emergency
  evacuationAlert: (data) =>
    `EVACUATION ALERT: ${data.reason} at ${data.propertyName}. Evacuate immediately via ${data.exitRoute}. Assembly point: ${data.assemblyPoint}`,

  allClear: (data) =>
    `ALL CLEAR: Emergency situation resolved at ${data.propertyName}. Safe to return. Thank you for your cooperation.`,
};

/**
 * Helper function to format SMS with character count
 */
export function formatSMS(template, data) {
  const message = template(data);
  const length = message.length;
  const smsCount = Math.ceil(length / 160);
  
  return {
    message,
    length,
    smsCount,
    warning: length > 160 ? `Message will be sent as ${smsCount} SMS` : null
  };
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone) {
  // Kenyan phone number format: 254XXXXXXXXX or 07XXXXXXXX or +254XXXXXXXXX
  const patterns = [
    /^254\d{9}$/,           // 254712345678
    /^0\d{9}$/,             // 0712345678
    /^\+254\d{9}$/          // +254712345678
  ];
  
  return patterns.some(pattern => pattern.test(phone));
}

/**
 * Format phone number to standard format (254XXXXXXXXX)
 */
export function formatPhoneNumber(phone) {
  // Remove spaces, dashes, and plus signs
  phone = phone.replace(/[\s\-\+]/g, '');
  
  // Convert 07XX to 2547XX
  if (phone.startsWith('0')) {
    phone = '254' + phone.substring(1);
  }
  
  // Remove leading + if present
  if (phone.startsWith('+')) {
    phone = phone.substring(1);
  }
  
  return phone;
}

export default smsTemplates;
