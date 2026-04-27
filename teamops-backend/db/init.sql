CREATE DATABASE teamops;

\c teamops;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workspaces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    invite_code VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workspace_members (
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) CHECK (role IN ('owner', 'admin', 'member')),
    PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE columns (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    position INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cards (
    id SERIAL PRIMARY KEY,
    column_id INTEGER REFERENCES columns(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high')),
    assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    due_date DATE,
    position INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_cards_column_id ON cards(column_id);
CREATE INDEX idx_activities_workspace_id ON activities(workspace_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);