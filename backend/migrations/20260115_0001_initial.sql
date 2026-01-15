
-- User Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY NOT NULL, -- UUID
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_metadata JSON
);

-- Tarot Cards (Static Data, populated on startup if empty)
CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    arcana TEXT NOT NULL, -- 'major' | 'minor'
    suit TEXT, -- 'cups', 'pentacles', etc.
    number INTEGER,
    archetype TEXT,
    keywords JSON, -- {upright: [], reversed: []}
    situational_tags JSON -- ["love", "money"]
);

-- Readings / Conversations
CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    user_query TEXT NOT NULL,
    ai_interpretation TEXT,
    drawn_cards JSON, -- Array of Card IDs with orientation [{id: "major_0", reversed: false}]
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(session_id) REFERENCES sessions(id)
);

-- Full Text Search for Readings
CREATE VIRTUAL TABLE IF NOT EXISTS readings_fts USING fts5(
    user_query,
    ai_interpretation,
    content='readings',
    content_rowid='id'
);

-- Trigger to keep FTS updated
CREATE TRIGGER readings_ai AFTER INSERT ON readings BEGIN
  INSERT INTO readings_fts(rowid, user_query, ai_interpretation) VALUES (new.id, new.user_query, new.ai_interpretation);
END;
