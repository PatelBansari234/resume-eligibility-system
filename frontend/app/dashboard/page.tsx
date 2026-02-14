"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, User } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { supabase } from "@/app/lib/supabaseClient";
import { motion } from "framer-motion";
import {
  CircularProgressbar,
  buildStyles,
} from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

type ResultItem = {
  resume_name: string;
  status: "ELIGIBLE" | "NOT ELIGIBLE";
  matched_skills: string[];
  match_score: number;
};

type EligibleItem = {
  id: number;
  resume_name: string;
  match_score: number;
  file_url?: string;
};

export default function DashboardPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [jobDescription, setJobDescription] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [eligibleHistory, setEligibleHistory] = useState<EligibleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  // ================= AUTH GUARD =================
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.replace("/login");
      } else {
        const email = data.user.email || "";
        setUserEmail(email);
        fetchEligible(email);
      }
    };
    checkAuth();
  }, [router]);

  const fetchEligible = async (email: string) => {
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/eligible/${email}`
      );
      const data = await res.json();
      setEligibleHistory(data.eligible_resumes || []);
    } catch {
      setEligibleHistory([]);
    }
  };

  // ================= LOGOUT =================
  const handleLogout = async () => {
    setIsLoggingOut(true);

    setTimeout(async () => {
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    }, 800);
  };

  // ================= Neural Background =================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const nodes: {
      x: number;
      y: number;
      dx: number;
      dy: number;
    }[] = [];

    for (let i = 0; i < 70; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        dx: (Math.random() - 0.5) * 0.6,
        dy: (Math.random() - 0.5) * 0.6,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      nodes.forEach((node, i) => {
        node.x += node.dx;
        node.y += node.dy;

        if (node.x < 0 || node.x > canvas.width) node.dx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.dy *= -1;

        ctx.beginPath();
        ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "#6366f1";
        ctx.fill();

        for (let j = i + 1; j < nodes.length; j++) {
          const dx = node.x - nodes[j].x;
          const dy = node.y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = "rgba(99,102,241,0.2)";
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  // ================= ANALYZE =================
  const handleAnalyze = async () => {
    if (!jobDescription.trim() || files.length === 0) {
      toast.error("Enter JD and upload resumes");
      return;
    }

    const formData = new FormData();
    formData.append("job_description", jobDescription);
    formData.append("hr_email", userEmail);
    files.forEach((file) => formData.append("resumes", file));

    try {
      setLoading(true);
      const res = await fetch(
        "http://127.0.0.1:8000/analyze",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();
      setResults(data.results || []);
      fetchEligible(userEmail);
      toast.success("Analysis complete 🚀");
    } catch {
      toast.error("Backend error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#e2e8f0",
        position: "relative",
      }}
    >
      <Toaster />

      {/* Background Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 0,
        }}
      />

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{
          opacity: isLoggingOut ? 0 : 1,
          y: isLoggingOut ? -20 : 0,
        }}
        transition={{ duration: 0.8 }}
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "40px 20px",
        }}
      >
        {/* NAVBAR */}
        <div
          style={{
            background: "rgba(15,23,42,0.7)",
            backdropFilter: "blur(15px)",
            borderRadius: "20px",
            padding: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px",
          }}
        >
          <h2>🧠 AI Resume Dashboard</h2>

          <div
            style={{
              display: "flex",
              gap: "15px",
              alignItems: "center",
            }}
          >
            <User size={18} />
            {userEmail}

            <button
              onClick={handleLogout}
              style={{
                padding: "8px 14px",
                borderRadius: "12px",
                border: "none",
                background: "#ef4444",
                color: "white",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(450px, 1fr))",
            gap: "30px",
          }}
        >
          {/* Upload */}
          <div
            style={{
              background: "rgba(15,23,42,0.7)",
              backdropFilter: "blur(20px)",
              borderRadius: "20px",
              padding: "30px",
            }}
          >
            <h3>Upload & Analyze</h3>

            <textarea
              value={jobDescription}
              onChange={(
                e: React.ChangeEvent<HTMLTextAreaElement>
              ) => setJobDescription(e.target.value)}
              placeholder="Paste Job Description..."
              style={{
                width: "100%",
                minHeight: "160px",
                padding: "18px",
                borderRadius: "16px",
                marginTop: "20px",
                background: "#0f172a",
                border:
                  "1px solid rgba(99,102,241,0.4)",
                color: "#e2e8f0",
                boxSizing: "border-box",
              }}
            />

            <div
              onClick={() =>
                fileInputRef.current?.click()
              }
              style={{
                marginTop: "20px",
                border: "2px dashed #475569",
                padding: "25px",
                borderRadius: "16px",
                textAlign: "center",
                cursor: "pointer",
              }}
            >
              <Upload size={30} />
              <p>{files.length} file(s) selected</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              hidden
              multiple
              accept=".pdf"
              onChange={(
                e: React.ChangeEvent<HTMLInputElement>
              ) =>
                setFiles(
                  Array.from(e.target.files || [])
                )
              }
            />

            <button
              onClick={handleAnalyze}
              style={{
                marginTop: "20px",
                padding: "14px",
                width: "100%",
                borderRadius: "16px",
                border: "none",
                background:
                  "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "white",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              {loading ? "Analyzing..." : "Analyze"}
            </button>
          </div>

          {/* Results */}
          <div
            style={{
              background: "rgba(15,23,42,0.7)",
              backdropFilter: "blur(20px)",
              borderRadius: "20px",
              padding: "30px",
            }}
          >
            <h3>Results</h3>

            {results.map((r, i) => (
              <div
                key={i}
                style={{
                  marginTop: "20px",
                  padding: "15px",
                  borderRadius: "15px",
                  background:
                    r.status === "ELIGIBLE"
                      ? "rgba(16,185,129,0.2)"
                      : "rgba(239,68,68,0.2)",
                }}
              >
                <h4>{r.resume_name}</h4>

                <div
                  style={{ width: 90, height: 90 }}
                >
                  <CircularProgressbar
                    value={r.match_score}
                    text={`${r.match_score}%`}
                    styles={buildStyles({
                      pathColor:
                        r.status === "ELIGIBLE"
                          ? "#10b981"
                          : "#ef4444",
                      textColor: "#e2e8f0",
                    })}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Eligible History */}
        <div
          style={{
            marginTop: "40px",
            background: "rgba(15,23,42,0.7)",
            backdropFilter: "blur(20px)",
            borderRadius: "20px",
            padding: "30px",
          }}
        >
          <h3>📂 Previously Eligible</h3>

          <div
            style={{
              marginTop: "20px",
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "20px",
            }}
          >
            {eligibleHistory.map((item) => (
              <div
                key={item.id}
                style={{
                  background:
                    "rgba(30,41,59,0.6)",
                  padding: "20px",
                  borderRadius: "16px",
                }}
              >
                <h4>{item.resume_name}</h4>
                <p>
                  Match Score:{" "}
                  {item.match_score}%
                </p>

                {item.file_url && (
                  <a
                    href={item.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: "10px",
                      padding: "8px 12px",
                      borderRadius: "10px",
                      background:
                        "linear-gradient(135deg,#6366f1,#8b5cf6)",
                      color: "white",
                      textDecoration: "none",
                    }}
                  >
                    View Resume
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Logout Overlay */}
      {isLoggingOut && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(2,6,23,0.95)",
            backdropFilter: "blur(12px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
            color: "white",
            fontSize: "22px",
            fontWeight: "600",
          }}
        >
          🚀 Logging out...
        </motion.div>
      )}
    </div>
  );
}
