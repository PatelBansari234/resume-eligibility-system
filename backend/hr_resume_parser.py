# ==========================================
# HR RESUME PARSER - FINAL STABLE VERSION
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

try:
    nltk.data.find("tokenizers/punkt")
except:
    nltk.download("punkt")

try:
    nltk.data.find("corpora/stopwords")
except:
    nltk.download("stopwords")

try:
    nltk.data.find("corpora/wordnet")
except:
    nltk.download("wordnet")

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
# LEVENSHTEIN DISTANCE
# ==============================

def levenshtein_distance(a, b):
    dp = [[0]*(len(b)+1) for _ in range(len(a)+1)]

    for i in range(len(a)+1):
        dp[i][0] = i
    for j in range(len(b)+1):
        dp[0][j] = j

    for i in range(1, len(a)+1):
        for j in range(1, len(b)+1):
            cost = 0 if a[i-1] == b[j-1] else 1
            dp[i][j] = min(
                dp[i-1][j] + 1,
                dp[i][j-1] + 1,
                dp[i-1][j-1] + cost
            )
    return dp[-1][-1]


def correct_spelling(word):
    distances = [(skill, levenshtein_distance(word, skill)) for skill in SKILLS_DB]
    return min(distances, key=lambda x: x[1])[0]

# ==============================
# TEXT PREPROCESSING
# ==============================

def preprocess_text(text):
    text = text.lower()
    text = re.sub(r"[^a-z ]", " ", text)

    tokens = word_tokenize(text)
    tokens = [t for t in tokens if t not in STOP_WORDS]

    stemmed = [STEMMER.stem(t) for t in tokens]
    lemmatized = [LEMMATIZER.lemmatize(t) for t in stemmed]

    return lemmatized

# ==============================
# PDF READER
# ==============================

def read_pdf_from_bytes(pdf_bytes):
    text = ""
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""
    return text

# ==============================
# SKILL EXTRACTION
# ==============================

def extract_skills(tokens):
    found = set()

    for word in tokens:
        corrected = correct_spelling(word)
        if corrected in SKILLS_DB:
            found.add(corrected)

    return list(found)

# ==============================
# MATCH CALCULATION (NO COSINE)
# ==============================

def calculate_match(resume_skills, jd_skills):

    if len(jd_skills) == 0:
        return 0

    matched = set(resume_skills) & set(jd_skills)

    score = (len(matched) / len(jd_skills)) * 100

    return round(score, 2), list(matched)

# ==============================
# ROOT ROUTE (Fix 404 issue)
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

        # Store only eligible
        if status == "ELIGIBLE":

            supabase.table("eligible_resumes").insert({
                "hr_email": hr_email,
                "resume_name": resume.filename,
                "match_score": match_score,
                "file_url": "stored_locally"  # You can upgrade later to storage bucket
            }).execute()

        results.append({
            "resume_name": resume.filename,
            "match_score": match_score,
            "matched_skills": matched_skills,
            "status": status
        })

    return {"results": results}

# ==============================
# FETCH PREVIOUS ELIGIBLE
# ==============================

@app.get("/eligible/{hr_email}")
def get_eligible(hr_email: str):

    response = supabase.table("eligible_resumes") \
        .select("*") \
        .eq("hr_email", hr_email) \
        .execute()

    return {"eligible_resumes": response.data}
