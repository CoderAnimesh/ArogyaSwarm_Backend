const { pgTable, serial, text, varchar, timestamp, integer } = require('drizzle-orm/pg-core');

const users = pgTable('users', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  role: varchar('role', { length: 50 }).notNull().default('patient'),
  speciality: varchar('speciality', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
});

const medicines = pgTable('medicines', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  stock: integer('stock').notNull().default(0),
  description: text('description'),
});

const appointments = pgTable('appointments', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  patientId: integer('patient_id').references(() => users.id).notNull(),
  patientAge: integer('patient_age'),
  patientSex: varchar('patient_sex', { length: 20 }),
  doctorId: integer('doctor_id').references(() => users.id),
  appointmentNo: varchar('appointment_no', { length: 20 }),
  predictedTime: varchar('predicted_time', { length: 100 }),
  problem: varchar('problem', { length: 255 }).notNull(),
  details: text('details'),
  aiSummary: text('ai_summary'),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
});

const prescriptions = pgTable('prescriptions', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  appointmentId: integer('appointment_id').references(() => appointments.id).notNull(),
  medicineId: integer('medicine_id').references(() => medicines.id).notNull(),
  usage: text('usage').notNull(),
  frequency: varchar('frequency', { length: 50 }),
  days: integer('days'),
  quantity: integer('quantity'),
  prescribedAt: timestamp('prescribed_at').defaultNow(),
});

const ashaTasks = pgTable('asha_tasks', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  ashaId: integer('asha_id').references(() => users.id).notNull(),
  taskType: varchar('task_type', { length: 50 }).notNull(),
  description: text('description').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, completed
  createdAt: timestamp('created_at').defaultNow(),
});

module.exports = {
  users,
  medicines,
  appointments,
  prescriptions,
  ashaTasks
};
