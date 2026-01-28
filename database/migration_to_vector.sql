-- ============================================
-- Migration: Convert embedding from TEXT to vector type
-- Performance improvement for face recognition
-- ============================================

-- Step 1: Install pgvector extension (if not already)
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Add new column with vector type
ALTER TABLE face_embeddings 
ADD COLUMN embedding_vector vector(512);

-- Step 3: Convert existing TEXT data to vector
-- Parse JSON string and convert to vector format
UPDATE face_embeddings 
SET embedding_vector = embedding::vector
WHERE embedding IS NOT NULL;

-- Step 4: Create index for fast similarity search
-- IVFFlat index for approximate nearest neighbor search
CREATE INDEX idx_face_embeddings_vector 
ON face_embeddings 
USING ivfflat (embedding_vector vector_cosine_ops)
WITH (lists = 100);

-- Alternative: HNSW index (better for smaller datasets, more accurate)
-- CREATE INDEX idx_face_embeddings_hnsw 
-- ON face_embeddings 
-- USING hnsw (embedding_vector vector_cosine_ops);

-- Step 5: Drop old TEXT column (after verification)
-- ALTER TABLE face_embeddings DROP COLUMN embedding;

-- Step 6: Rename new column to original name
-- ALTER TABLE face_embeddings RENAME COLUMN embedding_vector TO embedding;

-- ============================================
-- Performance Comparison:
-- ============================================
-- OLD (TEXT):   SELECT * FROM face_embeddings WHERE ... (full table scan)
-- NEW (vector): SELECT * FROM face_embeddings ORDER BY embedding <-> '[...]' LIMIT 5;
--               Uses index, 10-100x faster for large datasets!
-- ============================================

-- Verify migration
SELECT 
    COUNT(*) as total_embeddings,
    COUNT(embedding) as old_format,
    COUNT(embedding_vector) as new_format
FROM face_embeddings;
