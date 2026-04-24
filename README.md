# KYC Loan Flow App

Expo React Native app scaffolding for a mobile KYC loan workflow.

## Features
- Login with token storage in secure storage
- Loan verification via Salesforce backend
- KYC details entry and validation
- Aadhaar QR scanning using camera
- Selfie capture and face-match flow
- Typed navigation, form validation, and state management

## Setup
1. Copy `.env.example` to `.env`
2. Populate backend endpoints and base URL
3. Run `npm install`
4. Run `npm start`

## Notes
- Salesforce secrets must remain on the backend middleware.
- The app stores only minimal sensitive user tokens in encrypted storage.
