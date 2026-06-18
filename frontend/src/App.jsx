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
      const res = await axios.post("http://localhost:8000/analyze", {
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
      const res = await axios.post("http://localhost:8000/extract-text", formData, {
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
      const res = await axios.post("http://localhost:8000/generate-report", result, {
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
    if (score >= 75) return "#3d8b6e"
    if (score >= 50) return "#b8893a"
    return "#b8463f"
  }

  const scoreLabel = (score) => {
    if (score >= 75) return "Strong match"
    if (score >= 50) return "Partial match"
    return "Needs work"
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f8", color: "#1c2733", fontFamily: "'Source Serif 4', Georgia, serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');
        ::selection { background: #4a5a8b22; }
        textarea::placeholder { color: #9aa5b1; font-family: 'Inter', sans-serif; }
        textarea:focus { outline: none; border-color: #4a5a8b !important; box-shadow: 0 0 0 3px #4a5a8b14; }
        button:hover { opacity: 0.88; }
        body { margin: 0; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .skeleton { animation: pulse 1.4s ease-in-out infinite; }
        .dropzone:hover { border-color: #4a5a8b !important; background: #f0f2f8 !important; }
      `}</style>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "72px 28px 96px" }}>

        {/* Header */}
        <div style={{ marginBottom: 56 }}>
          <p style={{
            fontFamily: "'Inter', sans-serif", fontSize: 12.5, letterSpacing: 2,
            color: "#4a5a8b", textTransform: "uppercase", margin: "0 0 14px", fontWeight: 600
          }}>
            Resume analysis
          </p>
          <h1 style={{
            fontSize: 44, fontWeight: 500, letterSpacing: -0.5,
            margin: "0 0 14px", color: "#1c2733", lineHeight: 1.15
          }}>
            Tailor your resume,<br />one role at a time.
          </h1>
          <p style={{
            fontFamily: "'Inter', sans-serif", color: "#5b6675", fontSize: 15.5,
            margin: 0, maxWidth: 480, lineHeight: 1.65
          }}>
            Paste or upload your resume and a job description below. You'll get a match score, missing keywords, and rewritten bullet points.
          </p>
        </div>

        {/* Input grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <label style={{
                fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#1c2733"
              }}>
                Your resume
              </label>
              <div style={{ display: "flex", gap: 4, background: "#eef1f4", borderRadius: 7, padding: 3 }}>
                <button
                  onClick={() => setInputMode("paste")}
                  style={{
                    fontFamily: "'Inter', sans-serif", fontSize: 11.5, fontWeight: 600,
                    padding: "4px 10px", borderRadius: 5, border: "none", cursor: "pointer",
                    background: inputMode === "paste" ? "#ffffff" : "transparent",
                    color: inputMode === "paste" ? "#1c2733" : "#5b6675",
                    boxShadow: inputMode === "paste" ? "0 1px 2px rgba(0,0,0,0.08)" : "none"
                  }}
                >
                  Paste
                </button>
                <button
                  onClick={() => setInputMode("upload")}
                  style={{
                    fontFamily: "'Inter', sans-serif", fontSize: 11.5, fontWeight: 600,
                    padding: "4px 10px", borderRadius: 5, border: "none", cursor: "pointer",
                    background: inputMode === "upload" ? "#ffffff" : "transparent",
                    color: inputMode === "upload" ? "#1c2733" : "#5b6675",
                    boxShadow: inputMode === "upload" ? "0 1px 2px rgba(0,0,0,0.08)" : "none"
                  }}
                >
                  Upload
                </button>
              </div>
            </div>

            {inputMode === "paste" ? (
              <textarea
                value={resume}
                onChange={e => setResume(e.target.value)}
                placeholder="Paste your resume text here..."
                style={{
                  width: "100%", height: 300, padding: 18, resize: "none",
                  background: "#ffffff", border: "1px solid #d8dee5", borderRadius: 10,
                  color: "#1c2733", fontFamily: "'Inter', sans-serif", fontSize: 13.5,
                  lineHeight: 1.65, boxSizing: "border-box", transition: "border-color .15s, box-shadow .15s"
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
                  width: "100%", height: 300, borderRadius: 10, boxSizing: "border-box",
                  border: "1.5px dashed #c4cad3", background: "#fafbfc",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "border-color .15s, background .15s", textAlign: "center", padding: 24
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  onChange={e => handleFileUpload(e.target.files[0])}
                  style={{ display: "none" }}
                />
                {extracting ? (
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: "#5b6675" }}>
                    Reading {fileName}...
                  </p>
                ) : fileName && resume ? (
                  <>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 600, color: "#1c2733", margin: "0 0 4px" }}>
                      {fileName}
                    </p>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: "#3d8b6e", margin: 0 }}>
                      ✓ Text extracted — click to replace
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 600, color: "#1c2733", margin: "0 0 4px" }}>
                      Drop your resume here
                    </p>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: "#9aa5b1", margin: 0 }}>
                      or click to browse — PDF or DOCX
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          <div>
            <label style={{
              fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600,
              color: "#1c2733", marginBottom: 10, display: "block"
            }}>
              Job description
            </label>
            <textarea
              value={jd}
              onChange={e => setJd(e.target.value)}
              placeholder="Paste the job description here..."
              style={{
                width: "100%", height: 300, padding: 18, resize: "none",
                background: "#ffffff", border: "1px solid #d8dee5", borderRadius: 10,
                color: "#1c2733", fontFamily: "'Inter', sans-serif", fontSize: 13.5,
                lineHeight: 1.65, boxSizing: "border-box", transition: "border-color .15s, box-shadow .15s"
              }}
            />
          </div>
        </div>

        {error && (
          <div style={{
            background: "#fbeeed", border: "1px solid #e8c4c1", color: "#9c3a33",
            padding: "12px 16px", borderRadius: 8, fontSize: 13.5, marginBottom: 22,
            fontFamily: "'Inter', sans-serif"
          }}>
            {error}
          </div>
        )}

        <button
          onClick={analyze}
          disabled={loading}
          style={{
            padding: "14px 30px", background: loading ? "#c4cad3" : "#1c2733",
            color: "#ffffff", border: "none", borderRadius: 9,
            fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14,
            cursor: loading ? "default" : "pointer", transition: "opacity .15s"
          }}
        >
          {loading ? "Analyzing..." : "Analyze resume"}
        </button>

        {/* Loading skeleton */}
        {loading && (
          <div style={{ marginTop: 56, display: "flex", flexDirection: "column", gap: 18 }}>
            {[120, 90, 160].map((h, i) => (
              <div key={i} className="skeleton" style={{
                background: "#ffffff", border: "1px solid #e1e6eb", borderRadius: 14,
                padding: 32, height: h
              }}>
                <div style={{ width: "30%", height: 12, background: "#eef1f4", borderRadius: 4, marginBottom: 16 }} />
                <div style={{ width: "60%", height: 20, background: "#eef1f4", borderRadius: 4 }} />
              </div>
            ))}
          </div>
        )}

        {result && !loading && (
          <div style={{ marginTop: 56, display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Score */}
            <div style={{
              background: "#ffffff", border: "1px solid #e1e6eb", borderRadius: 14,
              padding: 32
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <p style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600,
                  color: "#5b6675", margin: 0
                }}>
                  ATS match score
                </p>
                <button
                  onClick={downloadResults}
                  disabled={downloadingPdf}
                  style={{
                    fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 600,
                    color: "#4a5a8b", background: "none", border: "1px solid #d8dee5",
                    borderRadius: 8, cursor: downloadingPdf ? "default" : "pointer", padding: "6px 12px"
                  }}
                >
                  {downloadingPdf ? "Generating..." : "Download PDF report"}
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 20 }}>
                <span style={{ fontSize: 52, fontWeight: 500, color: "#1c2733", lineHeight: 1 }}>
                  {result.ats_score}%
                </span>
                <span style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600,
                  color: scoreColor(result.ats_score), marginLeft: "auto",
                  background: `${scoreColor(result.ats_score)}14`,
                  padding: "6px 14px", borderRadius: 20
                }}>
                  {scoreLabel(result.ats_score)}
                </span>
              </div>
              <div style={{ width: "100%", height: 8, background: "#eef1f4", borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${result.ats_score}%`,
                  background: scoreColor(result.ats_score), transition: "width .6s ease",
                  borderRadius: 4
                }} />
              </div>
            </div>

            {/* Missing keywords */}
            {result.missing_keywords.length > 0 && (
              <div style={{ background: "#ffffff", border: "1px solid #e1e6eb", borderRadius: 14, padding: 32 }}>
                <p style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600,
                  color: "#5b6675", margin: "0 0 18px"
                }}>
                  Missing keywords
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {result.missing_keywords.map((k, i) => (
                    <span key={i} style={{
                      padding: "7px 14px", background: "#fbeeed", color: "#9c3a33",
                      fontFamily: "'Inter', sans-serif", fontSize: 13, borderRadius: 20,
                      border: "1px solid #f0d5d2"
                    }}>
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Rewritten bullets */}
            {result.rewritten_bullets.length > 0 && (
              <div style={{ background: "#ffffff", border: "1px solid #e1e6eb", borderRadius: 14, padding: 32 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <p style={{
                    fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600,
                    color: "#5b6675", margin: 0
                  }}>
                    Rewritten bullets
                  </p>
                  <button
                    onClick={copyAllBullets}
                    style={{
                      fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 600,
                      color: copiedAll ? "#3d8b6e" : "#4a5a8b", background: "none",
                      border: "none", cursor: "pointer", padding: "4px 8px"
                    }}
                  >
                    {copiedAll ? "✓ Copied all" : "Copy all"}
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {result.rewritten_bullets.map((b, i) => (
                    <div key={i} style={{
                      paddingBottom: i < result.rewritten_bullets.length - 1 ? 18 : 0,
                      borderBottom: i < result.rewritten_bullets.length - 1 ? "1px solid #eef1f4" : "none"
                    }}>
                      <p style={{
                        margin: "0 0 8px", fontSize: 14, color: "#9aa5b1",
                        fontFamily: "'Inter', sans-serif", lineHeight: 1.6,
                        textDecoration: "line-through", textDecorationColor: "#d8dee5"
                      }}>
                        {b.original}
                      </p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <p style={{
                          margin: 0, fontSize: 15, color: "#1c2733", lineHeight: 1.65
                        }}>
                          {b.rewritten}
                        </p>
                        <button
                          onClick={() => copyToClipboard(b.rewritten, i)}
                          style={{
                            fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600,
                            color: copiedIndex === i ? "#3d8b6e" : "#9aa5b1", background: "none",
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
              <div style={{ background: "#ffffff", border: "1px solid #e1e6eb", borderRadius: 14, padding: 32 }}>
                <p style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600,
                  color: "#5b6675", margin: "0 0 18px"
                }}>
                  Recommendations
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {result.ats_tips.map((t, i) => (
                    <div key={i} style={{ display: "flex", gap: 12 }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: "50%", background: "#4a5a8b",
                        flexShrink: 0, marginTop: 8
                      }} />
                      <p style={{
                        margin: 0, fontSize: 14.5, color: "#3a4452",
                        fontFamily: "'Inter', sans-serif", lineHeight: 1.65
                      }}>
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