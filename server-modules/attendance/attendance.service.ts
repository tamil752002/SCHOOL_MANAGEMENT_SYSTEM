import { query, getClient } from '../../database/db.js';
import { stringToUUID } from '../utils/helpers.js';


// mark teacher attendance
export const markTeacherAttendance = async (data: any) => {
  const { teacherId, date, session, status, markedBy } = data;

  const tid = stringToUUID(teacherId);
  const marked = markedBy ? stringToUUID(markedBy) : null;

  await query(
    `
    INSERT INTO teacher_attendance 
    (teacher_id, date, session, status, marked_by)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (teacher_id, date, session)
    DO UPDATE SET
      status = EXCLUDED.status,
      marked_by = EXCLUDED.marked_by,
      marked_at = CURRENT_TIMESTAMP
    `,
    [tid, date, session, status, marked]
  );

  return { teacherId, date, session, status };
};



// get teacher attendance
export const getTeacherAttendance = async (queryParams: any) => {
  const teacherId = stringToUUID(queryParams.teacherId);
  const from = queryParams.from;
  const to = queryParams.to;

  let sql = `
  SELECT id, teacher_id, date, session, status, marked_at, marked_by
  FROM teacher_attendance
  WHERE teacher_id = $1
  `;

  const params: any[] = [teacherId];

  if (from) {
    sql += ` AND date >= $2`;
    params.push(from);
  }

  if (to) {
    sql += ` AND date <= $${params.length + 1}`;
    params.push(to);
  }

  sql += ` ORDER BY date DESC, session`;

  const result = await query(sql, params);

  return result.rows.map((r: any) => ({
    id: r.id,
    teacherId: r.teacher_id,
    date: r.date,
    session: r.session,
    status: r.status,
    markedAt: r.marked_at,
    markedBy: r.marked_by
  }));
};



// get class incharge classes
export const getMyClassesToday = async (queryParams: any) => {
  const teacherId = stringToUUID(queryParams.teacherId);

  const result = await query(
    `
    SELECT id, class_name, section
    FROM teacher_classes
    WHERE teacher_id = $1
    AND is_incharge = true
    ORDER BY class_name, section
    `,
    [teacherId]
  );

  return result.rows.map((r: any) => ({
    id: r.id,
    className: r.class_name,
    section: r.section,
    session: 'morning',
    subjectId: null,
    subjectName: 'Class Incharge'
  }));
};



// save student attendance
export const saveAttendance = async (data: any) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const { studentId, date, session, status, markedBy } = data;

    const sid = stringToUUID(studentId);
    const marked = markedBy ? stringToUUID(markedBy) : null;
    const normalizedSession = session || 'morning';

    await client.query(
      `
      INSERT INTO attendance_records 
      (id, student_id, date, session, status, marked_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (student_id, date, session)
      DO UPDATE SET 
        status = EXCLUDED.status,
        marked_by = EXCLUDED.marked_by
      `,
      [
        crypto.randomUUID(),
        sid,
        date,
        normalizedSession,
        status,
        marked
      ]
    );

    await client.query('COMMIT');

    return { studentId, date, session, status };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};