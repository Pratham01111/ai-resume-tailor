from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from google import genai
import os
import json
import re
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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


def extract_json(text: str) -> dict:
    """Pull JSON out of a response even if Gemini wraps it in markdown or adds extra text."""
    text = text.strip()

    # strip markdown code fences if present
    if text.startswith("```"):
        text = re.sub(r"^```(json)?", "", text)
        text = re.sub(r"```$", "", text)
        text = text.strip()

    # find the first { and last } in case there's stray text around the JSON
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found in model response")

    json_str = text[start:end + 1]
    return json.loads(json_str)


def normalize_result(data: dict) -> dict:
    """Make sure the response always has the shape the frontend expects, even if the model is sloppy."""
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