-- Allow tickets to be created without created_by (for public ticket form)
ALTER TABLE tickets ALTER COLUMN created_by DROP NOT NULL;