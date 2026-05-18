const express = require('express');
const { eq, and } = require('drizzle-orm');
const { db } = require('../db');
const { appointments, medicines, prescriptions, users } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

// Get patient's appointments (enriched with doctor name)
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ error: 'Only patients can view their appointments here' });
    }
    const myAppointments = await db.select().from(appointments).where(eq(appointments.patientId, req.user.id));
    
    // Enrich with doctor details
    const enriched = [];
    for (const apt of myAppointments) {
      let doctorName = null, doctorSpeciality = null;
      if (apt.doctorId) {
        const doc = await db.select({ name: users.name, speciality: users.speciality }).from(users).where(eq(users.id, apt.doctorId));
        if (doc.length > 0) {
          doctorName = doc[0].name;
          doctorSpeciality = doc[0].speciality;
        }
      }
      enriched.push({ ...apt, doctorName, doctorSpeciality });
    }
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Book an appointment (Patient)
router.post('/book', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'patient') return res.status(403).json({ error: 'Only patients can book' });
    
    const { problem, details, patientAge, patientSex, aiSummary } = req.body;
    
    // Fallback: If AI summary wasn't explicitly provided, use details if it's substantial
    const finalAiSummary = aiSummary || (details && details.length > 20 ? details : null);

    const newApt = await db.insert(appointments).values({
      patientId: req.user.id,
      patientAge: patientAge ? parseInt(patientAge) : null,
      patientSex: patientSex || null,
      problem,
      details,
      aiSummary: finalAiSummary,
      status: 'pending'
    }).returning();
    
    res.status(201).json(newApt[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get prescriptions for a given appointment (enriched with medicine names)
router.get('/:id/prescriptions', authenticateToken, async (req, res) => {
  try {
    const aptId = parseInt(req.params.id);
    const prescs = await db.select().from(prescriptions).where(eq(prescriptions.appointmentId, aptId));
    const enriched = [];
    for (const p of prescs) {
      const med = await db.select({ name: medicines.name }).from(medicines).where(eq(medicines.id, p.medicineId));
      enriched.push({ ...p, medicineName: med[0]?.name || 'Unknown' });
    }
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
