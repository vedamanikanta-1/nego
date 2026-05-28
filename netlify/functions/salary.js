const { GoogleGenerativeAI } = require("@google/generative-ai");

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
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
      systemInstruction: `You are an Indian IT salary database. Give PRECISE salary figures based on EXACT job role + skills combination.

STRICT RULES:
1. A "Data Scientist with Python, ML, TensorFlow" earns VERY DIFFERENT from "Frontend Developer with React, CSS"
2. NEVER give same salary range for different job titles or skill sets
3. Skills like AWS, ML, Blockchain, Kubernetes command 30-50% premium
4. City multipliers: Bangalore=1.15x, Hyderabad=1.10x, Mumbai=1.12x, Pune=1.08x, Chennai=1.08x, Delhi/NCR=1.12x, Tier2=0.85x, Remote=1.0x
5. Seniority: Fresher=1x, 1-3yr=1.4x, 3-5yr=2x, 5-8yr=2.8x, 8-12yr=3.5x, 12+yr=4.5x
6. Base salaries Bangalore 3-5yr: SDE=18-28L, Data Scientist=20-35L, DevOps=18-30L, ML Engineer=22-38L, Frontend=15-25L, Backend=16-26L, Full Stack=18-28L, PM=25-45L, Data Analyst=12-20L, QA=10-18L
7. Apply ALL multipliers together`
    });

    const prompt = `Calculate PRECISE salary for this EXACT profile:

JOB TITLE: "${jobTitle}"
SKILLS: "${skills}"
EXPERIENCE: "${experience}"
LOCATION: "${location}"
CURRENT SALARY: "${currentSalary || "Not provided"}"

Return ONLY this JSON:
{
  "minSalary": "₹X.XL",
  "avgSalary": "₹X.XL",
  "maxSalary": "₹X.XL",
  "marketInsight": "Specific insight about ${jobTitle} with ${skills} in ${location} market in 2025",
  "skillPremium": "Specific skill from '${skills}' that commands highest premium and exact % boost",
  "negotiationRoom": "Low/Medium/High",
  "demandLevel": "Low/Medium/High/Very High",
  "topHiringCompanies": ["5 companies that hire ${jobTitle} in India"]
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
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
