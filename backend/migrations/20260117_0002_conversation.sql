-- Conversation History for Multi-Turn Readings
-- Messages table for conversation history
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reading_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(reading_id) REFERENCES readings(id) ON DELETE CASCADE
);

-- Index for fast message retrieval by reading
CREATE INDEX IF NOT EXISTS idx_messages_reading ON messages(reading_id);
