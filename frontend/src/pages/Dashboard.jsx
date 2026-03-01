// Dashboard.jsx
// SkinEval — Full Dashboard Page
// Features: Image Upload, Gemini Analysis, History, User Info

import { useState, useEffect, useRef } from "react";

export default function Dashboard() {
  // ─── State Variables ───────────────────────────────────────────────
  const [user, setUser] = useState(null);           // Logged-in user info
  const [selectedFile, setSelectedFile] = useState(null);   // Selected image file
  const [previewUrl, setPreviewUrl] = useState(null);        // Image preview URL
  const [result, setResult] = useState(null);                // Gemini analysis result
  const [history, setHistory] = useState([]);                // Past analyses
  const [uploading, setUploading] = useState(false);         // Upload in progress
  const [historyLoading, setHistoryLoading] = useState(false); // History loading
  const [error, setError] = useState(null);                  // Error message
  const [activeTab, setActiveTab] = useState("upload");      // "upload" or "history"
  const fileInputRef = useRef(null);

  // ─── Load User from localStorage on Mount ──────────────────────────
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // ─── Load History when History Tab is Opened ───────────────────────
  useEffect(() => {
    if (activeTab === "history" && user?.id) {
      fetchHistory();
    }
  }, [activeTab, user]);

  // ─── Fetch History from Backend ────────────────────────────────────
  const fetchHistory = async () => {
    setHistoryLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:3001/api/analysis/history/${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err) {
      setError("Could not load history. " + err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ─── Handle File Selection ─────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setResult(null);
    setError(null);
    // Create a preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  // ─── Handle Drag & Drop ────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      setResult(null);
      setError(null);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  // ─── Handle Upload & Analysis ──────────────────────────────────────
  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select an image first.");
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      // Add userId if user is logged in
      if (user?.id) {
        formData.append("userId", user.id);
      }

      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:3001/analyze", {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || errData.error || "Analysis failed");
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError("Analysis failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // ─── Handle Logout ─────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  // ─── Reset Upload Section ──────────────────────────────────────────
  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Utility: Confidence Color ─────────────────────────────────────
  const getConfidenceColor = (confidence) => {
    if (confidence >= 75) return "text-emerald-400";
    if (confidence >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const getConfidenceBg = (confidence) => {
    if (confidence >= 75) return "bg-emerald-400";
    if (confidence >= 50) return "bg-yellow-400";
    return "bg-red-400";
  };

  // ─── Utility: Format Date ──────────────────────────────────────────
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">

      {/* ── Top Navigation Bar ── */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-sm">SE</span>
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            SkinEval
          </span>
        </div>

        {/* User Info + Logout */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center text-sm font-semibold">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <span className="text-gray-300 text-sm font-medium">
              {user?.name || "User"}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-colors duration-200 border border-gray-700"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Welcome Header ── */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">
            Welcome back,{" "}
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              {user?.name || "User"}
            </span>{" "}
            👋
          </h1>
          <p className="text-gray-400 text-sm">
            Upload a skin image to get an AI-powered analysis instantly.
          </p>
        </div>

        {/* ── Tab Switcher ── */}
        <div className="flex gap-1 bg-gray-900 p-1 rounded-xl mb-8 w-fit border border-gray-800">
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === "upload"
                ? "bg-violet-600 text-white shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🔬 Analyze
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === "history"
                ? "bg-violet-600 text-white shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            📋 History
          </button>
        </div>

        {/* ════════════════════════════════════
            TAB 1 — UPLOAD & ANALYZE
        ════════════════════════════════════ */}
        {activeTab === "upload" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Left: Upload Card ── */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-5">
              <h2 className="text-lg font-semibold text-white">Upload Image</h2>

              {/* Drag & Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 min-h-[200px] ${
                  previewUrl
                    ? "border-violet-500 bg-violet-500/5"
                    : "border-gray-700 hover:border-violet-500 hover:bg-violet-500/5"
                }`}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-48 max-w-full rounded-lg object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 py-8 px-4 text-center">
                    <div className="w-14 h-14 bg-gray-800 rounded-full flex items-center justify-center text-2xl">
                      🖼️
                    </div>
                    <div>
                      <p className="text-gray-300 font-medium text-sm">
                        Drag & drop or click to upload
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        JPG, PNG, WEBP, GIF — Max 10MB
                      </p>
                    </div>
                  </div>
                )}

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* File Name Display */}
              {selectedFile && (
                <div className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-2">
                  <span className="text-sm text-gray-300 truncate max-w-[180px]">
                    📎 {selectedFile.name}
                  </span>
                  <button
                    onClick={handleReset}
                    className="text-gray-500 hover:text-red-400 text-xs ml-2 transition-colors"
                  >
                    ✕ Remove
                  </button>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
                  ⚠️ {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                    uploading || !selectedFile
                      ? "bg-violet-800/40 text-violet-400/50 cursor-not-allowed"
                      : "bg-violet-600 hover:bg-violet-500 text-white shadow-lg hover:shadow-violet-500/25"
                  }`}
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Analyzing...
                    </>
                  ) : (
                    "🔬 Analyze Image"
                  )}
                </button>
              </div>
            </div>

            {/* ── Right: Result Card ── */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-5">
              <h2 className="text-lg font-semibold text-white">Analysis Result</h2>

              {/* Empty State */}
              {!result && !uploading && (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12 gap-3">
                  <div className="w-14 h-14 bg-gray-800 rounded-full flex items-center justify-center text-2xl">
                    🧬
                  </div>
                  <p className="text-gray-500 text-sm">
                    Your analysis results will appear here after upload.
                  </p>
                </div>
              )}

              {/* Loading Skeleton */}
              {uploading && (
                <div className="flex flex-col gap-4 animate-pulse">
                  <div className="h-6 bg-gray-800 rounded-lg w-2/3"></div>
                  <div className="h-4 bg-gray-800 rounded w-1/3"></div>
                  <div className="h-16 bg-gray-800 rounded-lg"></div>
                  <div className="h-4 bg-gray-800 rounded w-full"></div>
                  <div className="h-4 bg-gray-800 rounded w-4/5"></div>
                </div>
              )}

              {/* Result Content */}
              {result && !uploading && (
                <div className="flex flex-col gap-5">

                  {/* Condition + Confidence */}
                  <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                          Detected Condition
                        </p>
                        <p className="text-xl font-bold text-white">
                          {result.condition}
                        </p>
                      </div>
                      <div className={`text-2xl font-bold ${getConfidenceColor(result.confidence)}`}>
                        {result.confidence}%
                      </div>
                    </div>

                    {/* Confidence Bar */}
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-700 ${getConfidenceBg(result.confidence)}`}
                        style={{ width: `${result.confidence}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Confidence Score
                    </p>
                  </div>

                  {/* Description */}
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                      Description
                    </p>
                    <p className="text-gray-300 text-sm leading-relaxed bg-gray-800/40 rounded-xl p-4 border border-gray-700/50">
                      {result.description}
                    </p>
                  </div>

                  {/* Alternatives */}
                  {result.alternatives && result.alternatives.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                        Other Possibilities
                      </p>
                      <div className="flex flex-col gap-2">
                        {result.alternatives.map((alt, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-gray-800/40 rounded-lg px-4 py-2.5 border border-gray-700/40"
                          >
                            <span className="text-gray-300 text-sm">{alt.name}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-700 rounded-full h-1.5">
                                <div
                                  className="h-1.5 rounded-full bg-indigo-400"
                                  style={{ width: `${alt.confidence}%` }}
                                ></div>
                              </div>
                              <span className="text-indigo-400 text-xs font-medium w-10 text-right">
                                {alt.confidence}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Disclaimer */}
                  <p className="text-xs text-gray-600 bg-gray-800/30 rounded-lg p-3 border border-gray-800">
                    ⚕️ This is an AI-generated result and is not a substitute for professional medical advice. Please consult a dermatologist.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════
            TAB 2 — HISTORY
        ════════════════════════════════════ */}
        {activeTab === "history" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Analysis History</h2>
              <button
                onClick={fetchHistory}
                className="text-sm text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
              >
                ↻ Refresh
              </button>
            </div>

            {/* Loading Skeleton */}
            {historyLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse"
                  >
                    <div className="h-36 bg-gray-800 rounded-xl mb-4"></div>
                    <div className="h-4 bg-gray-800 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-800 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {error && !historyLoading && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-5 py-4">
                ⚠️ {error}
              </div>
            )}

            {/* Empty State */}
            {!historyLoading && !error && history.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center text-3xl">
                  📭
                </div>
                <div>
                  <p className="text-gray-300 font-medium">No history yet</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Your past analyses will show up here after you run them.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("upload")}
                  className="mt-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  Run First Analysis
                </button>
              </div>
            )}

            {/* History Cards Grid */}
            {!historyLoading && history.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-all duration-200 hover:shadow-lg hover:shadow-black/30 group"
                  >
                    {/* Card Image Area */}
                    <div className="h-36 bg-gradient-to-br from-gray-800 to-gray-850 flex items-center justify-center border-b border-gray-800 relative overflow-hidden">
                      {item.imageUrl ? (
                        <img
                          src={`http://localhost:3001/uploads/${item.imageUrl}`}
                          alt="Skin analysis"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <span className="text-4xl opacity-40">🖼️</span>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="p-4 flex flex-col gap-3">
                      {/* Condition */}
                      <div>
                        <p className="text-white font-semibold text-sm leading-tight">
                          {item.result?.condition || "Unknown"}
                        </p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {formatDate(item.createdAt)}
                        </p>
                      </div>

                      {/* Confidence Bar */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-500">Confidence</span>
                          <span className={`text-xs font-semibold ${getConfidenceColor(item.result?.confidence || 0)}`}>
                            {item.result?.confidence || 0}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${getConfidenceBg(item.result?.confidence || 0)}`}
                            style={{ width: `${item.result?.confidence || 0}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Short Description */}
                      {item.result?.description && (
                        <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">
                          {item.result.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}