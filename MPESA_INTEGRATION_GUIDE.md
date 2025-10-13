# 💳 M-Pesa Daraja API Integration Guide

## Overview
Complete Safaricom M-Pesa integration for STK Push (Lipa Na M-Pesa Online) payments in Haven Property Management System.

---

## ✅ What's Been Implemented

### **Backend (API)**
✅ M-Pesa service (`api/src/services/mpesa.js`)
  - OAuth authentication
  - STK Push initiation
  - Transaction status queries
  - Callback processing
  - Phone number formatting
  - Password generation
  - Transaction storage

✅ M-Pesa routes (`api/src/routes/mpesa.js`)
  - POST /api/v1/mpesa/stk-push - Initiate payment
  - GET /api/v1/mpesa/status/:id - Check status
  - POST /api/v1/mpesa/callback - Receive callbacks
  - GET /api/v1/mpesa/transactions - List transactions
  - GET /api/v1/mpesa/transactions/:id - Get transaction

✅ Database schema (`MpesaTransaction` model)
  - Stores all M-Pesa transactions
  - Links to leases and agencies
  - Tracks status (PENDING, SUCCESS, FAILED)
  - Stores M-Pesa receipt numbers

✅ Security
  - Helmet middleware added
  - Content Security Policy configured
  - Rate limiting applied
  - Audit logging for all transactions

### **Frontend**
✅ MpesaPayment component
  - 3-step payment flow
  - Phone number input with formatting
  - Payment status polling
  - Success/failure handling
  - Real-time status updates

---

## 🔧 Setup Instructions

### **Step 1: Get M-Pesa Credentials**

