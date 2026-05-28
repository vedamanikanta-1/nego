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

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const prompt = `You are India's top salary negotiation coach.

User Profile:
- Job Title: ${jobTitle}
- Skills: ${skills}
- Experience: ${experience}
- Location: ${location}
- Current Salary: ${currentSalary || "Not disclosed"}

Generate complete negotiation report. Return ONLY this JSON:
{
  "companyWiseSalaries": [
    {"company": "Google", "range": "₹XX-XXL", "notes": "brief note"},
    {"company": "Amazon", "range": "₹XX-XXL", "notes": "brief note"},
    {"company": "Microsoft", "range": "₹XX-XXL", "notes": "brief note"},
    {"company": "TCS", "range": "₹XX-XXL", "notes": "brief note"},
    {"company": "Infosys", "range": "₹XX-XXL", "notes": "brief note"},
    {"company": "Wipro", "range": "₹XX-XXL", "notes": "brief note"}
  ],
  "negotiationScript": {
    "opening": "exact word-for-word opening statement",
    "whenAsked": "exact response when HR asks expected salary",
    "counterOffer": "exact counter offer script",
    "closing": "exact closing statement"
  },
  "offerEvaluation": "evaluation of current salary vs market",
  "actionPlan": ["action1", "action2", "action3"],
  "redFlags": ["flag1", "flag2"],
  "skillsToAdd": ["skill with salary increase percentage"]
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
      body: JSON.stringify({ error: "Report failed: " + err.message }),
    };
  }
};
