import express from 'express';
import { getClient } from '../../database/db.js';
import { stringToUUID, generateUUID } from '../utils/helpers.js';

const router = express.Router();

function normalizeOtherFeesForSave(val) {
    if (val == null) return [];
    const raw = typeof val === 'string' ? (() => { try { return JSON.parse(val); } catch { return []; } })() : val;
    const arr = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && ('name' in raw || 'amount' in raw) ? [raw] : (raw && typeof raw === 'object' ? Object.values(raw) : []));
    return arr.filter(item => item && typeof item === 'object').map(item => ({ name: String(item.name ?? '').trim(), amount: Number(item.amount) || 0 }));
}

/** Get fee lines from a structure: [{ feeType, otherFeeName, amount }] */
function getFeeLinesFromStructure(row) {
    const lines = [];
    const tuition = parseFloat(row.tuition_fee || 0); if (tuition > 0) lines.push({ feeType: 'tuition', otherFeeName: '', amount: tuition });
    const school = parseFloat(row.school_fee || 0); if (school > 0) lines.push({ feeType: 'school', otherFeeName: '', amount: school });
    const exam = parseFloat(row.exam_fee || 0); if (exam > 0) lines.push({ feeType: 'exam', otherFeeName: '', amount: exam });
    const van = parseFloat(row.van_fee || 0); if (van > 0) lines.push({ feeType: 'van', otherFeeName: '', amount: van });
    const books = parseFloat(row.books_fee || 0); if (books > 0) lines.push({ feeType: 'books', otherFeeName: '', amount: books });
    const uniform = parseFloat(row.uniform_fee || 0); if (uniform > 0) lines.push({ feeType: 'uniform', otherFeeName: '', amount: uniform });
    const otherFees = row.other_fees && (Array.isArray(row.other_fees) ? row.other_fees : Object.values(row.other_fees || {}));
    if (otherFees) otherFees.forEach(o => { const amt = Number(o?.amount) || 0; if (amt > 0) lines.push({ feeType: 'other', otherFeeName: String(o?.name ?? '').trim(), amount: amt }); });
    return lines;
}

/** Upsert one fee record; amount = structure value (admin is source of truth). Overpayment is handled by allocateOverpayment. */
async function upsertFeeRecord(client, { studentId, academicYear, feeType, otherFeeName, amount, paidAmount = 0, dueDate, paidDate, status, receiptNumber, description, collectedBy }) {
    const sid = stringToUUID(studentId);
    const other = feeType === 'other' ? String(otherFeeName ?? description ?? '').trim() : '';
    const desc = feeType === 'other' ? other : (description || '');
    const amt = parseFloat(amount) || 0;
    const paid = parseFloat(paidAmount) || 0;
    const coll = collectedBy ? stringToUUID(collectedBy) : null;
    const id = generateUUID();
    await client.query(`
        INSERT INTO fee_records (id, student_id, fee_type, other_fee_name, amount, paid_amount, due_date, paid_date, status, receipt_number, description, academic_year, collected_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (student_id, fee_type, academic_year, other_fee_name) DO UPDATE SET
            amount = EXCLUDED.amount,
            paid_amount = EXCLUDED.paid_amount,
            due_date = EXCLUDED.due_date, paid_date = EXCLUDED.paid_date, status = EXCLUDED.status,
            receipt_number = EXCLUDED.receipt_number, description = EXCLUDED.description, collected_by = EXCLUDED.collected_by,
            updated_at = CURRENT_TIMESTAMP
    `, [id, sid, feeType, other, amt, paid, dueDate || null, paidDate || null, status || 'pending', receiptNumber || null, desc, academicYear, coll]);
    return id;
}

