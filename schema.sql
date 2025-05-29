-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create rooms table
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- Create messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    sender_nickname VARCHAR(255) NOT NULL,
    content TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'chat',
    file_url TEXT,
    file_type VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_rooms_expires_at ON rooms(expires_at);

-- Create RLS (Row Level Security) policies
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies for rooms
CREATE POLICY "Rooms are viewable by anyone"
    ON rooms FOR SELECT
    USING (true);

CREATE POLICY "Rooms can be created by anyone"
    ON rooms FOR INSERT
    WITH CHECK (true);

-- Create policies for messages
CREATE POLICY "Messages are viewable by anyone"
    ON messages FOR SELECT
    USING (true);

CREATE POLICY "Messages can be created by anyone"
    ON messages FOR INSERT
    WITH CHECK (true);

-- Simple cleanup function for expired rooms
CREATE OR REPLACE FUNCTION cleanup_expired_rooms()
RETURNS void AS $$
BEGIN
    DELETE FROM rooms
    WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql; 