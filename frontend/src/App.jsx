import { useState } from "react"
import axios from "axios"

export default function App() {
  const [resume, setResume] = useState("")
  const [jd, setJd] = useState("")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const analyze = async () => {
    if (!resume.trim() || !jd.trim()) {
      alert("Please paste both your resume and the job description")
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await axios.post("http://localhost:8000/analyze", {
        resume,
        job_description: jd
      })
      setResult(res.data)
    } catch (e) {
      alert("Error — check your backend is running")
    }
    setLoading(false)
  }

  const scoreColor = (score) => {
    if (score >= 75) return "bg-emerald-500"
    if (score >= 50) return "bg-amber-500"
    return "bg-red-500"
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-semibold text-slate-900 mb-1">AI Resume Tailor</h1>
        <p className="text-slate-500 mb-8">Paste your resume and a job description to get an ATS score and tailored rewrites.</p>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Your resume</label>
            <textarea
              value={resume}
              onChange={e => setResume(e.target.value)}
              placeholder="Paste your resume text here..."
              className="w-full h-72 p-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Job description</label>
            <textarea
              value={jd}
              onChange={e => setJd(e.target.value)}
              placeholder="Paste the job description here..."
              className="w-full h-72 p-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
            />
          </div>
        </div>

        <button
          onClick={analyze}
          disabled={loading}
          className="px-6 py-3 bg-slate-900 text-white rounded-xl font-medium text-sm hover:bg-slate-800 disabled:opacity-50 transition"
        >
          {loading ? "Analyzing..." : "Analyze resume"}
        </button>

        {result && (
          <div className="mt-10 space-y-8">
            {/* Score */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-sm font-medium text-slate-500">ATS match score</h2>
                <span className="text-2xl font-semibold text-slate-900">{result.ats_score}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${scoreColor(result.ats_score)} transition-all`}
                  style={{ width: `${result.ats_score}%` }}
                />
              </div>
            </div>

            {/* Missing keywords */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-medium text-slate-500 mb-4">Missing keywords</h2>
              <div className="flex flex-wrap gap-2">
                {result.missing_keywords.map((k, i) => (
                  <span key={i} className="px-3 py-1 bg-red-50 text-red-700 text-sm rounded-full border border-red-100">
                    {k}
                  </span>
                ))}
              </div>
            </div>

            {/* Rewritten bullets */}
            {result.rewritten_bullets.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-sm font-medium text-slate-500 mb-4">Rewritten bullets</h2>
                <div className="space-y-4">
                  {result.rewritten_bullets.map((b, i) => (
                    <div key={i} className="border border-slate-100 rounded-lg p-4">
                      <p className="text-sm text-red-600 mb-2"><span className="font-medium">Before:</span> {b.original}</p>
                      <p className="text-sm text-emerald-700"><span className="font-medium">After:</span> {b.rewritten}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-medium text-slate-500 mb-4">ATS tips</h2>
              <ul className="space-y-2">
                {result.ats_tips.map((t, i) => (
                  <li key={i} className="text-sm text-slate-700 flex gap-2">
                    <span className="text-slate-400">•</span> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}