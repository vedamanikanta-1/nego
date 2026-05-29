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
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Invalid request body" }),
    };
  }

  const { jobTitle, skills, experience, location, currentSalary } = body;

  if (!jobTitle || !skills || !experience || !location) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Missing required fields" }),
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an Indian IT salary database. Give PRECISE salary figures.

STRICT RULES:
- Different job titles MUST have different salary ranges
- Skills like AWS, ML, Kubernetes = 30-50% premium
- City: Bangalore=1.15x, Hyderabad=1.10x, Mumbai=1.12x, Pune=1.08x, Delhi/NCR=1.12x, Tier2=0.85x
- Experience: Fresher=1x, 1-3yr=1.4x, 3-5yr=2x, 5-8yr=2.8x, 8-12yr=3.5x, 12+yr=4.5x
- Base (Bangalore 3-5yr): SDE=18-28L, Data Scientist=20-35L, DevOps=18-30L, ML=22-38L, Frontend=15-25L, Backend=16-26L, PM=25-45L

Calculate for:
JOB TITLE: "${jobTitle}"
SKILLS: "${skills}"
EXPERIENCE: "${experience}"
LOCATION: "${location}"
CURRENT SALARY: "${currentSalary || "Not provided"}"

Return ONLY valid JSON, no markdown:
{
  "minSalary": "₹X.XL",
  "avgSalary": "₹X.XL",
  "maxSalary": "₹X.XL",
  "marketInsight": "specific insight about this role and skills in this city in 2025",
  "skillPremium": "which specific skill commands highest premium and why",
  "negotiationRoom": "Low/Medium/High",
  "demandLevel": "Low/Medium/High/Very High",
  "topHiringCompanies": ["company1","company2","company3","company4","company5"]
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
      body: JSON.stringify({ error: "AI analysis failed: " + err.message }),
    };
  }
};
