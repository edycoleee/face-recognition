-- ================================================
-- FACE RECOGNITION ATTENDANCE DATABASE INITIALIZATION
-- PostgreSQL + pgvector
-- ================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ================================================
-- TABLE: users
-- ================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index untuk email lookup (sering dipakai untuk login)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ================================================
-- TABLE: face_embeddings
-- ================================================
CREATE TABLE IF NOT EXISTS face_embeddings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    embedding VECTOR(512) NOT NULL,  -- Face embedding vector (512 dimensions)
    image_path VARCHAR(500),          -- Optional: path to reference image
    quality_score FLOAT,              -- Detection confidence score
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index untuk user_id lookup
CREATE INDEX IF NOT EXISTS idx_face_embeddings_user_id ON face_embeddings(user_id);

-- Index untuk vector similarity search (cosine similarity)
-- Lists = 100 adalah default yang baik untuk dataset kecil-menengah
CREATE INDEX IF NOT EXISTS idx_face_embeddings_vector 
ON face_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ================================================
-- TABLE: auth_tokens
-- ================================================
CREATE TABLE IF NOT EXISTS auth_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    confidence REAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index untuk token lookup (primary authentication)
CREATE INDEX IF NOT EXISTS idx_auth_tokens_token ON auth_tokens(token);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_active ON auth_tokens(is_active) WHERE is_active = TRUE;
