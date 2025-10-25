# Twilio SMS Consent & Opt-In Design

**Date:** 2025-10-24
**Status:** Approved
**Author:** Claude Code (with user validation)

## Overview

Design for implementing Twilio toll-free messaging compliance requirements for a personal assistant service using SMS messaging.

## Context

### Service Description
- Personal assistant with two-way SMS messaging (send/receive)
- Small private group: user + a few known contacts
- Already deployed on Railway with public URL
- Used for task management, reminders, conversational assistance

### Compliance Requirement
Twilio requires proof of consent for toll-free messaging before approving the number for SMS use.

## Design Decisions

### Approach Selected
**Basic Static Terms Document**

Rationale:
- Appropriate for small private group
- No database tracking needed
- Simple to implement and maintain
- Meets Twilio's minimum requirements
- Can be upgraded later if service goes public

### Rejected Alternatives
1. **Tracked opt-in with database:** Overkill for private use, adds complexity
2. **Full opt-in flow with signup:** Not needed for known users

## Implementation Design

### Section 1: Terms Page Content

**Route:** `/terms` or `/sms-consent`
**URL:** `https://[railway-app].railway.app/terms`

**Page Structure:**

```
Header: "Personal Assistant Service - Terms of Use & SMS Consent"

1. Service Description
   - Brief explanation of the personal assistant service
   - What features it provides (tasks, reminders, conversations)
   - That it uses SMS for communication

2. SMS Consent Section (Critical for Twilio)
   - Clear consent statement: "By using this service, you consent to receive SMS messages"
   - Message frequency: "Messages sent as needed based on your requests"
   - Standard rates disclaimer: "Message and data rates may apply"
   - Opt-out method: "Reply STOP to unsubscribe at any time"
   - Support contact information

3. Privacy & Contact
   - Basic privacy statement (messages not shared)
   - Contact info for questions
```

**Design Principles:**
- Plain language, not legal jargon
- Mobile-responsive
- Clear and scannable
- Meets Twilio's specific requirements

### Section 2: Technical Implementation

**File Location:** Add to existing Express server (`server.js` or `server/index.js`)

**Implementation Options:**

**Option A: Inline HTML in Route Handler** (Recommended for simplicity)
```javascript
app.get('/terms', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>SMS Terms & Consent</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          /* Basic responsive styling */
        </style>
      </head>
      <body>
        <!-- Content here -->
      </body>
    </html>
  `;
  res.send(html);
});
```

**Option B: Separate HTML File**
- Create `public/terms.html`
- Serve via Express static middleware
- Cleaner separation but extra file

**Recommendation:** Option A for this use case - keeps everything together, easy to find and update.

### Section 3: Opt-Out Handling

**STOP Keyword Implementation:**

Add to existing Twilio message webhook handler:

```javascript
// In existing Twilio message handler
if (incomingMessage.toLowerCase().trim() === 'stop') {
  // Log opt-out
  console.log(`User opted out: ${fromNumber}`);

  // Send confirmation
  await twilioClient.messages.create({
    body: 'You have been unsubscribed. Reply START to opt back in.',
    to: fromNumber,
    from: twilioNumber
  });

  // Optional: Store opt-out status in database
  // For small private group, manual tracking is acceptable

  return; // Don't process further
}

// Handle START re-subscription
if (incomingMessage.toLowerCase().trim() === 'start') {
  await twilioClient.messages.create({
    body: 'You have been re-subscribed to the assistant service.',
    to: fromNumber,
    from: twilioNumber
  });
  return;
}
```

**Opt-Out Storage (Optional):**
- For small private group: Manual tracking acceptable
- Could add simple array/set in memory: `const optedOutNumbers = new Set()`
- Future enhancement: Database table if needed

### Section 4: Twilio Submission Process

**What to Submit to Twilio:**

1. **Opt-in consent URL:**
   - `https://[your-railway-app].railway.app/terms`
   - This page must be publicly accessible
   - Twilio will review the content

2. **Sample Message:**
   - Example: "Reminder: Your task 'Pick up groceries' is due in 1 hour"
   - Should reflect actual message content users receive

3. **Opt-out method:**
   - "Users can reply STOP to unsubscribe at any time"

4. **Use case description:**
   - "Personal assistant service for task management and reminders"

**Expected Timeline:**
- Implementation: 5-10 minutes
- Deploy to Railway: Automatic on git push
- Submit to Twilio: Via their web form
- Twilio review: 1-3 business days for toll-free verification

## Success Criteria

- [ ] `/terms` route publicly accessible
- [ ] Page contains all required consent elements
- [ ] STOP keyword handled in message webhook
- [ ] START keyword handled for re-subscription
- [ ] URL submitted to Twilio
- [ ] Twilio approval received

## Testing Plan

1. **Local testing:**
   - Verify route loads
   - Check mobile responsiveness
   - Verify all consent language present

2. **Production testing:**
   - Confirm publicly accessible URL
   - Test STOP/START keywords via SMS

3. **Twilio verification:**
   - Submit URL
   - Wait for approval
   - Test SMS after approval

## Future Enhancements

If service expands beyond private group:

1. Add database tracking for opt-ins/opt-outs
2. Create formal signup flow
3. Add privacy policy page
4. Implement audit logging
5. Add admin dashboard for opt-out management

## Notes

- Keep implementation simple - this is for regulatory compliance, not a core feature
- Terms page doesn't need authentication - it's public information
- STOP handling is required by law (TCPA compliance)
- Can manually manage opt-outs for small group initially