1. Go to [Safaricom Developer Portal](https://developer.safaricom.co.ke/)
2. Sign up / Log in
3. Create a new app
4. Select "Lipa Na M-Pesa Online" product
5. Get your credentials:
   - Consumer Key
   - Consumer Secret
   - Passkey
   - Shortcode (Test: 174379)

### **Step 2: Configure Environment Variables**

Add to `api/.env`:

```env
# M-Pesa Configuration
MPESA_ENVIRONMENT=sandbox
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_passkey_here
MPESA_CALLBACK_URL=https://yourdomain.com/api/v1/mpesa/callback
```

**For Testing:**
- Use sandbox credentials
- Shortcode: 174379 (Safaricom test)
- Test phone: 254708374149 or 254712345678

**For Production:**
- Change MPESA_ENVIRONMENT to 'production'
- Use your production shortcode
- Use production credentials
- Update callback URL to production domain

### **Step 3: Update Database**

```bash
cd api
npm run prisma:generate
npm run prisma:push
```

This adds the `MpesaTransaction` model to your database.

### **Step 4: Configure Callback URL**

Your callback URL must be:
- **HTTPS** (M-Pesa requires SSL)
- **Publicly accessible** (not localhost)

**For Development:**
Use a tunneling service:
```bash
# Option 1: ngrok
ngrok http 4000
# Use the https URL: https://abc123.ngrok.io/api/v1/mpesa/callback

# Option 2: localtunnel
npx localtunnel --port 4000
```

Update `MPESA_CALLBACK_URL` in `.env` with your tunnel URL.

---

## 🚀 How to Use

### **Backend API**

#### **Initiate STK Push:**
```javascript
POST /api/v1/mpesa/stk-push
Content-Type: application/json
Authorization: Bearer <your-jwt-token>

{
  "phoneNumber": "0712345678",
  "amount": 1000,
  "accountReference": "Invoice-12345",
  "transactionDesc": "Rent Payment for Apt 204",
  "leaseId": "lease-id-here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "merchantRequestId": "29115-34620561-1",
    "checkoutRequestId": "ws_CO_191220191020363925",
    "responseCode": "0",
    "responseDescription": "Success",
    "customerMessage": "Success. Request accepted for processing"
  }
}
```

#### **Check Transaction Status:**
```javascript
GET /api/v1/mpesa/status/{checkoutRequestId}
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "checkoutRequestId": "ws_CO_191220191020363925",
    "status": "SUCCESS",
    "mpesaReceiptNumber": "NLJ7RT61SV",
    "amount": 1000,
    "phoneNumber": "254712345678",
    "transactionDate": "2024-12-13T10:30:00.000Z"
  }
}
```

#### **Get All Transactions:**
```javascript
GET /api/v1/mpesa/transactions?status=SUCCESS&leaseId=xxx
Authorization: Bearer <your-jwt-token>
```

---

### **Frontend Usage**

```javascript
import MpesaPayment from './components/Payments/MpesaPayment';

<MpesaPayment
  amount={1200}
  leaseId="lease-id-123"
  accountReference="Rent-Dec-2024"
  onSuccess={(transaction) => {
    console.log('Payment successful:', transaction);
    // Redirect or update UI
  }}
  onCancel={() => {
    console.log('Payment cancelled');
  }}
/>
```

**Payment Flow:**
1. User enters phone number
2. Clicks "Pay Now"
3. STK Push sent to phone
4. User enters M-Pesa PIN on phone
5. System polls for status every 3s
6. Shows success/failure after completion

---

## 📱 M-Pesa Payment Flow

```
User → Haven App → Haven API → M-Pesa API → User's Phone
                                    ↓
                              STK Push Prompt
                                    ↓
                            User Enters PIN
                                    ↓
                              Payment Processed
                                    ↓
Haven API ← M-Pesa Callback ← M-Pesa Servers
    ↓
Database Updated
    ↓
Payment Record Created
    ↓
User Notified
```

---

## 🔐 Security Features

✅ **Helmet Middleware**
- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security
- X-DNS-Prefetch-Control

✅ **M-Pesa Security**
- OAuth authentication
- Encrypted password (Base64 of Shortcode+Passkey+Timestamp)
- HTTPS required for callbacks
- Transaction validation
- Audit logging

✅ **API Security**
- JWT authentication required
- Rate limiting applied
- Input validation with Zod
- Agency-scoped transactions

---

## 📊 Database Schema

```prisma
model MpesaTransaction {
  id                   String    @id @default(auto()) @map("_id") @db.ObjectId
  merchantRequestId    String    // M-Pesa merchant request ID
  checkoutRequestId    String    @unique // M-Pesa checkout request ID
  phoneNumber          String    // Customer phone (254XXXXXXXXX)
  amount               Int       // Amount in KES
  accountReference     String    // Invoice/lease reference
  transactionDesc      String?   // Description
  status               String    @default("PENDING") // PENDING, SUCCESS, FAILED
  mpesaReceiptNumber   String?   // M-Pesa receipt (e.g., NLJ7RT61SV)
  transactionDate      DateTime? // When payment completed
  resultCode           String?   // M-Pesa result code
  resultDescription    String?   // M-Pesa result description
  leaseId              String?   @db.ObjectId // Link to lease
  lease                Lease?    @relation(fields: [leaseId], references: [id])
  agencyId             String?   @db.ObjectId // Agency
  agency               Agency?   @relation(fields: [agencyId], references: [id])
  createdAt            DateTime  @default(now())
  completedAt          DateTime?
  updatedAt            DateTime  @updatedAt

  @@index([checkoutRequestId])
  @@index([phoneNumber])
  @@index([status])
  @@index([leaseId])
}
```

---

## 🧪 Testing

### **Test in Sandbox:**

1. Use Safaricom test credentials
2. Test phone numbers: 254708374149, 254712345678
3. Any amount (minimum 1 KES)
4. Test PIN: Safaricom provides in sandbox

**Test STK Push:**
```bash
curl -X POST http://localhost:4000/api/v1/mpesa/stk-push \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "254708374149",
    "amount": 100,
    "accountReference": "TEST123",
    "transactionDesc": "Test Payment"
  }'
```

**Check Status:**
```bash
curl http://localhost:4000/api/v1/mpesa/status/ws_CO_191220191020363925 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📞 M-Pesa API Response Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Insufficient funds |
| 1032 | Request cancelled by user |
| 1037 | Transaction timed out |
| 2001 | Invalid parameters |

**Full list:** [Daraja API Docs](https://developer.safaricom.co.ke/Documentation)

---

## 🔄 Callback Handling

When M-Pesa processes payment, it calls your callback URL:

**Callback Payload:**
```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "29115-34620561-1",
      "CheckoutRequestID": "ws_CO_191220191020363925",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          { "Name": "Amount", "Value": 1000 },
          { "Name": "MpesaReceiptNumber", "Value": "NLJ7RT61SV" },
          { "Name": "TransactionDate", "Value": 20191219102115 },
          { "Name": "PhoneNumber", "Value": 254708374149 }
        ]
      }
    }
  }
}
```

**Our Handler:**
- Updates transaction status in database
- Creates payment record if linked to lease
- Logs the transaction
- Returns success to M-Pesa

---

## 💡 Pro Tips

### **1. Phone Number Formats Accepted:**
- `0712345678` → Converts to `254712345678`
- `254712345678` → Used as-is
- `+254712345678` → Cleaned to `254712345678`
- `0712 345 678` → Cleaned and formatted

### **2. Amount:**
- Must be integer (no decimals)
- Minimum: 1 KES
- Maximum: Check your M-Pesa limits

### **3. Callback URL:**
- Must be HTTPS (SSL required)
- Must be publicly accessible
- Must return 200 status
- Response format matters

### **4. Testing:**
- Use sandbox environment first
- Test with provided test numbers
- Monitor callback logs
- Check transaction status in dashboard

### **5. Production Checklist:**
- [ ] Change MPESA_ENVIRONMENT to 'production'
- [ ] Use production credentials
- [ ] Use production shortcode
- [ ] SSL certificate installed
- [ ] Callback URL publicly accessible
- [ ] Test with real phone numbers
- [ ] Monitor transactions closely

---

## 🎨 Frontend Integration Example

### **In Payment Page:**
```javascript
import { useState } from 'react';
import MpesaPayment from '../components/Payments/MpesaPayment';

