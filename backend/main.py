from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from google import genai
import os
import json
import re
import io
from dotenv import load_dotenv

from pypdf import PdfReader
import docx
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://ai-resume-tailor-psi.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


class AnalyzeRequest(BaseModel):
    resume: str
    job_description: str

    @field_validator("resume", "job_description")
    @classmethod
    def must_not_be_empty(cls, v):
        if len(v.strip()) < 30:
            raise ValueError("Text is too short to analyze meaningfully")
        return v


class ReportRequest(BaseModel):
    ats_score: int
    missing_keywords: list[str]
    rewritten_bullets: list[dict]
    ats_tips: list[str]


def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text


def extract_text_from_docx(file_bytes: bytes) -> str:
    document = docx.Document(io.BytesIO(file_bytes))
    return "\n".join(p.text for p in document.paragraphs)


def extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(json)?", "", text)
        text = re.sub(r"```$", "", text)
        text = text.strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found in model response")
    json_str = text[start:end + 1]
    return json.loads(json_str)


def normalize_result(data: dict) -> dict:
    score = data.get("ats_score", 0)
    try:
        score = int(float(score))
    except (ValueError, TypeError):
        score = 0
    score = max(0, min(100, score))

    keywords = data.get("missing_keywords", [])
    if not isinstance(keywords, list):
        keywords = []
    keywords = [str(k) for k in keywords][:15]

    bullets = data.get("rewritten_bullets", [])
    if not isinstance(bullets, list):
        bullets = []
    clean_bullets = []
    for b in bullets:
        if isinstance(b, dict) and "original" in b and "rewritten" in b:
            clean_bullets.append({
                "original": str(b["original"]),
                "rewritten": str(b["rewritten"])
            })

    tips = data.get("ats_tips", [])
    if not isinstance(tips, list):
        tips = []
    tips = [str(t) for t in tips][:8]

    return {
        "ats_score": score,
        "missing_keywords": keywords,
        "rewritten_bullets": clean_bullets,
        "ats_tips": tips
    }


@app.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    filename = file.filename.lower()
    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        if filename.endswith(".pdf"):
            text = extract_text_from_pdf(file_bytes)
        elif filename.endswith(".docx"):
            text = extract_text_from_docx(file_bytes)
        else:
            raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read this file. It may be corrupted or password-protected.")

    text = text.strip()
    if len(text) < 30:
        raise HTTPException(status_code=400, detail="Could not extract enough text from this file. Try pasting the text instead.")

    return {"text": text}


@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    prompt = f"""You are a strict ATS (Applicant Tracking System) analysis engine. You will be given a RESUME and a JOB DESCRIPTION. Your job is to evaluate how well the resume matches the job description for ATS scanning purposes.

RESUME:
{req.resume}

JOB DESCRIPTION:
{req.job_description}

Instructions:
1. Calculate an ats_score from 0 to 100 representing keyword and skill overlap between the resume and job description.
2. List missing_keywords: important skills, tools, or terms from the job description that are absent or underrepresented in the resume. Maximum 12 keywords. If the resume already covers the JD well, return fewer or none.
3. For rewritten_bullets: select up to 5 EXISTING bullet points from the resume that could be improved to better match the job description. Rewrite them to naturally include relevant keywords without fabricating experience the candidate doesn't have. If the resume has no clear bullet points (e.g. it's just a list of skills or too short), return an empty array.
4. For ats_tips: give up to 5 short, actionable, specific tips. Avoid generic advice like "tailor your resume."

Respond with ONLY a raw JSON object, no markdown formatting, no code fences, no explanation text before or after. Exact shape:
{{
  "ats_score": 72,
  "missing_keywords": ["keyword1", "keyword2"],
  "rewritten_bullets": [
    {{"original": "exact original bullet from resume", "rewritten": "improved version"}}
  ],
  "ats_tips": ["tip1", "tip2"]
}}"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    if not response.text:
        raise HTTPException(status_code=502, detail="Empty response from AI service")

    try:
        data = extract_json(response.text)
    except (ValueError, json.JSONDecodeError):
        raise HTTPException(status_code=502, detail="Could not parse AI response. Please try again.")

    return normalize_result(data)


@app.post("/generate-report")
async def generate_report(req: ReportRequest):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.75 * inch, bottomMargin=0.75 * inch)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "TitleStyle", parent=styles["Title"], fontSize=22, spaceAfter=10, textColor=colors.HexColor("#1c2733")
    )
    section_style = ParagraphStyle(
        "SectionStyle", parent=styles["Heading2"], fontSize=13, spaceBefore=20, spaceAfter=8,
        textColor=colors.HexColor("#4a5a8b")
    )
    body_style = ParagraphStyle(
        "BodyStyle", parent=styles["Normal"], fontSize=10.5, leading=15, textColor=colors.HexColor("#1c2733")
    )
    muted_style = ParagraphStyle(
        "MutedStyle", parent=styles["Normal"], fontSize=10, leading=14, textColor=colors.HexColor("#6b7280")
    )

    score_color = "#3d8b6e" if req.ats_score >= 75 else "#b8893a" if req.ats_score >= 50 else "#b8463f"
    score_label = "Strong match" if req.ats_score >= 75 else "Partial match" if req.ats_score >= 50 else "Needs work"

    score_style = ParagraphStyle(
        "ScoreStyle", parent=styles["Normal"], fontSize=30, leading=36, spaceAfter=16,
        textColor=colors.HexColor(score_color)
    )

    story = []
    story.append(Paragraph("Resume Analysis Report", title_style))
    story.append(Paragraph(f"{req.ats_score}% &nbsp;&nbsp; <font size=12 color='{score_color}'>{score_label}</font>", score_style))

    if req.missing_keywords:
        story.append(Paragraph("Missing Keywords", section_style))
        items = [ListItem(Paragraph(k, body_style), leftIndent=10) for k in req.missing_keywords]
        story.append(ListFlowable(items, bulletType="bullet", start="circle"))

    if req.rewritten_bullets:
        story.append(Paragraph("Rewritten Bullets", section_style))
        for b in req.rewritten_bullets:
            story.append(Paragraph(f"<i>Before:</i> {b.get('original', '')}", muted_style))
            story.append(Paragraph(f"<i>After:</i> {b.get('rewritten', '')}", body_style))
            story.append(Spacer(1, 10))

    if req.ats_tips:
        story.append(Paragraph("Recommendations", section_style))
        items = [ListItem(Paragraph(t, body_style), leftIndent=10) for t in req.ats_tips]
        story.append(ListFlowable(items, bulletType="bullet", start="circle"))

    doc.build(story)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=resume-analysis.pdf"}
    )