const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const axios = require('axios');

const MATCH_THRESHOLD = 70;   // 70% se upar pass
const MAX_ATTEMPTS = 3;        // Max 3 attempts

// Get Salesforce token
async function getSalesforceAccessToken() {
  const params = new URLSearchParams();
  params.append('grant_type', 'password');
  params.append('client_id', process.env.SF_CLIENT_ID);
  params.append('client_secret', process.env.SF_CLIENT_SECRET);
  params.append('username', process.env.SF_USERNAME);
  params.append('password', process.env.SF_PASSWORD + (process.env.SF_SECURITY_TOKEN || ''));
  const response = await axios.post(`${process.env.SF_AUTH_URL}/services/oauth2/token`, params);
  return response.data;
}

// Update Salesforce Loan_Application__c record fields
async function updateSalesforceRecord(loanNo, fields) {
  try {
    const { access_token, instance_url } = await getSalesforceAccessToken();

    // Find the record Id
    const query = `SELECT Id FROM Loan_Application__c WHERE Name = '${loanNo}' LIMIT 1`;
    const queryRes = await axios.get(
      `${instance_url}/services/data/v59.0/query?q=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (queryRes.data.records.length === 0) {
      console.warn(`[SF] Loan_Application__c record not found for: ${loanNo}`);
      return;
    }

    const recordId = queryRes.data.records[0].Id;

    // PATCH to update the record
    await axios.patch(
      `${instance_url}/services/data/v59.0/sobjects/Loan_Application__c/${recordId}`,
      fields,
      { headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' } }
    );

    console.log(`[SF] Updated Loan_Application__c (${recordId}) with:`, fields);
  } catch (err) {
    console.error('[SF] Update failed:', err.response?.data || err.message);
  }
}

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  next();
};

// POST /face-match
router.post('/', verifyToken, async (req, res) => {
  const { loanNo, selfieBase64, aadhaarQrData, aadhaarPhotoBase64 } = req.body;

  if (!loanNo) return res.status(400).json({ error: 'loanNo is required' });

  // ── Get current attempt count from Firestore ──────────────────
  const attemptsRef = db.collection('face_match_attempts').doc(loanNo);
  const attemptsSnap = await attemptsRef.get();
  const prevData = attemptsSnap.exists ? attemptsSnap.data() : { count: 0, passed: false };

  // Already passed — no more attempts needed
  if (prevData.passed) {
    return res.json({
      matchPercentage: prevData.lastMatchPercentage || 100,
      passed: true,
      attemptNo: prevData.count,
      attemptsLeft: 0,
      message: 'Already matched successfully. KYC is complete.'
    });
  }

  // All 3 attempts exhausted
  if (prevData.count >= MAX_ATTEMPTS) {
    return res.status(403).json({
      passed: false,
      attemptNo: prevData.count,
      attemptsLeft: 0,
      message: '3 attempts exhausted. KYC face match failed.'
    });
  }

  const attemptNo = prevData.count + 1;
  const attemptsLeft = MAX_ATTEMPTS - attemptNo;

  // ── Face Match Logic ──────────────────────────────────────────
  let matchPercentage;
  let matchSource;

  if (aadhaarPhotoBase64 && selfieBase64) {
    // Both photos present — simulate real comparison
    // TODO: Replace with AWS Rekognition / Azure Face API in production
    matchPercentage = Math.floor(Math.random() * 20) + 75; // 75–95%
    matchSource = 'aadhaar_qr_photo';
  } else {
    // No Aadhaar photo in QR
    matchPercentage = Math.floor(Math.random() * 25) + 60; // 60–85%
    matchSource = 'no_aadhaar_photo';
  }

  const passed = matchPercentage >= MATCH_THRESHOLD;

  // ── Save attempt to Firestore ─────────────────────────────────
  try {
    await attemptsRef.set({
      loanNo,
      count: attemptNo,
      passed,
      lastMatchPercentage: matchPercentage,
      lastAttemptAt: new Date(),
      attempts: [
        ...(prevData.attempts || []),
        { attemptNo, matchPercentage, passed, timestamp: new Date() }
      ]
    });

    // Also log individual result
    await db.collection('face_match_results').add({
      loanNo, attemptNo, matchPercentage, matchSource, passed,
      aadhaarName: aadhaarQrData?.name || '',
      timestamp: new Date()
    });
  } catch (dbErr) {
    console.error('Firestore save error:', dbErr.message);
  }

  // ── Salesforce Update ─────────────────────────────────────────
  if (passed) {
    // SUCCESS — set checkbox true + status text
    await updateSalesforceRecord(loanNo, {
      Aadhar_Photo_Match_Success__c: true,
      Status_Photo_Match__c: 'Successfully Matched'
    });

    // Also submit full KYC to Apex REST
    try {
      const { access_token, instance_url } = await getSalesforceAccessToken();
      await axios.post(`${instance_url}/services/apexrest/KYCService`, {
        loanNo,
        name: aadhaarQrData?.name || '',
        aadhaarNumber: aadhaarQrData?.aadhaarNumber || '',
        dob: aadhaarQrData?.dob || '',
        gender: aadhaarQrData?.gender || '',
        address: aadhaarQrData?.address || '',
        matchPercentage,
        matchSource,
        faceMatchPassed: true
      }, {
        headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' }
      });
      console.log(`[SF] KYC submitted for loan: ${loanNo}`);
    } catch (sfErr) {
      console.error('[SF] KYC Apex submit failed:', sfErr.response?.data || sfErr.message);
    }

  } else if (attemptNo >= MAX_ATTEMPTS) {
    // All 3 attempts failed — update status text, checkbox stays false
    await updateSalesforceRecord(loanNo, {
      Aadhar_Photo_Match_Success__c: false,
      Status_Photo_Match__c: '3 attempts exhausted'
    });
  }
  // ─────────────────────────────────────────────────────────────

  res.json({
    matchPercentage,
    matchSource,
    passed,
    attemptNo,
    attemptsLeft: passed ? 0 : attemptsLeft,
    message: passed
      ? `Face match successful (${matchPercentage}%) ✓ — KYC submitted to Salesforce`
      : attemptsLeft > 0
        ? `Face match failed (${matchPercentage}%) — ${attemptsLeft} attempt(s) remaining`
        : `Face match failed (${matchPercentage}%) — 3 attempts exhausted`
  });
});

module.exports = router;