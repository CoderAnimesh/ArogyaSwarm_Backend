const axios = require('axios');

async function test() {
  // Try to login to get token
  let token;
  try {
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'a@a.com',
      password: 'password123'
    });
    token = loginRes.data.token;
  } catch (err) {
    if(err.response.status === 401) {
       console.log("Login failed");
       return;
    }
  }

  try {
    const res = await axios.post('http://localhost:3000/api/appointments/book', {
      problem: 'Test Problem',
      details: 'This is a long test detail string that should meet the > 30 condition for ai_summary replacement check',
      patientAge: 30,
      patientSex: 'Male',
      aiSummary: 'This is the AI Summary passed explicitly in the payload.'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Book result:", res.data);
  } catch (err) {
    console.log("Book error:", err.response ? err.response.data : err.message);
  }
}
test();
