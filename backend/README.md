# SFS Backend Middleware

Node.js/Express backend for SFS KYC Loan Flow App.

## Setup

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Configure environment:
   - Copy `.env` and update values
   - For Salesforce integration, set SF_BASE_URL and SF_TOKEN

3. Run the server:
   ```bash
   npm start
   # or for development
   npm run dev
   ```

## API Endpoints

- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh token
- `POST /salesforce/loan/verify` - Verify loan
- `POST /salesforce/kyc/update` - Update KYC
- `POST /salesforce/kyc/qr` - Save Aadhaar QR
- `POST /face-match` - Face match verification

## Salesforce Integration

Currently uses mock responses. To integrate with real Salesforce:

1. Set up Connected App in Salesforce
2. Use OAuth 2.0 for authentication
3. Replace mock calls with actual Salesforce REST API calls

## Deployment

Deploy to Heroku, Vercel, or any Node.js hosting platform.