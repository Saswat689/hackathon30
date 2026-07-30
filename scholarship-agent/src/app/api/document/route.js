import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

export async function POST(req) {
  try {
    const formData = await req.formData();

    const file = formData.get("file");
    const type = formData.get("type");
    const session = JSON.parse(formData.get("session"));

    if (!file) {
      return Response.json(
        {
          error: "No document uploaded",
        },
        {
          status: 400,
        },
      );
    }

    // Convert file to base64

    const bytes = await file.arrayBuffer();

    const base64 = Buffer.from(bytes).toString("base64");

    let prompt = "";

    if (type === "aadhar") {
      prompt = `
You are a document verification assistant.

Analyze this Aadhaar card image.

Extract ONLY:

{
"name":"",
"dob":"",
"documentType":"aadhar",
"valid":true
}

Do not guess.
Return JSON only.
`;
    }

    if (type === "income_certificate") {
      prompt = `
You are a document verification assistant.

Analyze this income certificate.

Extract ONLY:

{
"name":"",
"annualIncome":"",
"authority":"",
"documentType":"income_certificate",
"valid":true
}

Do not guess.
Return JSON only.
`;
    }

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",

      contents: [
        {
          text: prompt,
        },

        {
          inlineData: {
            mimeType: file.type,
            data: base64,
          },
        },
      ],
    });

    const clean = result.text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const extracted = JSON.parse(clean);

    // -----------------------
    // Update session
    // -----------------------

    session.uploadedDocs.push({
      type,
      name: file.name,
      status: "verified",
    });

    session.verifiedFields[type] = extracted;

    // Update profile automatically

    if (type === "income_certificate") {
      session.profile.income = extracted.annualIncome;
    }

    return Response.json({
      success: true,

      session,

      reply:
        type === "aadhar"
          ? `✅ Aadhaar verified successfully.\n\nName detected: ${extracted.name}`
          : `✅ Income certificate verified.\n\nAnnual income detected: ₹${extracted.annualIncome}`,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error: error.message,
      },
      {
        status: 500,
      },
    );
  }
}
