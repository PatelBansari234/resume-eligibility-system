"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  User,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { supabase } from "@/app/lib/supabaseClient";

type ResultItem = {
  resume_name: string;
  status: "ELIGIBLE" | "NOT ELIGIBLE";
  matched_skills: string[];
};

type EligibleItem = {
  id: number;
  resume_name: string;
  match_score: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [jobDescription, setJobDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [eligibleHistory, setEligibleHistory] = useState<EligibleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  // ================= AUTH GUARD =================
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data?.user) {
        router.replace("/login");
      } else {
        setUserEmail(data.user.email || "");
        fetchEligible(data.user.email || "");
      }
    };

    checkAuth();
  }, [router]);

  // ================= LOGOUT =================
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  // ================= FETCH ELIGIBLE HISTORY =================
  const fetchEligible = async (email: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/eligible/${email}`);
      const data = await res.json();

      if (Array.isArray(data)) {
        setEligibleHistory(data);
      } else if (Array.isArray(data.results)) {
        setEligibleHistory(data.results);
      } else {
        setEligibleHistory([]);
      }
    } catch (error) {
      console.error("Error fetching eligible resumes:", error);
      setEligibleHistory([]);
    }
  };

  // ================= FILE HANDLING =================
  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;

    const pdfs = Array.from(selected).filter(
      (f) => f.type === "application/pdf"
    );

    setFiles(pdfs);
  };

  // ================= ANALYZE =================
  const handleAnalyze = async () => {
    if (!jobDescription.trim() || files.length === 0) {
      toast.error("Please enter job description and upload PDF resumes");
      return;
    }

    const formData = new FormData();
    formData.append("job_description", jobDescription);
    formData.append("hr_email", userEmail);

    files.forEach((file) => {
      formData.append("resumes", file);
    });

    try {
      setLoading(true);
      setResults([]);

      const res = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Backend error");
      }

      const data = await res.json();

      if (Array.isArray(data.results)) {
        setResults(data.results);
      } else {
        setResults([]);
      }

      fetchEligible(userEmail);
    } catch (err) {
      console.error(err);
      toast.error("Backend error. Check FastAPI server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 40,
        color: "white",
        background: "#0f172a",
      }}
    >
      <Toaster position="top-right" />

      {/* ================= NAVBAR ================= */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 30,
        }}
      >
        <h1 style={{ fontSize: 28 }}>
          Resume Eligibility Dashboard
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <div
            style={{
              background: "#1e293b",
              padding: "8px 14px",
              borderRadius: 20,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <User size={16} />
            {userEmail}
          </div>

          <button
            onClick={handleLogout}
            style={{
              padding: "8px 16px",
              background: "#ef4444",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              color: "white",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* ================= TOTAL COUNT ================= */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            background: "#1e293b",
            padding: "10px 16px",
            borderRadius: 8,
            display: "inline-block",
          }}
        >
          Total Eligible Resumes:{" "}
          <strong>{eligibleHistory.length}</strong>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 30,
        }}
      >
        {/* ================= LEFT SIDE ================= */}
        <div
          style={{
            background: "#1e293b",
            padding: 24,
            borderRadius: 16,
          }}
        >
          <h2>
            <Upload /> Upload & Analyze
          </h2>

          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste Job Description here..."
            style={{
              width: "100%",
              height: 180,
              padding: 12,
              borderRadius: 8,
              background: "#020617",
              color: "white",
              border: "1px solid #334155",
              marginBottom: 20,
            }}
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: "2px dashed #475569",
              padding: 30,
              borderRadius: 12,
              textAlign: "center",
              cursor: "pointer",
            }}
          >
            <Upload size={40} />
            <p>{files.length} PDF(s) selected</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf"
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />

          {/* ================= BUTTON WITH SPINNER ================= */}
          <button
            onClick={handleAnalyze}
            disabled={loading}
            style={{
              width: "100%",
              marginTop: 20,
              padding: 14,
              fontSize: 16,
              background: "#6366f1",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              opacity: loading ? 0.8 : 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 10,
            }}
          >
            {loading ? (
              <>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    border: "3px solid #fff",
                    borderTop: "3px solid transparent",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                Analyzing...
              </>
            ) : (
              "Analyze Resumes"
            )}
          </button>
        </div>

        {/* ================= RESULTS ================= */}
        <div
          style={{
            background: "#1e293b",
            padding: 24,
            borderRadius: 16,
          }}
        >
          <h2>
            <FileText /> Results
          </h2>

          {results.length === 0 && (
            <p style={{ opacity: 0.6, marginTop: 20 }}>
              No results yet
            </p>
          )}

          {results.map((res, idx) => (
            <div
              key={idx}
              style={{
                marginTop: 20,
                padding: 16,
                borderRadius: 12,
                background:
                  res.status === "ELIGIBLE"
                    ? "rgba(16,185,129,0.15)"
                    : "rgba(239,68,68,0.15)",
              }}
            >
              <h3>{res.resume_name}</h3>

              <p>
                {res.status === "ELIGIBLE" ? (
                  <span style={{ color: "#10b981" }}>
                    <CheckCircle size={16} /> ELIGIBLE
                  </span>
                ) : (
                  <span style={{ color: "#ef4444" }}>
                    <XCircle size={16} /> NOT ELIGIBLE
                  </span>
                )}
              </p>

              {res.status === "ELIGIBLE" && (
                <div>
                  <strong>Matched Skills:</strong>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                    }}
                  >
                    {res.matched_skills.map((s, i) => (
                      <span
                        key={i}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 12,
                          background: "#2563eb",
                          fontSize: 12,
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ================= HISTORY ================= */}
      <h2 style={{ marginTop: 40 }}>
        Previously Eligible
      </h2>

      {eligibleHistory.map((item) => (
        <div
          key={item.id}
          style={{
            marginTop: 15,
            padding: 12,
            background: "#1e293b",
            borderRadius: 8,
          }}
        >
          <strong>{item.resume_name}</strong>
          <p>Match Score: {item.match_score}%</p>
        </div>
      ))}

      {/* Spinner animation */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
