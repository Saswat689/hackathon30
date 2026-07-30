"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  SendHorizontal,
  Bot,
  User,
  Sparkles,
  Upload,
  FileCheck,
} from "lucide-react";

export default function ChatWindow() {
  const [uploading, setUploading] = useState(false);

  //fn to process doc upload inside ui
  async function uploadDocument(file, type) {
    if (!file) return;

    setUploading(true);

    const formData = new FormData();

    formData.append("file", file);
    formData.append("type", type);

    formData.append("session", JSON.stringify(session));

    try {
      const res = await fetch("/api/document", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.session) {
        setSession(data.session);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
        },
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "👋 Welcome to CivicAgent! I can help you discover scholarships, government schemes, and guide you through the application process.",
    },
  ]);

  const [session, setSession] = useState({
    profile: {
      state: "",
      income: null,
      category: "",
      gender: "",
      course: "",
    },

    scholarships: [],

    uploadedDocs: [],

    verifiedFields: {},
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const bottomRef = useRef(null);
  //data persistance
  useEffect(() => {
    const savedMessages = localStorage.getItem("civic-messages");
    const savedSession = localStorage.getItem("civic-session");

    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }

    if (savedSession) {
      setSession(JSON.parse(savedSession));
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("civic-session", JSON.stringify(session));
  }, [session, hydrated]);

  useEffect(() => {
    localStorage.setItem("civic-messages", JSON.stringify(messages));
  }, [messages, hydrated]);

  async function sendMessage() {
    if (loading) return;

    if (!input.trim()) return;

    // Add user's message immediately
    const userMessage = {
      role: "user",
      content: input,
    };

    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);

    const currentMessage = input;

    setInput("");

    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentMessage,
          session,
          messages: updatedMessages.slice(-10),
        }),
      });

      if (!res.ok) {
        throw new Error("API request failed");
      }

      const data = await res.json();

      if (data.session) {
        setSession(data.session);
      }

      let assistantReply = data.reply;

      if (data.nextQuestion) {
        assistantReply += `\n\n**Next:** ${data.nextQuestion}`;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: assistantReply,
        },
      ]);
    } catch (err) {
      console.error(err);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "⚠️ Sorry, something went wrong while contacting CivicAgent.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex h-screen flex-col bg-[#0f172a] px-12">
      {/* Header */}

      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <div>
            <h1 className="text-xl font-bold text-white">
              🇮🇳 Ninja Scholarships
            </h1>

            <p className="text-xs text-slate-400">
              AI-powered Public/private scholarships portal
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
            <Sparkles size={14} />
            Gemma 4
          </div>
        </div>
      </div>

      {/* Messages */}

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`flex max-w-2xl gap-3 ${
                  message.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    message.role === "assistant"
                      ? "bg-blue-600"
                      : "bg-slate-700"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <Bot size={18} />
                  ) : (
                    <User size={18} />
                  )}
                </div>

                <div
                  className={`rounded-2xl px-5 py-4 leading-7 ${
                    message.role === "assistant"
                      ? "bg-slate-800 text-slate-100"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600">
                <Bot size={18} />
              </div>

              <div className="rounded-2xl bg-slate-800 px-5 py-4">
                <div className="flex gap-2">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-white"></span>
                  <span className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:0.15s]"></span>
                  <span className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:0.3s]"></span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}

      <div
        className="
flex 
max-w-4xl 
gap-3 
px-5 
"
      >
        <label
          className="
flex cursor-pointer items-center gap-2
rounded-xl
border border-slate-700
bg-slate-800
px-4 py-2
text-sm text-slate-200
transition
hover:border-blue-500
hover:bg-slate-700
"
        >
          <FileCheck size={16} />
          Aadhaar Card
          <input
            type="file"
            hidden
            accept="image/*,.pdf"
            onChange={(e) => uploadDocument(e.target.files[0], "aadhar")}
          />
        </label>

        <label
          className="
flex cursor-pointer items-center gap-2
rounded-xl
border border-slate-700
bg-slate-800
px-4 py-2
text-sm text-slate-200
transition
hover:border-blue-500
hover:bg-slate-700
"
        >
          <Upload size={16} />
          Income Certificate
          <input
            type="file"
            hidden
            accept="image/*,.pdf"
            onChange={(e) =>
              uploadDocument(e.target.files[0], "income_certificate")
            }
          />
        </label>
      </div>

      <div className="bg-slate-900">
        <div className="mx-auto max-w-4xl p-5">
          <div className="flex items-end rounded-2xl border border-slate-700 bg-slate-800">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about scholarships, schemes, documents..."
              className="max-h-40 flex-1 resize-none bg-transparent px-5 py-4 text-white outline-none placeholder:text-slate-400"
            />

            <button
              onClick={sendMessage}
              disabled={loading}
              className="m-2 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 transition hover:bg-blue-500 disabled:opacity-50"
            >
              <SendHorizontal size={18} />
            </button>
          </div>

          <p className="mt-3 text-center text-xs text-slate-500">
            CivicAgent can make mistakes. Verify important information before
            applying.
          </p>
        </div>
      </div>
    </div>
  );
}
