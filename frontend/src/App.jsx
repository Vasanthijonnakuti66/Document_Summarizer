import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
  FileImage,
  Clock,
  Info
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function App() {
  // Application states
  const [file, setFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedLength, setSelectedLength] = useState("medium"); // default
  
  // Loading & Step Progress states
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0: Uploading, 1: Extracting, 2: Analyzing, 3: Generating
  const [loadingError, setLoadingError] = useState(null);
  
  // Results Dashboard states
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("medium");
  const [summaryCache, setSummaryCache] = useState({
    short: null,
    medium: null,
    long: null
  });
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [isTextCollapsed, setIsTextCollapsed] = useState(true);

  const fileInputRef = useRef(null);

  // File Validation Rules
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp"
  ];

  const validateFile = (selectedFile) => {
    if (!selectedFile) return "No file selected.";
    if (selectedFile.size === 0) return "The selected file is empty.";
    if (selectedFile.size > MAX_SIZE) return "File size exceeds the 10MB limit.";
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      return "Unsupported file type. Please upload a PDF or an Image (PNG, JPG, WEBP).";
    }
    return null;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const error = validateFile(selectedFile);
      if (error) {
        setLoadingError(error);
        setFile(null);
      } else {
        setFile(selectedFile);
        setLoadingError(null);
        // Start process immediately upon selection
        processDocument(selectedFile, selectedLength);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const error = validateFile(droppedFile);
      if (error) {
        setLoadingError(error);
        setFile(null);
      } else {
        setFile(droppedFile);
        setLoadingError(null);
        processDocument(droppedFile, selectedLength);
      }
    }
  };

  // Simulates steps for a progress indicator
  const startProgressSimulation = () => {
    setCurrentStep(0); // Uploading
    const t1 = setTimeout(() => setCurrentStep(1), 1000); // Extracting Text
    const t2 = setTimeout(() => setCurrentStep(2), 2500); // Analyzing Content
    const t3 = setTimeout(() => setCurrentStep(3), 4500); // Generating Summary
    return [t1, t2, t3];
  };

  const processDocument = async (docFile, length, updateTabOnly = false) => {
    if (!docFile) return;
    
    if (updateTabOnly) {
      setIsTabLoading(true);
    } else {
      setLoading(true);
      setLoadingError(null);
    }

    const timers = !updateTabOnly ? startProgressSimulation() : [];
    const formData = new FormData();
    formData.append("file", docFile);
    formData.append("summary_length", length);

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/analyze`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Server error occurred during analysis.");
      }

      const data = await response.json();
      
      if (updateTabOnly) {
        setSummaryCache(prev => ({
          ...prev,
          [length]: data.summary
        }));
      } else {
        setResult(data);
        setSummaryCache({
          short: length === "short" ? data.summary : null,
          medium: length === "medium" ? data.summary : null,
          long: length === "long" ? data.summary : null
        });
        setActiveTab(length);
      }
    } catch (err) {
      if (updateTabOnly) {
        setLoadingError(`Could not update summary: ${err.message}`);
      } else {
        setLoadingError(err.message);
      }
    } finally {
      timers.forEach(t => clearTimeout(t));
      setLoading(false);
      setIsTabLoading(false);
    }
  };

  const handleTabChange = async (tabLength) => {
    setActiveTab(tabLength);
    if (summaryCache[tabLength]) {
      // Use cached summary
      setResult(prev => ({
        ...prev,
        summary: summaryCache[tabLength]
      }));
    } else {
      // Fetch new summary length
      await processDocument(file, tabLength, true);
    }
  };

  const resetApp = () => {
    setFile(null);
    setResult(null);
    setLoadingError(null);
    setSummaryCache({ short: null, medium: null, long: null });
    setActiveTab("medium");
    setIsTextCollapsed(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isImage = (type) => type && type.includes("image");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between antialiased">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-6 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Document Summary Assistant
              </h1>
              <p className="text-xs text-gray-500">Professional Technical Assessment</p>
            </div>
          </div>
          
          {result && (
            <button
              onClick={resetApp}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Upload Another</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-6xl w-full mx-auto p-4 md:p-6 flex flex-col justify-center">
        {/* Error Notification */}
        {loadingError && !loading && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start space-x-3 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-red-900">Processing Error</h3>
              <p className="text-sm mt-0.5 leading-relaxed">{loadingError}</p>
            </div>
          </div>
        )}

        {/* 1. LANDING & UPLOAD STATE */}
        {!file && !loading && !result && (
          <div className="max-w-2xl mx-auto w-full text-center space-y-8 py-10">
            <div className="space-y-3">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                AI-Powered Document Summarization
              </h2>
              <p className="text-base text-gray-600 max-w-md mx-auto leading-relaxed">
                Upload your PDFs, scanned documents, or images. Instantly extract text and generate detailed summaries, key points, and suggestions.
              </p>
            </div>

            {/* Drag & Drop Card */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
              className={`border-2 border-dashed rounded-2xl p-8 md:p-12 transition-all cursor-pointer flex flex-col items-center justify-center space-y-4 bg-white shadow-sm ${
                isDragOver
                  ? "border-blue-500 bg-blue-50/50 scale-[1.01]"
                  : "border-gray-300 hover:border-blue-400 hover:shadow-md"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept={ALLOWED_TYPES.join(",")}
                className="hidden"
              />
              
              <div className={`p-4 rounded-full ${isDragOver ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"}`}>
                <UploadCloud className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <p className="text-base font-semibold text-gray-800">
                  Drag and drop your file here, or <span className="text-blue-600 hover:underline">browse</span>
                </p>
                <p className="text-xs text-gray-500">
                  Supports PDF, PNG, JPG, JPEG, WEBP (Max 10MB)
                </p>
              </div>

              {/* Length selection prior to upload */}
              <div className="pt-4 w-full max-w-xs mx-auto" onClick={(e) => e.stopPropagation()}>
                <label className="block text-xs font-medium text-gray-500 text-left mb-1">
                  Target Summary Length
                </label>
                <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1 rounded-lg">
                  {["short", "medium", "long"].map((len) => (
                    <button
                      key={len}
                      type="button"
                      onClick={() => setSelectedLength(len)}
                      className={`text-xs capitalize py-1.5 font-medium rounded-md transition ${
                        selectedLength === len
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      {len}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. LOADING STATE WITH PROGRESS INDICATOR */}
        {loading && (
          <div className="max-w-md mx-auto w-full bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm space-y-6">
            <div className="flex flex-col items-center">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
              <h3 className="text-lg font-bold text-gray-900">Processing Document</h3>
              <p className="text-sm text-gray-500 mt-1">Please keep this tab open</p>
            </div>

            {/* Steps Progress Indicator */}
            <div className="space-y-3.5 text-left border-t border-gray-100 pt-6">
              {[
                { label: "Uploading document file...", step: 0 },
                { label: "Extracting pages and structure...", step: 1 },
                { label: "Analyzing layout & OCR if needed...", step: 2 },
                { label: "Generating structured summaries...", step: 3 }
              ].map((item) => (
                <div key={item.step} className="flex items-center space-x-3 text-sm">
                  <div className="flex-shrink-0">
                    {currentStep > item.step ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : currentStep === item.step ? (
                      <div className="w-5 h-5 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-ping" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-gray-300 bg-gray-50" />
                    )}
                  </div>
                  <span
                    className={`transition-colors ${
                      currentStep === item.step
                        ? "text-gray-900 font-semibold"
                        : currentStep > item.step
                        ? "text-gray-500"
                        : "text-gray-300"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. RESULTS DASHBOARD */}
        {result && !loading && (
          <div className="space-y-6 py-4">
            
            {/* Upper Grid: Document Metadata & Key Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Document Info Card */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4 md:col-span-1">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    {isImage(file?.type) ? (
                      <FileImage className="w-6 h-6" />
                    ) : (
                      <FileText className="w-6 h-6" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-gray-900 truncate" title={result.filename}>
                      {result.filename}
                    </h3>
                    <p className="text-xs text-gray-500 uppercase font-semibold">
                      {result.file_type} File
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-2.5 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Pages:</span>
                    <span className="font-medium text-gray-900">{result.page_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Words:</span>
                    <span className="font-medium text-gray-900">{result.word_count.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Characters:</span>
                    <span className="font-medium text-gray-900">{result.character_count.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Extraction Method:</span>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-md border border-gray-200">
                      {result.extraction_method}
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Analysis: Summarizer Tabbed Card */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm md:col-span-2 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                      <h3 className="text-base font-bold text-gray-900">Document Summary</h3>
                    </div>
                    {/* Summary length switcher tabs */}
                    <div className="flex space-x-1.5 bg-gray-100 p-1 rounded-lg">
                      {["short", "medium", "long"].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => handleTabChange(tab)}
                          disabled={isTabLoading}
                          className={`px-3 py-1 text-xs font-bold capitalize rounded-md transition ${
                            activeTab === tab
                              ? "bg-white text-blue-700 shadow-sm"
                              : "text-gray-500 hover:text-gray-800 disabled:opacity-50"
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Summary Text Content */}
                  <div className="relative min-h-[140px] text-sm text-gray-700 leading-relaxed space-y-3 pt-1">
                    {isTabLoading ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                      </div>
                    ) : (
                      result.summary.split('\n\n').map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3 flex items-center text-xs text-gray-400 space-x-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Summary conforms to the {activeTab} formatting standard.</span>
                </div>
              </div>
            </div>

            {/* Lower Grid: Key Points & Suggestions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Key Points */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center space-x-2">
                  <span className="w-1.5 h-4 bg-green-500 rounded-full" />
                  <span>Key Points</span>
                </h3>
                <ul className="space-y-2.5">
                  {result.key_points && result.key_points.map((point, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm text-gray-700 leading-relaxed">
                      <span className="text-green-500 font-bold select-none mt-0.5">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Suggestions */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center space-x-2">
                  <span className="w-1.5 h-4 bg-amber-500 rounded-full" />
                  <span>Improvement Suggestions</span>
                </h3>
                <ul className="space-y-2.5">
                  {result.improvement_suggestions && result.improvement_suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start space-x-2.5 text-sm text-gray-700 leading-relaxed">
                      <span className="text-amber-500 font-bold select-none mt-0.5">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Extracted Text Section */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => setIsTextCollapsed(!isTextCollapsed)}
                className="w-full px-5 py-4 flex items-center justify-between text-gray-800 hover:bg-gray-50 transition border-b border-gray-100"
              >
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-gray-500" />
                  <span className="font-bold text-sm">View Extracted Document Text</span>
                </div>
                {isTextCollapsed ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {!isTextCollapsed && (
                <div className="p-5 bg-gray-50 max-h-96 overflow-y-auto text-xs text-gray-600 leading-relaxed font-mono whitespace-pre-wrap">
                  {result.extracted_text}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 px-6 text-center text-xs text-gray-500">
        <div className="max-w-6xl mx-auto">
          <p>© 2026 Document Summary Assistant. Software Engineering Assessment Project.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
