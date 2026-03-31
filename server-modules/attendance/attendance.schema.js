import { z } from 'zod';

// mark teacher attendance
export const teacherAttendanceSchema = z.object({
  teacherId: z.string().uuid(),

  date: z.string().min(1),

  session: z.enum(['morning', 'afternoon']),

  status: z.enum(['present', 'absent']),

  markedBy: z.string().uuid().optional()
});


// get teacher attendance (query)
export const getTeacherAttendanceSchema = z.object({
  teacherId: z.string().uuid(),

  from: z.string().optional(),

  to: z.string().optional()
});


// student attendance record
export const attendanceRecordSchema = z.object({
  studentId: z.string().uuid(),

  date: z.string(),

  session: z
    .enum(['morning', 'afternoon'])
    .default('morning'),

  status: z.enum(['present', 'absent', 'late', 'halfday']),

  markedBy: z.string().uuid().optional()
});


// bulk attendance (future use)
export const bulkAttendanceSchema = z.object({
  date: z.string(),

  session: z.enum(['morning', 'afternoon']),

  records: z.array(
    z.object({
      studentId: z.string().uuid(),
      status: z.enum(['present', 'absent', 'late', 'halfday'])
    })
  )
});