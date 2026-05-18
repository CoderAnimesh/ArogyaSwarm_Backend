const express = require('express');
const { eq } = require('drizzle-orm');
const { db } = require('../db');
const { appointments, prescriptions, medicines, users } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

const requireDoctor = (req, res, next) => {
  if (req.user.role !== 'doctor') return res.status(403).json({ error: 'Doctor only' });
  next();
};

// Get doctor's assigned appointments
router.get('/appointments', authenticateToken, requireDoctor, async (req, res) => {
  try {
    const myApts = await db.select().from(appointments).where(eq(appointments.doctorId, req.user.id));
    res.json(myApts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Prescribe MULTIPLE medicines to an appointment
// Body: { items: [{ medicineId, usage, frequency, days }] }
router.post('/appointments/:id/prescribe', authenticateToken, requireDoctor, async (req, res) => {
  try {
    const aptId = parseInt(req.params.id);
    const { items } = req.body; // Array of prescription items

    // Verify appointment belongs to this doctor
    const apts = await db.select().from(appointments).where(eq(appointments.id, aptId));
    if (apts.length === 0 || apts[0].doctorId !== req.user.id) {
      return res.status(403).json({ error: 'Not your appointment' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one medicine is required' });
    }

    // Frequency multiplier lookup
    const freqMap = {
      'Once a day': 1,
      'Twice a day': 2,
      'Thrice a day': 3,
      'Four times a day': 4,
      'Once a week': 1/7,
      'As needed': 1
    };

    const createdPrescriptions = [];

    for (const item of items) {
      const { medicineId, usage, frequency, days } = item;

      // Fetch medicine
      const meds = await db.select().from(medicines).where(eq(medicines.id, medicineId));
      if (meds.length === 0) return res.status(400).json({ error: `Medicine ID ${medicineId} not found` });

      // Calculate quantity: frequency per day × number of days
      const perDay = freqMap[frequency] || 1;
      const totalQty = Math.ceil(perDay * (days || 1));

      if (meds[0].stock < totalQty) {
        return res.status(400).json({ error: `Insufficient stock for ${meds[0].name}. Need ${totalQty}, have ${meds[0].stock}` });
      }

      // Deduct stock
      await db.update(medicines).set({ stock: meds[0].stock - totalQty }).where(eq(medicines.id, medicineId));

      // Create prescription row
      const newPresc = await db.insert(prescriptions).values({
        appointmentId: aptId,
        medicineId,
        usage,
        frequency: frequency || 'Once a day',
        days: days || 1,
        quantity: totalQty
      }).returning();

      createdPrescriptions.push(newPresc[0]);
    }

    // Mark appointment completed
    await db.update(appointments).set({ status: 'completed' }).where(eq(appointments.id, aptId));

    res.status(201).json({ message: `${createdPrescriptions.length} medicines prescribed`, prescriptions: createdPrescriptions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get prescriptions with medicine names for a specific appointment
router.get('/prescriptions/:aptId', authenticateToken, async (req, res) => {
  try {
    const aptId = parseInt(req.params.aptId);
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
