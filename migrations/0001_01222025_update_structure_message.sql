-- Migration number: 0001 	 2025-01-22T22:46:53.074Z

-- First, create a new temporary table with the new structure
CREATE TABLE messages_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL,
    sender TEXT CHECK(sender IN ('user', 'bot')) NOT NULL,
    structured_content TEXT NOT NULL, -- JSON string containing {text: string, links?: Array<{label: string, url: string, type: string}>}
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- Copy existing data, converting the old text field to structured format
INSERT INTO messages_new (id, conversation_id, sender, structured_content, timestamp)
SELECT 
    id,
    conversation_id,
    sender,
    json_object(
        'text', text,
        'links', json_array()
    ),
    timestamp
FROM messages;

-- Drop the old table
DROP TABLE messages;

-- Rename the new table to messages
ALTER TABLE messages_new RENAME TO messages;

-- Create indexes
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);