const PaymentPage = () => {
  const [showMpesa, setShowMpesa] = useState(false);

  const handlePaymentSuccess = (transaction) => {
    console.log('Payment successful:', transaction);
    showToast.success('Payment received!');
    // Refresh invoice/payment status
    // Navigate to confirmation page
  };

  return (
    <div>
      <button onClick={() => setShowMpesa(true)}>
        Pay with M-Pesa
      </button>

      {showMpesa && (
        <MpesaPayment
          amount={1200}
          leaseId="lease-123"
          accountReference="Rent-Jan-2024"
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowMpesa(false)}
        />
      )}
    </div>
  );
};
```

---

## 📊 Transaction Lifecycle

```
1. INITIATED
   ↓
   User clicks "Pay with M-Pesa"
   ↓
2. STK_PUSH_SENT (status: PENDING)
   ↓
   Customer receives prompt on phone
   ↓
3. USER_ACTION
   ↓
   Customer enters PIN
   ↓
4. CALLBACK_RECEIVED
   ↓
   M-Pesa sends result to callback URL
   ↓
5. COMPLETED (status: SUCCESS or FAILED)
   ↓
   Payment record created (if success)
   ↓
6. USER_NOTIFIED
   ↓
   User sees confirmation
```

---

## 🎯 Features

### **C2B STK Push:**
✅ Send payment prompt to customer phone
✅ Customer completes on phone
✅ Automatic status updates
✅ Receipt generation
✅ SMS confirmation from Safaricom

### **Transaction Management:**
✅ Real-time status tracking
✅ Transaction history
✅ Link payments to leases
✅ Automatic payment record creation
✅ Audit trail

### **User Experience:**
✅ Simple 3-step process
✅ Phone number formatting
✅ Real-time status updates
✅ Success/failure animations
✅ Clear instructions

---

## 🐛 Troubleshooting

### **Issue: "Failed to authenticate with M-Pesa"**
**Solution:** Check consumer key and secret in .env

### **Issue: "Invalid parameters"**
**Solution:** 
- Verify shortcode is correct
- Check passkey matches shortcode
- Ensure phone number format is correct

### **Issue: "Callback not received"**
**Solution:**
- Verify callback URL is HTTPS
- Check callback URL is publicly accessible
- Use ngrok/localtunnel for development
- Check firewall settings

### **Issue: "Transaction timed out"**
**Solution:**
- User may have cancelled
- Check phone number is active M-Pesa number
- Try again with correct number

### **Issue: "Insufficient funds"**
**Solution:** User needs to check M-Pesa balance

---

## 📈 Monitoring

### **Check Transaction Logs:**
```bash
# API logs
tail -f api/logs/combined.log | grep MPESA

# Specific transaction
curl http://localhost:4000/api/v1/mpesa/transactions/TRANSACTION_ID \
  -H "Authorization: Bearer TOKEN"
```

### **Database Queries:**
```javascript
// Get pending transactions
db.mpesaTransactions.find({ status: 'PENDING' })

// Get successful payments today
db.mpesaTransactions.find({
  status: 'SUCCESS',
  completedAt: { $gte: new Date(new Date().setHours(0,0,0,0)) }
})

// Get transactions by phone
db.mpesaTransactions.find({ phoneNumber: '254712345678' })
```

---

## 🔗 Useful Links

- [Daraja API Portal](https://developer.safaricom.co.ke/)
- [API Documentation](https://developer.safaricom.co.ke/Documentation)
- [Test Credentials](https://developer.safaricom.co.ke/test_credentials)
- [API Reference](https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate)
- [Support](https://developer.safaricom.co.ke/support)

---

## 📝 Result Codes Reference

| Code | Description | Action |
|------|-------------|--------|
| 0 | Success | Payment complete |
| 1 | Insufficient funds | Ask user to add funds |
| 17 | Invalid phone number | Verify number |
| 1032 | Cancelled by user | Allow retry |
| 1037 | Timeout | Allow retry |
| 2001 | Invalid parameters | Check request data |

---

## 🎯 Next Steps

### **After Testing:**
1. Switch to production environment
2. Get production credentials
3. Update shortcode and passkey
4. Configure production callback URL
5. Test with small amounts first
6. Monitor transactions closely
7. Set up alerts for failed payments

### **Optional Enhancements:**
- [ ] Add B2C (Business to Customer) for refunds
- [ ] Add C2B registration for direct payments
- [ ] Add transaction reconciliation
- [ ] Add payment analytics dashboard
- [ ] Add automated receipts via email
- [ ] Add SMS notifications for payment confirmation

---

## ✅ Integration Complete!

Your Haven Property Management System now supports M-Pesa payments with:
- ✅ STK Push (Lipa Na M-Pesa Online)
- ✅ Real-time status tracking
- ✅ Automatic payment recording
- ✅ Beautiful UI with animations
- ✅ Complete audit trail
- ✅ Production-ready

**Start accepting M-Pesa payments today!** 💳🇰🇪
