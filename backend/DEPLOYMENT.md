# Deploy to Render

1. Create account on [Render](https://render.com)
2. Connect your GitHub repo
3. Create a new Web Service
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Add environment variables from `.env`
7. Deploy!

# Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create new project: "SFS App"
3. Enable Firestore Database
4. Go to Project Settings > Service Accounts
5. Generate new private key (JSON)
6. Download and place as `backend/firebase-service-account.json`
7. Update `firebase.js` with your project ID

# Salesforce Setup

## 1. Salesforce Org
- Sign up for [Salesforce Developer Edition](https://developer.salesforce.com/signup) (free)
- Or use existing Sandbox

## 2. Connected App
- Login to Salesforce
- Go to Setup > App Manager
- Click "New Connected App"
- Fill details:
  - Connected App Name: SFS KYC App
  - API Name: SFS_KYC_App
  - Contact Email: your-email
- Enable OAuth Settings:
  - Callback URL: `https://your-render-app.onrender.com/auth/salesforce/callback`
  - Selected OAuth Scopes: 
    - Access and manage your data (api)
    - Perform requests on your behalf at any time (refresh_token)
    - Provide access to your data via the Web (web)
- Save
- Note down:
  - Consumer Key
  - Consumer Secret

## 3. Custom Objects (Optional)
Create custom objects in Salesforce for Loans, KYC, etc.

## 4. Update Backend
In `backend/.env`:
```
SF_CLIENT_ID=your-consumer-key
SF_CLIENT_SECRET=your-consumer-secret
SF_BASE_URL=https://your-org.salesforce.com
SF_CALLBACK_URL=https://your-render-app.onrender.com/auth/salesforce/callback
```

## 5. API Permissions
Ensure your Salesforce user has API access and permissions for the objects.