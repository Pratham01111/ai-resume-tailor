import { useState, useRef } from "react"
import axios from "axios"

export default function App() {
  const [resume, setResume] = useState("")
  const [jd, setJd] = useState("")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const [inputMode, setInputMode] = useState("paste") // "paste" or "upload"
  const [fileName, setFileName] = useState("")
  const [extracting, setExtracting] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const fileInputRef = useRef(null)

  const analyze = async () => {
    if (!resume.trim() || !jd.trim()) {
      setError("Both fields are required before analyzing.")
      return
    }
    setError("")
    setLoading(true)
    setResult(null)
    try {
      const res = await axios.post("https://ai-resume-tailor-mhrw.onrender.com/analyze", {
        resume,
        job_description: jd
      })
      setResult(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || "Something went wrong. Check that the backend is running.")
    }
    setLoading(false)
  }

  const handleFileUpload = async (file) => {
    if (!file) return
    const validTypes = [".pdf", ".docx"]
    const isValid = validTypes.some(ext => file.name.toLowerCase().endsWith(ext))
    if (!isValid) {
      setError("Only PDF and DOCX files are supported.")
      return
    }

    setError("")
    setExtracting(true)
    setFileName(file.name)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await axios.post("https://ai-resume-tailor-mhrw.onrender.com/extract-text", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })
      setResume(res.data.text)
    } catch (e) {
      setError(e.response?.data?.detail || "Could not read this file.")
      setFileName("")
    }
    setExtracting(false)
  }

  const copyToClipboard = async (text, index) => {
    await navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 1500)
  }

  const copyAllBullets = async () => {
    const allText = result.rewritten_bullets.map(b => b.rewritten).join("\n\n")
    await navigator.clipboard.writeText(allText)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 1500)
  }

  const downloadResults = async () => {
    setDownloadingPdf(true)
    try {
      const res = await axios.post("https://ai-resume-tailor-mhrw.onrender.com/generate-report", result, {
        responseType: "blob"
      })
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }))
      const a = document.createElement("a")
      a.href = url
      a.download = "resume-analysis.pdf"
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError("Could not generate the PDF report. Try again.")
    }
    setDownloadingPdf(false)
  }

  const scoreColor = (score) => {
    if (score >= 75) return "#34d399"
    if (score >= 50) return "#fbbf24"
    return "#fb7185"
  }

  const scoreGradient = (score) => {
    if (score >= 75) return "linear-gradient(90deg, #22d3ee, #34d399)"
    if (score >= 50) return "linear-gradient(90deg, #fbbf24, #fb923c)"
    return "linear-gradient(90deg, #fb7185, #f43f5e)"
  }

  const scoreLabel = (score) => {
    if (score >= 75) return "Strong match"
    if (score >= 50) return "Partial match"
    return "Needs work"
  }

  // shared styles
  const glassCard = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 32,
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    boxShadow: "0 8px 40px rgba(0,0,0,0.28)"
  }
  const labelCap = {
    fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700,
    letterSpacing: 1.4, textTransform: "uppercase", color: "#8b8ba7", margin: 0
  }

  return (
    <div style={{
      minHeight: "100vh", position: "relative", overflow: "hidden",
      background: "#07070d", color: "#ececf5",
      fontFamily: "'Inter', -apple-system, sans-serif"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #07070d; }
        ::selection { background: rgba(124,58,237,0.35); }
        textarea::placeholder { color: #6b6b85; }
        textarea:focus { outline: none; border-color: rgba(139,92,246,0.7) !important; box-shadow: 0 0 0 3px rgba(139,92,246,0.18) !important; }
        button { transition: transform .18s ease, opacity .18s ease, box-shadow .18s ease, background .18s ease; }
        .cta:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 34px rgba(124,58,237,0.5); }
        .cta:active:not(:disabled) { transform: translateY(0); }
        .ghost-btn:hover { border-color: rgba(139,92,246,0.6); color: #c4b5fd; }
        .chip { transition: transform .15s ease; }
        .chip:hover { transform: translateY(-2px); }
        .card-in { animation: cardIn .55s cubic-bezier(.2,.7,.2,1) both; }
        .dropzone:hover { border-color: rgba(139,92,246,0.6) !important; background: rgba(139,92,246,0.06) !important; }
        @keyframes cardIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
        .skeleton { animation: pulse 1.4s ease-in-out infinite; }
        @keyframes float1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(60px,-40px) scale(1.15); } }
        @keyframes float2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-50px,50px) scale(1.1); } }
        @keyframes float3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,30px) scale(1.2); } }
        .orb { position: fixed; border-radius: 50%; filter: blur(90px); opacity: 0.5; pointer-events: none; z-index: 0; }
        @keyframes shimmer { to { background-position: 200% center; } }
        .grad-text {
          background: linear-gradient(100deg, #a78bfa, #22d3ee, #f0abfc, #a78bfa);
          background-size: 200% auto;
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 6s linear infinite;
        }
        @media (max-width: 720px) { .input-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* Animated gradient orbs */}
      <div className="orb" style={{ width: 480, height: 480, top: -120, left: -80, background: "#7c3aed", animation: "float1 16s ease-in-out infinite" }} />
      <div className="orb" style={{ width: 420, height: 420, top: 200, right: -120, background: "#06b6d4", animation: "float2 20s ease-in-out infinite" }} />
      <div className="orb" style={{ width: 360, height: 360, bottom: -100, left: "35%", background: "#db2777", animation: "float3 18s ease-in-out infinite", opacity: 0.35 }} />

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "88px 24px 110px", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: 56 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 22,
            padding: "7px 15px", borderRadius: 999,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)"
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 10px #34d399" }} />
            <span style={{ fontSize: 12.5, letterSpacing: 0.6, color: "#c9c9de", fontWeight: 600 }}>
              AI-powered resume analysis
            </span>
          </div>
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 60, fontWeight: 700, letterSpacing: -1.5,
            margin: "0 0 18px", lineHeight: 1.05
          }}>
            Tailor your resume,<br />
            <span className="grad-text">land the interview.</span>
          </h1>
          <p style={{
            color: "#a1a1b8", fontSize: 17, margin: 0, maxWidth: 540, lineHeight: 1.65
          }}>
            Paste or upload your resume and a job description. Get an instant match score,
            missing keywords, and rewritten bullet points that beat the ATS.
          </p>
        </div>

        {/* Input grid */}
        <div className="input-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: "#ececf5" }}>
                Your resume
              </label>
              <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 4, border: "1px solid rgba(255,255,255,0.07)" }}>
                {["paste", "upload"].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setInputMode(mode)}
                    style={{
                      fontSize: 12, fontWeight: 600, textTransform: "capitalize",
                      padding: "5px 13px", borderRadius: 7, border: "none", cursor: "pointer",
                      background: inputMode === mode ? "linear-gradient(135deg, #7c3aed, #6366f1)" : "transparent",
                      color: inputMode === mode ? "#fff" : "#9a9ab5",
                      boxShadow: inputMode === mode ? "0 4px 14px rgba(124,58,237,0.4)" : "none"
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {inputMode === "paste" ? (
              <textarea
                value={resume}
                onChange={e => setResume(e.target.value)}
                placeholder="Paste your resume text here..."
                style={{
                  width: "100%", height: 300, padding: 18, resize: "none",
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14,
                  color: "#ececf5", fontFamily: "'Inter', sans-serif", fontSize: 14,
                  lineHeight: 1.65, transition: "border-color .18s, box-shadow .18s"
                }}
              />
            ) : (
              <div
                className="dropzone"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  handleFileUpload(e.dataTransfer.files[0])
                }}
                style={{
                  width: "100%", height: 300, borderRadius: 14,
                  border: "1.5px dashed rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.02)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "border-color .18s, background .18s", textAlign: "center", padding: 24
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  onChange={e => handleFileUpload(e.target.files[0])}
                  style={{ display: "none" }}
                />
                <div style={{
                  width: 46, height: 46, borderRadius: 12, marginBottom: 14,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(6,182,212,0.25))",
                  border: "1px solid rgba(255,255,255,0.12)", fontSize: 20
                }}>
                  ⬆
                </div>
                {extracting ? (
                  <p style={{ fontSize: 14, color: "#a1a1b8", margin: 0 }}>
                    Reading {fileName}...
                  </p>
                ) : fileName && resume ? (
                  <>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#ececf5", margin: "0 0 4px" }}>
                      {fileName}
                    </p>
                    <p style={{ fontSize: 13, color: "#34d399", margin: 0 }}>
                      ✓ Text extracted — click to replace
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#ececf5", margin: "0 0 4px" }}>
                      Drop your resume here
                    </p>
                    <p style={{ fontSize: 13, color: "#7c7c96", margin: 0 }}>
                      or click to browse — PDF or DOCX
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: 14, fontWeight: 600, color: "#ececf5", marginBottom: 12, display: "block" }}>
              Job description
            </label>
            <textarea
              value={jd}
              onChange={e => setJd(e.target.value)}
              placeholder="Paste the job description here..."
              style={{
                width: "100%", height: 300, padding: 18, resize: "none",
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14,
                color: "#ececf5", fontFamily: "'Inter', sans-serif", fontSize: 14,
                lineHeight: 1.65, transition: "border-color .18s, box-shadow .18s"
              }}
            />
          </div>
        </div>

        {error && (
          <div style={{
            background: "rgba(251,113,133,0.1)", border: "1px solid rgba(251,113,133,0.3)", color: "#fda4af",
            padding: "13px 18px", borderRadius: 12, fontSize: 14, marginBottom: 22
          }}>
            {error}
          </div>
        )}

        <button
          className="cta"
          onClick={analyze}
          disabled={loading}
          style={{
            padding: "15px 34px",
            background: loading ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #8b5cf6, #6366f1)",
            color: "#fff", border: "none", borderRadius: 12,
            fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 15,
            cursor: loading ? "default" : "pointer",
            boxShadow: loading ? "none" : "0 8px 26px rgba(124,58,237,0.4)"
          }}
        >
          {loading ? "Analyzing..." : "Analyze resume  →"}
        </button>

        {/* Loading skeleton */}
        {loading && (
          <div style={{ marginTop: 56, display: "flex", flexDirection: "column", gap: 18 }}>
            {[120, 90, 160].map((h, i) => (
              <div key={i} className="skeleton" style={{ ...glassCard, height: h }}>
                <div style={{ width: "30%", height: 12, background: "rgba(255,255,255,0.08)", borderRadius: 6, marginBottom: 16 }} />
                <div style={{ width: "60%", height: 20, background: "rgba(255,255,255,0.08)", borderRadius: 6 }} />
              </div>
            ))}
          </div>
        )}

        {result && !loading && (
          <div style={{ marginTop: 56, display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Score */}
            <div className="card-in" style={{ ...glassCard, animationDelay: "0s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <p style={labelCap}>ATS match score</p>
                <button
                  className="ghost-btn"
                  onClick={downloadResults}
                  disabled={downloadingPdf}
                  style={{
                    fontSize: 13, fontWeight: 600, color: "#c4b5fd",
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.14)",
                    borderRadius: 10, cursor: downloadingPdf ? "default" : "pointer", padding: "8px 14px"
                  }}
                >
                  {downloadingPdf ? "Generating..." : "↓ Download PDF"}
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 22 }}>
                <span style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 64, fontWeight: 700, lineHeight: 1,
                  background: scoreGradient(result.ats_score),
                  WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent"
                }}>
                  {result.ats_score}%
                </span>
                <span style={{
                  fontSize: 13, fontWeight: 600, marginLeft: "auto",
                  color: scoreColor(result.ats_score),
                  background: `${scoreColor(result.ats_score)}1f`,
                  border: `1px solid ${scoreColor(result.ats_score)}44`,
                  padding: "7px 16px", borderRadius: 999
                }}>
                  {scoreLabel(result.ats_score)}
                </span>
              </div>
              <div style={{ width: "100%", height: 10, background: "rgba(255,255,255,0.07)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${result.ats_score}%`,
                  background: scoreGradient(result.ats_score), transition: "width .8s cubic-bezier(.2,.7,.2,1)",
                  borderRadius: 6, boxShadow: `0 0 16px ${scoreColor(result.ats_score)}88`
                }} />
              </div>
            </div>

            {/* Missing keywords */}
            {result.missing_keywords.length > 0 && (
              <div className="card-in" style={{ ...glassCard, animationDelay: ".08s" }}>
                <p style={{ ...labelCap, marginBottom: 20 }}>Missing keywords</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {result.missing_keywords.map((k, i) => (
                    <span key={i} className="chip" style={{
                      padding: "8px 15px",
                      background: "rgba(251,113,133,0.1)", color: "#fda4af",
                      fontSize: 13, fontWeight: 500, borderRadius: 999,
                      border: "1px solid rgba(251,113,133,0.28)"
                    }}>
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Rewritten bullets */}
            {result.rewritten_bullets.length > 0 && (
              <div className="card-in" style={{ ...glassCard, animationDelay: ".16s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
                  <p style={labelCap}>Rewritten bullets</p>
                  <button
                    onClick={copyAllBullets}
                    style={{
                      fontSize: 13, fontWeight: 600,
                      color: copiedAll ? "#34d399" : "#c4b5fd", background: "none",
                      border: "none", cursor: "pointer", padding: "4px 8px"
                    }}
                  >
                    {copiedAll ? "✓ Copied all" : "Copy all"}
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {result.rewritten_bullets.map((b, i) => (
                    <div key={i} style={{
                      paddingBottom: i < result.rewritten_bullets.length - 1 ? 20 : 0,
                      borderBottom: i < result.rewritten_bullets.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none"
                    }}>
                      <p style={{
                        margin: "0 0 8px", fontSize: 14, color: "#6b6b85",
                        lineHeight: 1.6, textDecoration: "line-through", textDecorationColor: "rgba(255,255,255,0.2)"
                      }}>
                        {b.original}
                      </p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <p style={{ margin: 0, fontSize: 15, color: "#ececf5", lineHeight: 1.65 }}>
                          {b.rewritten}
                        </p>
                        <button
                          onClick={() => copyToClipboard(b.rewritten, i)}
                          style={{
                            fontSize: 12.5, fontWeight: 600,
                            color: copiedIndex === i ? "#34d399" : "#8b8ba7", background: "none",
                            border: "none", cursor: "pointer", flexShrink: 0, padding: "2px 6px",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {copiedIndex === i ? "✓" : "Copy"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            {result.ats_tips.length > 0 && (
              <div className="card-in" style={{ ...glassCard, animationDelay: ".24s" }}>
                <p style={{ ...labelCap, marginBottom: 20 }}>Recommendations</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {result.ats_tips.map((t, i) => (
                    <div key={i} style={{ display: "flex", gap: 14 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: "linear-gradient(135deg, #8b5cf6, #22d3ee)",
                        flexShrink: 0, marginTop: 8, boxShadow: "0 0 10px rgba(139,92,246,0.6)"
                      }} />
                      <p style={{ margin: 0, fontSize: 15, color: "#c9c9de", lineHeight: 1.65 }}>
                        {t}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
