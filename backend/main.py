from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
import os
import uuid

app = FastAPI()

# ===============================
# CORS
# ===============================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # lock to Netlify later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===============================
# DATABASE CONNECTION
# ===============================
DATABASE_URL = os.getenv("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL
)
""")
conn.commit()

# ===============================
# DATA MODELS
# ===============================
class NoteCreate(BaseModel):
    title: str
    content: str

# ===============================
# ROOT
# ===============================
@app.get("/")
def root():
    return {"status": "FastAPI is running"}

# ===============================
# GET ALL NOTES
# ===============================
@app.get("/notes")
def get_notes():
    cursor.execute("SELECT id, title FROM notes ORDER BY title")
    rows = cursor.fetchall()
    return [{"id": r[0], "title": r[1]} for r in rows]

# ===============================
# GET SINGLE NOTE
# ===============================
@app.get("/notes/{note_id}")
def get_note(note_id: str):
    cursor.execute(
        "SELECT id, title, content FROM notes WHERE id = %s",
        (note_id,)
    )
    row = cursor.fetchone()

    if not row:
        return {"error": "Note not found"}

    return {
        "id": row[0],
        "title": row[1],
        "content": row[2]
    }

# ===============================
# CREATE NOTE
# ===============================
@app.post("/notes")
def create_note(note: NoteCreate):
    note_id = str(uuid.uuid4())

    cursor.execute(
        "INSERT INTO notes (id, title, content) VALUES (%s, %s, %s)",
        (note_id, note.title, note.content)
    )
    conn.commit()

    return {"id": note_id, "status": "created"}

# ===============================
# UPDATE NOTE
# ===============================
@app.put("/notes/{note_id}")
def update_note(note_id: str, note: NoteCreate):
    cursor.execute(
        "UPDATE notes SET title=%s, content=%s WHERE id=%s",
        (note.title, note.content, note_id)
    )
    conn.commit()

    return {"status": "updated"}
