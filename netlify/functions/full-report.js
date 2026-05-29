const { GoogleGenAI } = require("@google/genai");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Gemini API key not found" }),
    };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch (e) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Invalid request body" }),
    };
  }

  const { jobTitle, skills, experience, location, currentSalary } = body;

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are India's top salary negotiation coach.

Profile:
- Job Title: ${jobTitle}
- Skills: ${skills}
- Experience: ${experience}
- Location: ${location}
- Current Salary: ${currentSalary || "Not disclosed"}

Return ONLY valid JSON, no markdown:
{
  "companyWiseSalaries": [
    {"company": "Google", "range": "₹XX-XXL", "notes": "note"},
    {"company": "Amazon", "range": "₹XX-XXL", "notes": "note"},
    {"company": "Microsoft", "range": "₹XX-XXL", "notes": "note"},
    {"company": "TCS", "range": "₹XX-XXL", "notes": "note"},
    {"company": "Infosys", "range": "₹XX-XXL", "notes": "note"},
    {"company": "Wipro", "range": "₹XX-XXL", "notes": "note"}
  ],
  "negotiationScript": {
    "opening": "exact opening statement",
    "whenAsked": "exact response when HR asks salary",
    "counterOffer": "exact counter offer script",
    "closing": "exact closing statement"
  },
  "offerEvaluation": "is current salary fair/underpaid/overpaid",
  "actionPlan": ["step1","step2","step3"],
  "redFlags": ["flag1","flag2"],
  "skillsToAdd": ["skill with % increase"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text;
    const cleaned = text.replace(/```json|```/g, "").trim();
    const data = JSON.parse(cleaned);

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ success: true, data }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Report failed: " + err.message }),
    };
  }
};
