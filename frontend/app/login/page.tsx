"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // ================= Neural Background =================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const nodes: any[] = [];
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

      requestAnimationFrame(draw);
    };

    draw();
  }, []);

  // ================= Cooldown Timer =================
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // ================= LOGIN / SIGNUP =================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!email || !password) {
      toast.error("Email and password required");
      setLoading(false);
      return;
    }

    try {
      if (isSignup) {
        if (password !== confirmPassword) {
          toast.error("Passwords must match");
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          toast.error(error.message);
          setLoading(false);
          return;
        }

        toast.success("Signup successful!");
        setIsSignup(false);
        setLoading(false);
        return;
      }

      const { error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      toast.error("Something went wrong");
      setLoading(false);
    }
  };

  // ================= FORGOT PASSWORD =================
  const handleForgotPassword = async () => {
    if (cooldown > 0) return;

    if (!email) {
      toast.error("Enter email first");
      return;
    }

    const { error } =
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "http://localhost:3000/login",
      });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Reset email sent!");
      setCooldown(60);
    }
  };

  return (
    <div style={wrapperStyle}>
      <Toaster position="top-right" />

      <canvas ref={canvasRef} style={canvasStyle} />

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={cardStyle}
      >
        <h2 style={{ textAlign: "center", marginBottom: 30 }}>
          {isSignup ? "Create Account" : "Login"}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <InputField
            icon={<Mail size={18} />}
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <PasswordField
            value={password}
            setValue={setPassword}
            show={showPassword}
            setShow={setShowPassword}
          />

          {!isSignup && (
            <div style={{ textAlign: "right" }}>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={cooldown > 0}
                style={forgotStyle(cooldown)}
              >
                {cooldown > 0
                  ? `Try again in ${cooldown}s`
                  : "Forgot Password?"}
              </button>
            </div>
          )}

          {isSignup && (
            <PasswordField
              value={confirmPassword}
              setValue={setConfirmPassword}
              show={showConfirmPassword}
              setShow={setShowConfirmPassword}
              placeholder="Confirm Password"
            />
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            type="submit"
            disabled={loading}
            style={buttonStyle}
          >
            {loading ? "Please wait..." : isSignup ? "Sign Up" : "Login"}
          </motion.button>
        </form>

        <div style={{ marginTop: 25, textAlign: "center" }}>
          <button
            onClick={() => setIsSignup(!isSignup)}
            style={toggleStyle}
          >
            {isSignup
              ? "Already have an account? Login"
              : "New user? Sign Up"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

const InputField = ({ icon, ...props }: any) => (
  <div style={{ position: "relative" }}>
    <div style={iconStyle}>{icon}</div>

    <input
      {...props}
      style={inputStyle}
      onFocus={(e) =>
        (e.currentTarget.style.boxShadow =
          "0 0 0 2px #6366f1")
      }
      onBlur={(e) =>
        (e.currentTarget.style.boxShadow =
          "none")
      }
    />
  </div>
);

const PasswordField = ({
  value,
  setValue,
  show,
  setShow,
  placeholder = "Password",
}: any) => (
  <div style={{ position: "relative" }}>
    <div style={iconStyle}>
      <Lock size={18} />
    </div>

    <input
      type={show ? "text" : "password"}
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      style={passwordStyle}
      onFocus={(e) =>
        (e.currentTarget.style.boxShadow =
          "0 0 0 2px #6366f1")
      }
      onBlur={(e) =>
        (e.currentTarget.style.boxShadow =
          "none")
      }
    />

    <div onClick={() => setShow(!show)} style={eyeStyle}>
      {show ? <EyeOff size={18} /> : <Eye size={18} />}
    </div>
  </div>
);

/* ================= STYLES ================= */

const wrapperStyle = {
  minHeight: "100vh",
  background: "#020617",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 20,
  position: "relative" as const,
};

const canvasStyle = {
  position: "fixed" as const,
  top: 0,
  left: 0,
  zIndex: 0,
};

const cardStyle = {
  position: "relative" as const,
  zIndex: 1,
  background: "rgba(15,23,42,0.8)",
  backdropFilter: "blur(20px)",
  borderRadius: 20,
  padding: 45,
  width: "100%",
  maxWidth: 500,
  boxShadow: "0 20px 60px rgba(99,102,241,0.3)",
  color: "white",
};

const inputStyle = {
  width: "100%",
  padding: "14px 14px 14px 45px",
  borderRadius: 12,
  border: "1px solid rgba(99,102,241,0.3)",
  background: "#0f172a",
  color: "white",
  outline: "none",
  boxSizing: "border-box" as const,
};

const passwordStyle = {
  width: "100%",
  padding: "14px 50px 14px 45px",
  borderRadius: 12,
  border: "1px solid rgba(99,102,241,0.3)",
  background: "#0f172a",
  color: "white",
  outline: "none",
  boxSizing: "border-box" as const,
};

const iconStyle = {
  position: "absolute" as const,
  left: 14,
  top: "50%",
  transform: "translateY(-50%)",
  color: "#64748b",
};

const eyeStyle = {
  position: "absolute" as const,
  right: 14,
  top: "50%",
  transform: "translateY(-50%)",
  cursor: "pointer",
  color: "#64748b",
};

const buttonStyle = {
  padding: 14,
  borderRadius: 14,
  border: "none",
  background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
};

const toggleStyle = {
  background: "none",
  border: "none",
  color: "#60a5fa",
  cursor: "pointer",
};

const forgotStyle = (cooldown: number) => ({
  background: "none",
  border: "none",
  color: cooldown > 0 ? "#64748b" : "#60a5fa",
  cursor: cooldown > 0 ? "not-allowed" : "pointer",
});
