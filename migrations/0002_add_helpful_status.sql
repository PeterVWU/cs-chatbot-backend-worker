-- Migration number: 0002 	 2025-01-23T21:53:40.335Z
-- Disable foreign key constraints
PRAGMA foreign_keys=OFF;

-- Create new conversations table
CREATE TABLE conversations_new (
    id TEXT PRIMARY KEY,
    status TEXT CHECK(status IN ('open', 'closed', 'ticket', 'helpful')) NOT NULL,
    metadata TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Create new messages table
CREATE TABLE messages_new (
    conversation_id TEXT NOT NULL,
    structured_content TEXT NOT NULL,
    sender TEXT CHECK(sender IN ('user', 'bot')) NOT NULL,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations_new(id)
);

-- Copy conversations data
INSERT INTO conversations_new
SELECT 
    id,
    CASE 
        WHEN status NOT IN ('open', 'closed', 'ticket', 'helpful') THEN 'open'
        ELSE status 
    END,
    metadata,
    created_at,
    updated_at
FROM conversations;

-- Copy messages data
INSERT INTO messages_new
SELECT conversation_id, structured_content, sender, timestamp
FROM messages;

-- Drop original tables
DROP TABLE messages;
DROP TABLE conversations;

-- Rename new tables
ALTER TABLE conversations_new RENAME TO conversations;
ALTER TABLE messages_new RENAME TO messages;

-- Create indexes
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_created_at ON conversations(created_at);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);

-- Re-enable foreign key constraints
PRAGMA foreign_keys=ON;

-- Verify migration
SELECT DISTINCT status FROM conversations ORDER BY status;