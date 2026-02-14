# ==========================================
# HR RESUME PARSER - FINAL CLEAN VERSION
# ==========================================

import os
import io
import re
from typing import List

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

import pdfplumber
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer, WordNetLemmatizer

from supabase import create_client


# ==============================
# LOAD ENV
# ==============================

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise Exception("Supabase credentials missing in .env")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


# ==============================
# SAFE NLTK DOWNLOAD
# ==============================

for pkg in ["punkt", "stopwords", "wordnet"]:
    try:
        nltk.data.find(f"corpora/{pkg}")
    except:
        nltk.download(pkg)


# ==============================
# FASTAPI
# ==============================

app = FastAPI(title="HR Resume Parser API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================
# NLP OBJECTS
# ==============================

STOP_WORDS = set(stopwords.words("english"))
STEMMER = PorterStemmer()
LEMMATIZER = WordNetLemmatizer()

SKILLS_DB = [
    "python", "java", "sql", "react", "javascript",
    "machine learning", "nlp", "data analysis",
    "fastapi", "django"
]


# ==============================
# TEXT PROCESSING
# ==============================

def preprocess_text(text):
    text = text.lower()
    text = re.sub(r"[^a-z ]", " ", text)

    tokens = word_tokenize(text)
    tokens = [t for t in tokens if t not in STOP_WORDS]

    stemmed = [STEMMER.stem(t) for t in tokens]
    lemmatized = [LEMMATIZER.lemmatize(t) for t in stemmed]

    return lemmatized


def extract_skills(tokens):
    return list(set(tokens) & set(SKILLS_DB))


def calculate_match(resume_skills, jd_skills):
    if not jd_skills:
        return 0, []

    matched = set(resume_skills) & set(jd_skills)
    score = (len(matched) / len(jd_skills)) * 100

    return round(score, 2), list(matched)


def read_pdf_from_bytes(pdf_bytes):
    text = ""
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""
    return text


# ==============================
# ROOT
# ==============================

@app.get("/")
def root():
    return {"message": "HR Resume Parser API Running"}


# ==============================
# ANALYZE ROUTE
# ==============================

@app.post("/analyze")
async def analyze(
    resumes: List[UploadFile] = File(...),
    job_description: str = Form(...),
    hr_email: str = Form(...)
):

    jd_tokens = preprocess_text(job_description)
    jd_skills = extract_skills(jd_tokens)

    results = []

    for resume in resumes:

        pdf_bytes = await resume.read()

        raw_resume = read_pdf_from_bytes(pdf_bytes)
        resume_tokens = preprocess_text(raw_resume)
        resume_skills = extract_skills(resume_tokens)

        match_score, matched_skills = calculate_match(resume_skills, jd_skills)

        status = "ELIGIBLE" if match_score >= 50 else "NOT ELIGIBLE"
        file_url = None

        # ==============================
        # STORE ONLY ELIGIBLE
        # ==============================
        if status == "ELIGIBLE":

            file_path = f"{hr_email}/{resume.filename}"

            # Remove old file if exists
            try:
                supabase.storage.from_("resumes").remove([file_path])
            except:
                pass

            # Upload to Supabase bucket
            supabase.storage.from_("resumes").upload(
                path=file_path,
                file=pdf_bytes,
                file_options={
                    "content-type": "application/pdf",
                    "upsert": "true"
                }
            )

            # Get public URL
            file_url = supabase.storage.from_("resumes").get_public_url(file_path)

            # Check if already exists
            existing = supabase.table("eligible_resumes") \
                .select("id") \
                .eq("hr_email", hr_email) \
                .eq("resume_name", resume.filename) \
                .execute()

            if existing.data:
                # UPDATE
                supabase.table("eligible_resumes") \
                    .update({
                        "match_score": match_score,
                        "file_url": file_url
                    }) \
                    .eq("hr_email", hr_email) \
                    .eq("resume_name", resume.filename) \
                    .execute()
            else:
                # INSERT
                supabase.table("eligible_resumes") \
                    .insert({
                        "hr_email": hr_email,
                        "resume_name": resume.filename,
                        "match_score": match_score,
                        "file_url": file_url
                    }) \
                    .execute()

        results.append({
            "resume_name": resume.filename,
            "match_score": match_score,
            "matched_skills": matched_skills,
            "status": status,
            "file_url": file_url
        })

    return {"results": results}


# ==============================
# FETCH ELIGIBLE
# ==============================

@app.get("/eligible/{hr_email}")
def get_eligible(hr_email: str):

    response = supabase.table("eligible_resumes") \
        .select("*") \
        .eq("hr_email", hr_email) \
        .order("created_at", desc=True) \
        .execute()

    return {"eligible_resumes": response.data}
