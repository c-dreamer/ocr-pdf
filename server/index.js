import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.warn('DATABASE_URL not set - save endpoint will fail unless configured');
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });

app.post('/api/save', async (req, res) => {
  const { userId, fileName, extractedText, ocrText, metadata } = req.body || {};
  if (!userId || !fileName) {
    return res.status(400).json({ error: 'userId and fileName are required' });
  }

  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        file_name TEXT,
        extracted_text TEXT,
        ocr_text TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
      )`
    );

    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await pool.query(
      `INSERT INTO documents (id, user_id, file_name, extracted_text, ocr_text, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, userId, fileName, extractedText || '', ocrText || '', metadata || {}]
    );

    return res.json({ success: true, id });
  } catch (err) {
    console.error('Save error:', err);
    return res.status(500).json({ error: 'failed to save' });
  }
});

const port = process.env.PORT || 8787;
app.listen(port, () => console.log(`Server listening on port ${port}`));
