# Stripe Connect - Backend API Reference

## API Endpoints

### 1. POST /users/stripe/connect

Creates a Stripe Express Connect account for the authenticated user and returns an onboarding URL.

**Authentication:** JWT Bearer token (required)

**Request:**
```http
POST /users/stripe/connect
Authorization: Bearer {token}
```

**Response:** `StripeConnectResponse`
```json
{
  "onboarding_url": "https://connect.stripe.com/setup/s/acct_xxx/yyy",
  "account_id": "acct_1SYAAt2S7ef5cUqk"
}
```

**Fields:**
- `onboarding_url` - Stripe-hosted URL where user completes KYC and bank details
- `account_id` - Stripe Express account ID (starts with `acct_`)

**What happens internally:**
1. Creates Stripe Express account via `stripe.Account.create(type="express")`
2. Requests `card_payments` and `transfers` capabilities
3. Generates AccountLink with `collection_options.fields = "eventually_due"` (collects all required info upfront)
4. Stores `account_id` in user record
5. Returns onboarding URL (expires in ~25 minutes)

**Stripe Account Type:** Express
- Simplified onboarding (Stripe-hosted)
- Platform controls branding
- Automatic payout schedule
- Stripe handles compliance

**Error Codes:**
- `401` - Invalid/missing JWT token
- `404` - User not found in database
- `400` - Stripe API error (invalid email, account already exists, etc.)

---

### 2. GET /users/stripe/status

Retrieves the current Stripe Connect account status for the authenticated user.

**Authentication:** JWT Bearer token (required)

**Request:**
```http
GET /users/stripe/status
Authorization: Bearer {token}
```

**Response:** `StripeStatusResponse`

**Not connected:**
```json
{
  "connected": false,
  "charges_enabled": false,
  "onboarding_complete": false,
  "account_id": null
}
```

**Connected but pending:**
```json
{
  "connected": true,
  "charges_enabled": false,
  "onboarding_complete": false,
  "account_id": "acct_1SYAAt2S7ef5cUqk"
}
```

**Fully active:**
```json
{
  "connected": true,
  "charges_enabled": true,
  "onboarding_complete": true,
  "account_id": "acct_1SYAAt2S7ef5cUqk"
}
```

**Fields explained:**

- **`connected`** - Boolean indicating if user has a Stripe account ID in database
  - `false` - No Stripe account created yet
  - `true` - Account created (may not be active)

- **`charges_enabled`** - Stripe Account field: `account.charges_enabled`
  - `false` - Cannot accept payments yet (pending verification)
  - `true` - Can create charges and accept payments
  - Controlled by Stripe after verifying identity/business info

- **`onboarding_complete`** - Stripe Account field: `account.details_submitted`
  - `false` - User hasn't submitted all required information
  - `true` - All required information submitted to Stripe
  - Note: May be true but charges_enabled still false if under review

- **`account_id`** - Stripe Express account identifier
  - Format: `acct_{random}`
  - Used for creating charges, transfers, retrieving account details

**What happens internally:**
1. Checks if user has `stripe_account_id` in database
2. If yes, calls `stripe.Account.retrieve(account_id)`
3. Extracts `charges_enabled` and `details_submitted` from Stripe Account object
4. Updates local database with latest status
5. Returns aggregated status

**Stripe Account Object fields used:**
```python
account = stripe.Account.retrieve(account_id)

# Fields we use:
account.charges_enabled      # Can accept payments
account.details_submitted    # Onboarding form submitted
account.payouts_enabled      # Can receive payouts (not exposed to frontend)
```

---
### Account Onboarding States

1. **Account created, no details submitted**
   - `details_submitted = False`
   - `charges_enabled = False`
   - User hasn't completed onboarding form

2. **Details submitted, under review**
   - `details_submitted = True`
   - `charges_enabled = False`
   - Stripe reviewing documents/information

3. **Fully activated**
   - `details_submitted = True`
   - `charges_enabled = True`
   - Can accept payments

4. **Restricted**
   - `details_submitted = True`
   - `charges_enabled = False` or limited
   - Additional verification needed

### AccountLink
Temporary URL for onboarding:
- **Expiration:** ~25 minutes
- **Type:** `account_onboarding`
- **Return URL:** Where user goes after completing/exiting onboarding
- **Refresh URL:** Where user goes if link expires
- **Collection options:**
  - `fields: "eventually_due"` - Collect all requirements upfront
  - `future_requirements: "include"` - Include anticipated future requirements

### Metadata
Custom data stored on Stripe account:

```python
metadata = {
    "dorm_made_user_id": "user-uuid-here"
}
```

Used in webhooks to map Stripe accounts back to internal users.

---

## Database Schema

### User Model Fields (added)

```python
class UserModel:
    stripe_account_id: str | None              # Stripe account ID (acct_xxx)
    stripe_onboarding_complete: bool | None    # Details submitted to Stripe
```

## Integration Flow

### Happy Path

1. **User clicks "Connect Stripe"**
   - Frontend: `POST /users/stripe/connect` with JWT
   - Backend: Creates Stripe account, returns onboarding URL
   - Database: Stores `stripe_account_id`

2. **User redirected to Stripe onboarding**
   - Hosted at `connect.stripe.com`
   - User fills KYC, bank details, tax info
   - Collection mode: `eventually_due` (all info at once)

3. **User completes onboarding**
   - Stripe redirects to: `{FRONTEND_URL}/profile/{user_id}?stripe=complete`
   - Stripe sends webhook: `account.updated`

4. **Webhook received**
   - Backend: Validates signature
   - Backend: Updates `stripe_onboarding_complete = True`
   - Database: User record updated

5. **Status check**
   - Frontend: `GET /users/stripe/status`
   - Backend: Fetches live status from Stripe
   - Response: `connected=true, charges_enabled=true, onboarding_complete=true`

### Unhappy Paths

**User exits onboarding early:**
- Stripe redirects to refresh_url
- `stripe_account_id` stored but `onboarding_complete = False`
- Can retry by calling `POST /users/stripe/connect` again (generates new link)

**Stripe requires additional verification:**
- Webhook sets `onboarding_complete = True`
- But `charges_enabled = False`
- Account in "restricted" state
- User sees "Under Review" in Stripe dashboard

**Webhook not received:**
- Status endpoint always fetches live data from Stripe
- Missing webhook doesn't break functionality
- Next status check will sync database

---

## Security

### Authentication
- All user endpoints require valid JWT token
- Token contains user_id
- Users can only connect their own accounts

### Webhook Security
- No JWT required (Stripe doesn't have user tokens)
- Signature validation prevents spoofing
- Secret key shared between Stripe and backend only

### Stripe API Key
- Server-side only
- Never exposed to frontend
- Test vs Live modes use different keys