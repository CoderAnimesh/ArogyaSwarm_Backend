const express = require('express');
const bcrypt = require('bcrypt');
const { eq } = require('drizzle-orm');
const { db } = require('../db');
const { users, medicines, appointments, ashaTasks } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
};

// ═══ APPOINTMENTS ═══

router.get('/appointments', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const allApts = await db.select().from(appointments);
    res.json(allApts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/appointments/:id/assign', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const aptId = parseInt(req.params.id);
    const { doctorId } = req.body;
    const docs = await db.select().from(users).where(eq(users.id, doctorId));
    if (docs.length === 0 || docs[0].role !== 'doctor') {
      return res.status(400).json({ error: 'Invalid doctor ID' });
    }

    // Calculate queue position for this doctor (how many assigned/pending patients they already have)
    const existingQueue = await db.select().from(appointments).where(eq(appointments.doctorId, doctorId));
    const queuePosition = existingQueue.filter(a => a.status === 'assigned').length + 1;

    // Generate appointment number: APT-DDMM-XXXX
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const appointmentNo = `APT-${dd}${mm}-${String(aptId).padStart(4, '0')}`;

    // Predicted time: start from 9:00 AM + 15 min per queue position
    const baseHour = 9;
    const totalMinutes = (queuePosition - 1) * 15;
    const predHour = baseHour + Math.floor(totalMinutes / 60);
    const predMin = totalMinutes % 60;
    const predEndMin = predMin + 15;
    const predEndHour = predHour + Math.floor(predEndMin / 60);
    const predictedTime = `${String(predHour).padStart(2,'0')}:${String(predMin).padStart(2,'0')} - ${String(predEndHour).padStart(2,'0')}:${String(predEndMin % 60).padStart(2,'0')} (Queue #${queuePosition})`;

    const updated = await db.update(appointments)
      .set({ doctorId, status: 'assigned', appointmentNo, predictedTime })
      .where(eq(appointments.id, aptId))
      .returning();
    res.json(updated[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══ DOCTORS ═══

router.post('/doctors', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, speciality } = req.body;
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) return res.status(400).json({ error: 'Email exists' });

    const hashed = await bcrypt.hash(password, 10);
    const newDoc = await db.insert(users).values({
      name, email, password: hashed, role: 'doctor', speciality: speciality || null
    }).returning({ id: users.id, name: users.name, email: users.email, speciality: users.speciality });

    res.status(201).json(newDoc[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/doctors', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const docs = await db.select({
      id: users.id, name: users.name, email: users.email, speciality: users.speciality
    }).from(users).where(eq(users.role, 'doctor'));
    res.json(docs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get patients assigned to a specific doctor
router.get('/doctors/:id/patients', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const docId = parseInt(req.params.id);
    const apts = await db.select().from(appointments).where(eq(appointments.doctorId, docId));
    // Enrich with patient names
    const enriched = [];
    for (const apt of apts) {
      const patient = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, apt.patientId));
      enriched.push({ ...apt, patientName: patient[0]?.name || 'Unknown', patientEmail: patient[0]?.email || '' });
    }
    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══ MEDICINES ═══

router.post('/medicines', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, stock, description } = req.body;
    const newMed = await db.insert(medicines).values({ name, stock, description }).returning();
    res.status(201).json(newMed[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/medicines', authenticateToken, async (req, res) => {
  try {
    const meds = await db.select().from(medicines);
    res.json(meds);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══ ASHA WORKERS ═══

router.post('/ashas', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) return res.status(400).json({ error: 'Email exists' });

    const hashed = await bcrypt.hash(password, 10);
    const newAsha = await db.insert(users).values({
      name, email, password: hashed, role: 'asha'
    }).returning({ id: users.id, name: users.name, email: users.email });

    res.status(201).json(newAsha[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/ashas', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const ashas = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.role, 'asha'));
    res.json(ashas);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/asha-tasks', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { ashaId, taskType, description } = req.body;
    const newTask = await db.insert(ashaTasks).values({ ashaId, taskType, description, status: 'pending' }).returning();
    res.status(201).json(newTask[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/asha-tasks', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const tasks = await db.select().from(ashaTasks);
    res.json(tasks);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══ STATS ═══
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const allApts = await db.select().from(appointments);
    const docs = await db.select().from(users).where(eq(users.role, 'doctor'));
    const ashas = await db.select().from(users).where(eq(users.role, 'asha'));
    const patients = await db.select().from(users).where(eq(users.role, 'patient'));
    const meds = await db.select().from(medicines);
    const tasks = await db.select().from(ashaTasks);
    res.json({
      totalAppointments: allApts.length,
      pendingAppointments: allApts.filter(a => a.status === 'pending').length,
      assignedAppointments: allApts.filter(a => a.status === 'assigned').length,
      completedAppointments: allApts.filter(a => a.status === 'completed').length,
      totalDoctors: docs.length,
      totalAshas: ashas.length,
      totalPatients: patients.length,
      totalMedicines: meds.length,
      pendingTasks: tasks.filter(t => t.status === 'pending').length,
      completedTasks: tasks.filter(t => t.status === 'completed').length
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
