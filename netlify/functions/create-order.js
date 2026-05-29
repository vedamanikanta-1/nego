const https = require("https");
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

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;

  if (!clientId || !secret) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ 
        error: "PayPal credentials missing",
        hasClientId: !!clientId,
        hasSecret: !!secret
      }),
    };
  }

  try {
    // Step 1: Get access token
    const authString = Buffer.from(clientId + ":" + secret).toString("base64");
    
    const authRes = await fetch(
      "https://api-m.sandbox.paypal.com/v1/oauth2/token",
      {
        method: "POST",
        headers: {
          "Authorization": "Basic " + authString,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      }
    );

    const authText = await authRes.text();
    let authData;
    try {
      authData = JSON.parse(authText);
    } catch(e) {
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "PayPal auth parse failed: " + authText }),
      };
    }

    if (!authData.access_token) {
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ 
          error: "No access token from PayPal",
          details: authData
        }),
      };
    }

    // Step 2: Create order
    const orderRes = await fetch(
      "https://api-m.sandbox.paypal.com/v2/checkout/orders",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + authData.access_token,
          "PayPal-Request-Id": "negotiateai-" + Date.now(),
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{
            amount: {
              currency_code: "USD",
              value: "2.40",
            },
            description: "NegotiateAI
