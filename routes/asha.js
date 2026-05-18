const express = require('express');
const { eq } = require('drizzle-orm');
const { db } = require('../db');
const { ashaTasks } = require('../db/schema');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

const requireAsha = (req, res, next) => {
  if (req.user.role !== 'asha') return res.status(403).json({ error: 'Asha Worker only' });
  next();
};

// Get uncompleted tasks assigned to this worker
router.get('/tasks', authenticateToken, requireAsha, async (req, res) => {
  try {
    const tasks = await db.select().from(ashaTasks).where(eq(ashaTasks.ashaId, req.user.id));
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Complete a task
router.post('/tasks/:id/complete', authenticateToken, requireAsha, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    
    // Verify task belongs to this asha
    const taskData = await db.select().from(ashaTasks).where(eq(ashaTasks.id, taskId));
    if (taskData.length === 0 || taskData[0].ashaId !== req.user.id) {
      return res.status(403).json({ error: 'Not your task' });
    }

    const updated = await db.update(ashaTasks)
      .set({ status: 'completed' })
      .where(eq(ashaTasks.id, taskId))
      .returning();

    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