/** When a fee record has paid_amount > amount (overpayment), set source to paid_amount=amount and apply excess to first pending fee(s). */
async function allocateOverpayment(client, studentId, academicYear, feeType, otherFeeName) {
    const sid = stringToUUID(studentId);
    const other = feeType === 'other' ? String(otherFeeName ?? '').trim() : '';
    const row = await client.query(
        'SELECT id, amount, paid_amount FROM fee_records WHERE student_id = $1 AND fee_type = $2 AND academic_year = $3 AND other_fee_name = $4',
        [sid, feeType, academicYear, other]
    );
    if (row.rows.length === 0) return;
    const r = row.rows[0];
    const amount = parseFloat(r.amount);
    const paidAmount = parseFloat(r.paid_amount || 0);
    let excess = paidAmount - amount;
    if (excess <= 0) return;
    await client.query(
        'UPDATE fee_records SET paid_amount = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [amount, 'paid', r.id]
    );
    const targets = await client.query(`
        SELECT id, amount, paid_amount, (amount - paid_amount) AS remaining
        FROM fee_records
        WHERE student_id = $1 AND academic_year = $2 AND id != $3
        AND (amount - paid_amount) > 0
        ORDER BY fee_type, other_fee_name
    `, [sid, academicYear, r.id]);
    for (const t of targets.rows) {
        if (excess <= 0) break;
        const remaining = parseFloat(t.remaining || 0);
        const applyAmount = Math.min(excess, remaining);
        if (applyAmount <= 0) continue;
        const newPaid = parseFloat(t.paid_amount || 0) + applyAmount;
        const tAmount = parseFloat(t.amount);
        const newStatus = newPaid >= tAmount ? 'paid' : 'partial';
        await client.query(
            'UPDATE fee_records SET paid_amount = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [newPaid, newStatus, t.id]
        );
        await client.query(
            'INSERT INTO fee_overpayment_allocations (id, from_fee_record_id, to_fee_record_id, amount) VALUES ($1, $2, $3, $4)',
            [generateUUID(), r.id, t.id, applyAmount]
        );
        excess -= applyAmount;
    }
}

/** Apply structure to a set of students: set amount from structure (admin value); then allocate any overpayment to other pending fees. */
async function applyStructureToStudents(client, structureRow, studentIds, academicYear) {
    const lines = getFeeLinesFromStructure(structureRow);
    for (const studentId of studentIds) {
        for (const line of lines) {
            const existing = await client.query(
                'SELECT paid_amount FROM fee_records WHERE student_id = $1 AND fee_type = $2 AND academic_year = $3 AND other_fee_name = $4',
                [stringToUUID(studentId), line.feeType, academicYear, line.otherFeeName]
            );
            const paidAmount = existing.rows[0]?.paid_amount ?? 0;
            const amount = line.amount;
            const status = existing.rows[0]
                ? (parseFloat(paidAmount) >= amount ? 'paid' : (parseFloat(paidAmount) > 0 ? 'partial' : 'pending'))
                : 'pending';
            await upsertFeeRecord(client, {
                studentId,
                academicYear,
                feeType: line.feeType,
                otherFeeName: line.otherFeeName,
                amount,
                paidAmount,
                status,
                description: line.otherFeeName
            });
            await allocateOverpayment(client, studentId, academicYear, line.feeType, line.otherFeeName);
        }
    }
}

