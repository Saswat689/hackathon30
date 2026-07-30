import { GoogleGenAI } from "@google/genai";
import findScholarships from "@/lib/findScholarships";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

const QUESTION_MAP = {
  state: "Which state do you belong to?",
  income: "What is your annual family income (in ₹)?",
  course: "Which course are you pursuing?",
  category: "What is your social category? (General / OBC / SC / ST)?",
  gender: "What is your gender?",
};

export async function POST(req) {
  try {
    if (!process.env.GOOGLE_API_KEY) {
      return Response.json(
        { error: "GOOGLE_API_KEY missing" },
        { status: 500 },
      );
    }

    const { message, session, messages } = await req.json();

    const profile = session.profile ?? {
      state: "",
      income: null,
      category: "",
      gender: "",
      course: "",
    };

    // -------------------------
    // Planner
    // -------------------------

    const plannerPrompt = `
You are CivicAgent Planner.

Available actions:

- update_profile
- search_scholarships
- answer_general
- verify_document

Current Session:

${JSON.stringify(session)}

Conversation:

${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}

Latest User Message:

${message}

Return ONLY JSON.

{
  "action":""
}
`;

    const planner = await ai.models.generateContent({
      model: "models/gemma-4-31b-it",
      contents: plannerPrompt,
    });

    const plannerOutput = planner.text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let action = "answer_general";

    try {
      action = JSON.parse(plannerOutput).action;
    } catch {}

    // -------------------------
    // General Chat
    // -------------------------

    if (action === "answer_general") {
      const response = await ai.models.generateContent({
        model: "models/gemma-4-31b-it",
        contents: `
You are CivicAgent.

Answer naturally.

Conversation:

${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}

User:

${message}
`,
      });

      return Response.json({
        reply: response.text,
        session,
      });
    }

    // -------------------------
    // Profile Extraction
    // -------------------------

    const extractionPrompt = `
You already know the student's profile.

Current Profile:

${JSON.stringify(profile)}

Conversation:

${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}

Latest User Message:

${message}

Update ONLY fields mentioned.

Never erase existing values.

Return ONLY JSON.

{
  "state":"",
  "income":null,
  "category":"",
  "gender":"",
  "course":""
}
`;

    const extraction = await ai.models.generateContent({
      model: "models/gemma-4-31b-it",
      contents: extractionPrompt,
    });

    const clean = extraction.text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let extracted = {};

    try {
      extracted = JSON.parse(clean);
    } catch {
      return Response.json(
        {
          error: "Gemma returned invalid JSON",
          raw: clean,
        },
        { status: 500 },
      );
    }

    // -------------------------
    // Merge profile
    // -------------------------

    Object.entries(extracted).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        profile[key] = value;
      }
    });

    // -------------------------
    // Scholarship Search
    // -------------------------

    const scholarships = findScholarships(profile);

    session.profile = profile;
    session.scholarships = scholarships;

    // -------------------------
    // Missing Fields
    // -------------------------

    const missingFields = [];

    if (!profile.state) missingFields.push("state");
    if (!profile.income) missingFields.push("income");
    if (!profile.course) missingFields.push("course");
    if (!profile.category) missingFields.push("category");
    if (!profile.gender) missingFields.push("gender");

    const nextQuestion =
      missingFields.length > 0 ? QUESTION_MAP[missingFields[0]] : "";

    // -------------------------
    // Build response WITHOUT another AI call
    // -------------------------

    let reply = "";

    if (scholarships.length === 0) {
      reply =
        "I couldn't find any matching scholarships yet. Once I have your complete profile, I'll search again.";
    } else {
      reply = `I found ${scholarships.length} scholarship${
        scholarships.length > 1 ? "s" : ""
      } matching your profile.\n\n`;

      scholarships.forEach((s) => {
        reply += `• **${s.name}** — ${s.description}\n`;
      });
    }

    return Response.json({
      reply,
      nextQuestion,
      session,
    });
  } catch (err) {
    console.error(err);

    return Response.json(
      {
        error: err.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
