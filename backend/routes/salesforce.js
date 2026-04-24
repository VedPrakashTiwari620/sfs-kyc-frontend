const express = require('express');
const axios = require('axios');
const router = express.Router();
const { db } = require('../firebase');

// Helper to get Salesforce Access Token (Username-Password Flow)
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

// POST /loan/verify — Frontend calls this
router.post('/loan/verify', async (req, res) => {
  const { loanNo } = req.body;

  if (!loanNo) {
    return res.status(400).json({ exists: false, message: 'Loan number is required' });
  }

  try {
    const { access_token, instance_url } = await getSalesforceAccessToken();

    // Step 1: Check if loan exists (only Name field - always exists)
    const checkQuery = `SELECT Id, Name FROM Loan_Application__c WHERE Name = '${loanNo}' LIMIT 1`;
    const checkRes = await axios.get(
      `${instance_url}/services/data/v59.0/query?q=${encodeURIComponent(checkQuery)}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (checkRes.data.records.length === 0) {
      return res.json({ exists: false, message: `Loan "${loanNo}" not found in Salesforce` });
    }

    const loan = checkRes.data.records[0];

    // Step 2: Try to get extra fields (may or may not exist in org)
    let loanAmount = null;
    let loanStatus = 'N/A';
    try {
      const detailQuery = `SELECT Id, Name, Loan_Amount__c, Status__c FROM Loan_Application__c WHERE Id = '${loan.Id}' LIMIT 1`;
      const detailRes = await axios.get(
        `${instance_url}/services/data/v59.0/query?q=${encodeURIComponent(detailQuery)}`,
        { headers: { Authorization: `Bearer ${access_token}` } }
      );
      const detail = detailRes.data.records[0];
      loanAmount = detail?.Loan_Amount__c ?? null;
      loanStatus = detail?.Status__c ?? 'N/A';
    } catch (_) {
      // Extra fields not available - that's ok
    }

    // Save to Firestore
    await db.collection('loans').doc(loanNo).set({
      salesforceId: loan.Id,
      loanNo,
      loanAmount,
      status: loanStatus,
      verifiedAt: new Date()
    });

    res.json({
      exists: true,
      loanId: loan.Id,
      loanData: {
        Name: loan.Name,
        Loan_Amount__c: loanAmount,
        Status__c: loanStatus
      }
    });

  } catch (error) {
    const sfError = error.response?.data;
    console.error('SF Loan Verify Error:', sfError || error.message);
    res.status(500).json({ exists: false, message: 'Salesforce connection failed. Please try again.' });
  }
});


// GET /loan/:loanNo — Alternative REST style
router.get('/loan/:loanNo', async (req, res) => {
  const { loanNo } = req.params;
  try {
    const { access_token, instance_url } = await getSalesforceAccessToken();
    const query = `SELECT Id, Name, Loan_Amount__c, Status__c FROM Loan_Application__c WHERE Name = '${loanNo}' LIMIT 1`;
    const response = await axios.get(`${instance_url}/services/data/v59.0/query?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    if (response.data.records.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loanData = response.data.records[0];
    await db.collection('loans').doc(loanNo).set(loanData);
    res.json(loanData);
  } catch (error) {
    console.error('SF Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Salesforce connection failed' });
  }
});


// Submit KYC to Salesforce (final - after face match)
router.post('/submit-kyc', async (req, res) => {
  const kycData = req.body; 

  try {
    const { access_token, instance_url } = await getSalesforceAccessToken();
    
    // Hit the custom Apex REST endpoint we created (KYCService)
    const response = await axios.post(`${instance_url}/services/apexrest/KYCService`, kycData, {
      headers: { 
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      }
    });

    // Also save to Firebase for tracking
    await db.collection('kyc_submissions').add({
      ...kycData,
      submittedAt: new Date(),
      sfResponse: response.data
    });

    res.json(response.data);
  } catch (error) {
    console.error('SF Submission Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to submit KYC to Salesforce' });
  }
});

// POST /kyc/update — Save KYC details (address + aadhaar) to Firestore
// Called from KYCDetailsScreen before QR scan
router.post('/kyc/update', async (req, res) => {
  const { loanNo, address, aadhaarNumber } = req.body;

  if (!loanNo) {
    return res.status(400).json({ error: 'loanNo is required' });
  }

  try {
    const kycRef = await db.collection('kyc_records').add({
      loanNo,
      address,
      aadhaarNumber,
      status: 'draft',
      createdAt: new Date()
    });

    res.json({ kycId: kycRef.id, status: 'draft' });
  } catch (error) {
    console.error('KYC Update Error:', error.message);
    res.status(500).json({ error: 'Failed to save KYC details' });
  }
});

// POST /kyc/qr — Save Aadhaar QR scan data to Firestore
// Called after user scans Aadhaar QR code
router.post('/kyc/qr', async (req, res) => {
  const { loanNo, kycId, aadhaarData, aadhaarPhotoBase64 } = req.body;

  try {
    const updateData = {
      aadhaarData,
      aadhaarPhotoBase64: aadhaarPhotoBase64 ? 'present' : 'missing', // don't store huge base64 in Firestore
      qrScannedAt: new Date(),
      status: 'qr_scanned'
    };

    if (kycId) {
      await db.collection('kyc_records').doc(kycId).update(updateData);
    } else {
      await db.collection('kyc_records').add({ loanNo, ...updateData });
    }

    res.json({ success: true, message: 'Aadhaar QR data saved' });
  } catch (error) {
    console.error('KYC QR Error:', error.message);
    res.status(500).json({ error: 'Failed to save QR data' });
  }
});

module.exports = router;

