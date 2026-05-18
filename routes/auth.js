const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { eq } = require('drizzle-orm');
const { db } = require('../db');
const { users } = require('../db/schema');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key';

// Register Patient ONLY
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.email, email));
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user strictly as patient
    const newUser = await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
      role: 'patient',
    }).returning({ id: users.id, name: users.name, email: users.email, role: users.role });

    res.status(201).json({ message: 'Patient registered successfully', user: newUser[0] });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generic Login for All Roles
router.post('/login', async (req, res) => {
  try {
    const { email, password, expectedRole } = req.body; // expectedRole can be used on frontend optionally

    const userRecord = await db.select().from(users).where(eq(users.email, email));
    
    if (userRecord.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userRecord[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Optionally check if expectedRole matches actual role
    if (expectedRole && expectedRole !== user.role) {
      return res.status(403).json({ error: `Not authorized as ${expectedRole}` });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ message: 'Logged in successfully', token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