// POST /api/fees/structures - Create fee structure; if curriculum, create fee_records for all students in class
router.post('/structures', async (req, res) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const structure = req.body;
        const id = structure.id || generateUUID();
        const schoolId = structure.schoolId ? stringToUUID(structure.schoolId) : null;
        if (!schoolId) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'School ID is required' });
        }
        const otherFeesArray = normalizeOtherFeesForSave(structure.otherFees);
        await client.query(`
            INSERT INTO fee_structures (id, school_id, class_name, academic_year, structure_type, tuition_fee, school_fee, exam_fee, van_fee, books_fee, uniform_fee, other_fees)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (class_name, academic_year, structure_type, school_id) DO UPDATE SET
                tuition_fee = EXCLUDED.tuition_fee, school_fee = EXCLUDED.school_fee, exam_fee = EXCLUDED.exam_fee,
                van_fee = EXCLUDED.van_fee, books_fee = EXCLUDED.books_fee, uniform_fee = EXCLUDED.uniform_fee,
                other_fees = EXCLUDED.other_fees, updated_at = CURRENT_TIMESTAMP
        `, [
            stringToUUID(id), schoolId, structure.className, structure.academicYear,
            structure.structureType || 'curriculum',
            structure.tuitionFee || 0, structure.schoolFee || 0, structure.examFee || 0,
            structure.vanFee || 0, structure.booksFee || 0, structure.uniformFee || 0,
            JSON.stringify(otherFeesArray)
        ]);
        const structureType = structure.structureType || 'curriculum';
        const academicYear = structure.academicYear;
        if (structureType === 'curriculum') {
            const studentsResult = await client.query(
                'SELECT id FROM students WHERE school_id = $1 AND student_class = $2',
                [schoolId, structure.className]
            );
            const studentIds = studentsResult.rows.map(r => r.id);
            const structResult = await client.query(
                'SELECT * FROM fee_structures WHERE class_name = $1 AND academic_year = $2 AND structure_type = $3 AND school_id = $4',
                [structure.className, academicYear, structureType, schoolId]
            );
            if (structResult.rows[0]) await applyStructureToStudents(client, structResult.rows[0], studentIds, academicYear);
        }
        const finalStruct = await client.query(
            'SELECT id FROM fee_structures WHERE class_name = $1 AND academic_year = $2 AND structure_type = $3 AND school_id = $4',
            [structure.className, academicYear, structureType, schoolId]
        );
        const returnedId = finalStruct.rows[0]?.id?.toString() || id;
        await client.query('COMMIT');
        res.json({ id: returnedId, message: 'Fee structure created successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating fee structure:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// PUT /api/fees/structures/:id - Update structure; recompute fee_records for affected students (cap amount >= paid_amount)
router.put('/structures/:id', async (req, res) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const id = stringToUUID(req.params.id);
        const structure = req.body;
        const otherFeesArray = normalizeOtherFeesForSave(structure.otherFees);
        await client.query(`
            UPDATE fee_structures SET
                class_name = $1, academic_year = $2, structure_type = $3,
                tuition_fee = $4, school_fee = $5, exam_fee = $6, van_fee = $7, books_fee = $8, uniform_fee = $9, other_fees = $10, updated_at = CURRENT_TIMESTAMP
            WHERE id = $11
        `, [
            structure.className, structure.academicYear, structure.structureType || 'curriculum',
            structure.tuitionFee || 0, structure.schoolFee || 0, structure.examFee || 0,
            structure.vanFee || 0, structure.booksFee || 0, structure.uniformFee || 0,
            JSON.stringify(otherFeesArray), id
        ]);
        const structResult = await client.query('SELECT * FROM fee_structures WHERE id = $1', [id]);
        if (structResult.rows[0]) {
            const row = structResult.rows[0];
            const academicYear = row.academic_year;
            const schoolId = row.school_id;
            if (row.structure_type === 'curriculum') {
                const studentsResult = await client.query('SELECT id FROM students WHERE school_id = $1 AND student_class = $2', [schoolId, row.class_name]);
                const studentIds = studentsResult.rows.map(r => r.id);
                await applyStructureToStudents(client, row, studentIds, academicYear);
            } else {
                const mappingResult = await client.query('SELECT student_id FROM fee_structure_student_mapping WHERE fee_structure_id = $1', [id]);
                const studentIds = mappingResult.rows.map(r => r.student_id);
                await applyStructureToStudents(client, row, studentIds, academicYear);
            }
        }
        await client.query('COMMIT');
        res.json({ message: 'Fee structure updated successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating fee structure:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// DELETE /api/fees/structures/:id - Delete mappings, unpaid fee_records linked to structure, then structure
router.delete('/structures/:id', async (req, res) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const id = stringToUUID(req.params.id);
        const structResult = await client.query('SELECT id, academic_year FROM fee_structures WHERE id = $1', [id]);
        if (structResult.rows.length > 0) {
            const academicYear = structResult.rows[0].academic_year;
            const mappingResult = await client.query('SELECT student_id, fee_type, other_fee_name FROM fee_structure_student_mapping WHERE fee_structure_id = $1', [id]);
            for (const m of mappingResult.rows) {
                await client.query(
                    `DELETE FROM fee_records WHERE student_id = $1 AND fee_type = $2 AND academic_year = $3 AND other_fee_name = $4 AND status IN ('pending','partial','overdue')`,
                    [m.student_id, m.fee_type, academicYear, m.other_fee_name ?? '']
                );
            }
            await client.query('DELETE FROM fee_structure_student_mapping WHERE fee_structure_id = $1', [id]);
        }
        await client.query('DELETE FROM fee_structures WHERE id = $1', [id]);
        await client.query('COMMIT');
        res.json({ message: 'Fee structure deleted successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting fee structure:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// POST /api/fees/collect - Record payment; set paid_amount (total paid), update status
router.post('/collect', async (req, res) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const feeRecord = req.body;
        const studentId = stringToUUID(feeRecord.studentId);
        const otherFeeName = feeRecord.feeType === 'other' ? String(feeRecord.otherFeeName ?? feeRecord.description ?? '').trim() : '';
        const newPaid = parseFloat(feeRecord.paidAmount ?? feeRecord.feePaid ?? 0);
        const existing = await client.query(
            'SELECT id, paid_amount, amount FROM fee_records WHERE student_id = $1 AND fee_type = $2 AND academic_year = $3 AND other_fee_name = $4',
            [studentId, feeRecord.feeType, feeRecord.academicYear, otherFeeName]
        );
        const totalAmount = existing.rows[0] ? parseFloat(existing.rows[0].amount) : parseFloat(feeRecord.amount ?? 0);
        if (newPaid > totalAmount) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Paid amount cannot exceed fee amount' });
        }
        const recordId = feeRecord.id || (existing.rows[0]?.id ?? null);
        const status = newPaid >= totalAmount ? 'paid' : (newPaid > 0 ? 'partial' : 'pending');
        if (existing.rows[0]) {
            await client.query(`
                UPDATE fee_records SET paid_amount = $1, paid_date = $2, status = $3, receipt_number = $4, collected_by = $5, updated_at = CURRENT_TIMESTAMP
                WHERE id = $6
            `, [newPaid, feeRecord.paidDate || new Date().toISOString().slice(0, 10), status, feeRecord.receiptNumber || null, feeRecord.collectedBy ? stringToUUID(feeRecord.collectedBy) : null, existing.rows[0].id]);
        } else {
            await upsertFeeRecord(client, {
                studentId: feeRecord.studentId,
                academicYear: feeRecord.academicYear,
                feeType: feeRecord.feeType,
                otherFeeName,
                amount: totalAmount,
                paidAmount: newPaid,
                dueDate: feeRecord.dueDate,
                paidDate: feeRecord.paidDate || new Date().toISOString().slice(0, 10),
                status,
                receiptNumber: feeRecord.receiptNumber,
                description: otherFeeName,
                collectedBy: feeRecord.collectedBy
            });
        }
        await client.query('COMMIT');
        res.json({ id: recordId || feeRecord.id, message: 'Fee collected successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error collecting fee:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// POST /api/fees/bulk-collect
router.post('/bulk-collect', async (req, res) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const { students, feeData } = req.body;
        let processed = 0;
        for (const studentId of students || []) {
            const sId = stringToUUID(studentId);
            const otherFeeName = feeData?.feeType === 'other' ? String(feeData?.otherFeeName ?? feeData?.description ?? '').trim() : '';
            const newPaid = parseFloat(feeData?.paidAmount ?? feeData?.amount ?? 0);
            const academicYear = feeData?.academicYear;
            if (!academicYear) continue;
            const existing = await client.query(
                'SELECT id, paid_amount, amount FROM fee_records WHERE student_id = $1 AND fee_type = $2 AND academic_year = $3 AND other_fee_name = $4',
                [sId, feeData.feeType, academicYear, otherFeeName]
            );
            const totalAmount = existing.rows[0] ? parseFloat(existing.rows[0].amount) : parseFloat(feeData?.amount ?? 0);
            if (newPaid > totalAmount) continue;
            const status = newPaid >= totalAmount ? 'paid' : (newPaid > 0 ? 'partial' : 'pending');
            if (existing.rows[0]) {
                await client.query(`
                    UPDATE fee_records SET paid_amount = $1, paid_date = $2, status = $3, receipt_number = $4, collected_by = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6
                `, [newPaid, feeData.paidDate || new Date().toISOString().slice(0, 10), status, feeData.receiptNumber || null, feeData.collectedBy ? stringToUUID(feeData.collectedBy) : null, existing.rows[0].id]);
            } else {
                await upsertFeeRecord(client, {
                    studentId,
                    academicYear,
                    feeType: feeData.feeType,
                    otherFeeName,
                    amount: totalAmount,
                    paidAmount: newPaid,
                    paidDate: feeData.paidDate,
                    status,
                    receiptNumber: feeData.receiptNumber,
                    collectedBy: feeData.collectedBy
                });
            }
            processed++;
        }
        await client.query('COMMIT');
        res.json({ message: `Successfully processed ${processed} payments` });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error processing bulk fee collection:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// POST /api/fees/mappings - Add mapping; create fee_records for that student from the semi structure
router.post('/mappings', async (req, res) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const mapping = req.body;
        const id = mapping.id || generateUUID();
        const feeStructureId = stringToUUID(mapping.feeStructureId);
        const studentId = stringToUUID(mapping.studentId);
        const otherFeeName = mapping.feeType === 'other' && mapping.otherFeeName ? String(mapping.otherFeeName).trim() : '';
        await client.query(`
            INSERT INTO fee_structure_student_mapping (id, fee_structure_id, student_id, fee_type, other_fee_name, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (fee_structure_id, student_id, fee_type, other_fee_name) DO NOTHING
        `, [stringToUUID(id), feeStructureId, studentId, mapping.feeType, otherFeeName, mapping.createdAt || new Date().toISOString()]);
        const structResult = await client.query('SELECT * FROM fee_structures WHERE id = $1', [feeStructureId]);
        if (structResult.rows[0]) {
            const row = structResult.rows[0];
            const lines = getFeeLinesFromStructure(row);
            const academicYear = row.academic_year;
            for (const line of lines) {
                if (mapping.feeType !== line.feeType) continue;
                if (mapping.feeType === 'other' && line.otherFeeName !== otherFeeName) continue;
                await upsertFeeRecord(client, {
                    studentId: mapping.studentId,
                    academicYear,
                    feeType: line.feeType,
                    otherFeeName: line.otherFeeName,
                    amount: line.amount,
                    paidAmount: 0,
                    status: 'pending',
                    description: line.otherFeeName
                });
            }
        }
        await client.query('COMMIT');
        res.json({ id, message: 'Mapping created successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating mapping:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// DELETE /api/fees/mappings/:id - Remove mapping; delete unpaid fee_records for that (student, fee_type, other_fee_name, academic_year)
router.delete('/mappings/:id', async (req, res) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const id = stringToUUID(req.params.id);
        const mappingResult = await client.query(`
            SELECT fsm.student_id, fsm.fee_type, fsm.other_fee_name, fs.academic_year
            FROM fee_structure_student_mapping fsm
            JOIN fee_structures fs ON fsm.fee_structure_id = fs.id
            WHERE fsm.id = $1
        `, [id]);
        if (mappingResult.rows.length > 0) {
            const m = mappingResult.rows[0];
            await client.query(
                `DELETE FROM fee_records WHERE student_id = $1 AND fee_type = $2 AND academic_year = $3 AND other_fee_name = $4 AND status IN ('pending','partial','overdue')`,
                [m.student_id, m.fee_type, m.academic_year, m.other_fee_name ?? '']
            );
        }
        await client.query('DELETE FROM fee_structure_student_mapping WHERE id = $1', [id]);
        await client.query('COMMIT');
        res.json({ message: 'Mapping deleted successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting mapping:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// DELETE /api/fees/records - Delete fee records by criteria
router.delete('/records', async (req, res) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const { studentId, feeType, description, academicYear } = req.body;
        let q = "DELETE FROM fee_records WHERE status IN ('pending', 'partial', 'overdue')";
        const params = [];
        let i = 1;
        if (studentId) { q += ` AND student_id = $${i}`; params.push(stringToUUID(studentId)); i++; }
        if (feeType) { q += ` AND fee_type = $${i}`; params.push(feeType); i++; }
        if (description) { q += ` AND (description = $${i} OR other_fee_name = $${i})`; params.push(description); i++; }
        if (academicYear) { q += ` AND academic_year = $${i}`; params.push(academicYear); i++; }
        const result = await client.query(q, params);
        await client.query('COMMIT');
        res.json({ message: `Deleted ${result.rowCount} fee record(s) successfully` });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting fee records:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

router.get('/analytics', async (req, res) => {
    res.json({ message: 'Analytics data available via main data endpoint' });
});

export default router;
