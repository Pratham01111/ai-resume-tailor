from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
import os
import json
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

@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    prompt = f"""You are an ATS expert. Analyze this resume against the job description.

RESUME:
{req.resume}

JOB DESCRIPTION:
{req.job_description}

Return ONLY valid JSON in this exact format, nothing else, no markdown formatting:
{{
  "ats_score": 72,
  "missing_keywords": ["keyword1", "keyword2"],
  "rewritten_bullets": [
    {{"original": "old bullet", "rewritten": "new bullet"}}
  ],
  "ats_tips": ["tip1", "tip2"]
}}"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
    text = response.text.strip()

    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]

    return json.loads(text.strip())