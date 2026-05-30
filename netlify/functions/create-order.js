const https = require("https");

function paypalRequest(hostname, path, headers, body) {
  return new Promise(function(resolve, reject) {
    const data = typeof body === "string" ? body : JSON.stringify(body);
    const options = {
      hostname: hostname,
      path: path,
      method: "POST",
      headers: Object.assign({}, headers, {
        "Content-Length": Buffer.byteLength(data)
      })
    };
    const req = https.request(options, function(res) {
      let raw = "";
      res.on("data", function(chunk) { raw += chunk; });
      res.on("end", function() {
        try { resolve(JSON.parse(raw)); }
        catch(e) { resolve({ _raw: raw }); }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

exports.handler = function(event, context, callback) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return callback(null, { statusCode: 200, headers: corsHeaders, body: "" });
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;

  if (!clientId || !secret) {
    return callback(null, {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Missing PayPal credentials" })
    });
  }

  const authString = Buffer.from(clientId + ":" + secret).toString("base64");

  paypalRequest(
    "api-m.sandbox.paypal.com",
    "/v1/oauth2/token",
    {
      "Authorization": "Basic " + authString,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    "grant_type=client_credentials"
  ).then(function(authData) {
    if (!authData.access_token) {
      return callback(null, {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Auth failed", details: authData })
      });
    }

    return paypalRequest(
      "api-m.sandbox.paypal.com",
      "/v2/checkout/orders",
      {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + authData.access_token
      },
      {
        intent: "CAPTURE",
        purchase_units: [{
          amount: {
            currency_code: "USD",
            value: "2.40"
          },
          description: "NegotiateAI Full Report"
        }]
      }
    );
  }).then(function(orderData) {
    if (!orderData || !orderData.id) {
      return callback(null, {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: "No order ID", details: orderData })
      });
    }
    callback(null, {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ orderID: orderData.id })
    });
  }).catch(function(err) {
    callback(null, {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message })
    });
  });
};
