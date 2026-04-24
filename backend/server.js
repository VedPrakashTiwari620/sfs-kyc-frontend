const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const salesforceRoutes = require('./routes/salesforce');
const faceMatchRoutes = require('./routes/faceMatch');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/salesforce', salesforceRoutes);
app.use('/face-match', faceMatchRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'SFS Backend is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});