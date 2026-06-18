# AI Resume Tailor + ATS Scorer

A full-stack web app that analyzes your resume against a job description, scores its ATS (Applicant Tracking System) compatibility, identifies missing keywords, and rewrites weak bullet points to better match the role.

**Live demo:** https://ai-resume-tailor-psi.vercel.app

## What it does

Paste or upload a resume (PDF, DOCX, or plain text) and a job description, and the app returns:

- An ATS match score (0-100%) with a visual breakdown
- A list of missing keywords the resume should include
- AI-rewritten versions of weak bullet points, tailored to the job description
- Actionable, specific recommendations to improve the resume
- A downloadable PDF report of the full analysis

## Tech stack

**Frontend:** React (Vite), deployed on Vercel
**Backend:** FastAPI (Python), deployed on Render
**AI:** Google Gemini API (`gemini-2.5-flash`)
**File handling:** `pypdf` and `python-docx` for resume extraction, `reportlab` for PDF report generation

## Features

- Paste resume text directly, or upload a PDF/DOCX file
- Real-time ATS scoring with color-coded match strength
- Copy individual rewritten bullets or all at once
- Download a formatted PDF report of the full analysis
- Input validation and graceful error handling throughout

## Running locally

**Backend**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
echo "GEMINI_API_KEY=your_key_here" > .env
uvicorn main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Why I built this

Well as I'm a CS student applying to internships, and I kept manually checking my resume against every job posting to see if I was missing key terms. This automates that process — and was also a way to get hands-on experience with a real AI-integrated, full-stack deployment pipeline (React + FastAPI + an LLM API + production deployment).