const jwt = require('jsonwebtoken');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function test() {
  const token = jwt.sign({ id: 1, role: 'patient' }, process.env.JWT_SECRET);
  try {
    const res = await axios.post('http://localhost:3000/api/appointments/book', {
      problem: 'Test AI summary',
      details: 'This acts as the chat log or whatever.',
      patientAge: 30,
      patientSex: 'Male',
      aiSummary: 'This is the actual AI summary that is being sent from frontend!'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Book result:", res.data);
  } catch (err) {
    console.log("Book error:", err.response ? err.response.data : err.message);
  }
}
test();
