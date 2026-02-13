"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();

  const [isSignup, setIsSignup] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // 🔍 Detect recovery session
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setIsRecoveryMode(true);
      }
    };
    checkSession();
  }, []);

  // ⏳ Cooldown timer
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

    try {
      if (!email || !password) {
        toast.error("Email and password required");
        setLoading(false);
        return;
      }

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

        toast.success("Signup successful! Check email.");
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

  // ================= SEND RESET EMAIL =================
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

  // ================= UPDATE PASSWORD =================
  const handleUpdatePassword = async () => {
    if (!password || !confirmPassword) {
      toast.error("Fill both fields");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Password updated successfully!");
    setIsRecoveryMode(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#0f172a",
        padding: 20,
      }}
    >
      <Toaster position="top-right" />

      <div
        style={{
          background: "#1e293b",
          padding: 50,
          borderRadius: 18,
          width: "100%",
          maxWidth: 520,
          minHeight: 390,
          color: "white",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: 30 }}>
          {isRecoveryMode
            ? "Reset Password"
            : isSignup
            ? "Create Account"
            : "Login"}
        </h2>

        {/* ================= RECOVERY MODE ================= */}
        {isRecoveryMode ? (
          <>
            <PasswordField
              label="New Password"
              value={password}
              setValue={setPassword}
              show={showPassword}
              setShow={setShowPassword}
            />

            <PasswordField
              label="Confirm Password"
              value={confirmPassword}
              setValue={setConfirmPassword}
              show={showConfirmPassword}
              setShow={setShowConfirmPassword}
            />

            <button
              onClick={handleUpdatePassword}
              style={buttonStyle("#10b981")}
            >
              Update Password
            </button>
          </>
        ) : (
          <>
            <form
              onSubmit={handleSubmit}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              {/* EMAIL */}
              <div style={{ position: "relative" }}>
                <Mail
                  size={20}
                  style={iconLeftStyle}
                />

                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  style={inputStyle}
                />
              </div>

              {/* PASSWORD */}
              <PasswordField
                label="Password"
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
                    style={{
                      background: "none",
                      border: "none",
                      color:
                        cooldown > 0
                          ? "#64748b"
                          : "#60a5fa",
                      cursor:
                        cooldown > 0
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {cooldown > 0
                      ? `Try again in ${cooldown}s`
                      : "Forgot Password?"}
                  </button>
                </div>
              )}

              {isSignup && (
                <PasswordField
                  label="Confirm Password"
                  value={confirmPassword}
                  setValue={setConfirmPassword}
                  show={showConfirmPassword}
                  setShow={setShowConfirmPassword}
                />
              )}

              <button
                type="submit"
                disabled={loading}
                style={buttonStyle("#6366f1")}
              >
                {isSignup ? "Sign Up" : "Login"}
              </button>
            </form>

            <div style={{ marginTop: 20, textAlign: "center" }}>
              <button
                onClick={() =>
                  setIsSignup(!isSignup)
                }
                style={{
                  background: "none",
                  border: "none",
                  color: "#60a5fa",
                  cursor: "pointer",
                }}
              >
                {isSignup
                  ? "Already have an account? Login"
                  : "New user? Sign Up"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ================= COMPONENTS =================

const PasswordField = ({
  label,
  value,
  setValue,
  show,
  setShow,
}: any) => (
  <div style={{ position: "relative" }}>
    <Lock size={20} style={iconLeftStyle} />

    <input
      type={show ? "text" : "password"}
      placeholder={label}
      value={value}
      onChange={(e) =>
        setValue(e.target.value)
      }
      style={inputStyleWithEye}
    />

    <div
      onClick={() => setShow(!show)}
      style={{
        position: "absolute",
        right: 14,
        top: "50%",
        transform: "translateY(-50%)",
        cursor: "pointer",
        transition: "all 0.2s ease",
        color: "#64748b",
      }}
    >
      {show ? (
        <EyeOff size={20} />
      ) : (
        <Eye size={20} />
      )}
    </div>
  </div>
);

// ================= STYLES =================

const inputStyle = {
  width: "100%",
  padding: "14px 14px 14px 45px",
  borderRadius: 10,
  border: "none",
  boxSizing: "border-box" as const,
};

const inputStyleWithEye = {
  width: "100%",
  padding: "14px 50px 14px 45px",
  borderRadius: 10,
  border: "none",
  boxSizing: "border-box" as const,
};

const iconLeftStyle = {
  position: "absolute" as const,
  left: 14,
  top: "50%",
  transform: "translateY(-50%)",
  color: "#64748b",
};

const buttonStyle = (color: string) => ({
  width: "100%",
  padding: 14,
  background: color,
  border: "none",
  borderRadius: 10,
  color: "white",
  cursor: "pointer",
});
