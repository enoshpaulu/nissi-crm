import fetch from "node-fetch";

export async function handler(event) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  const path = event.path.replace("/.netlify/functions/supabase-proxy", "");

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method: event.httpMethod,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`
    },
    body: event.body ? event.body : undefined
  });

  const data = await response.text();

  return {
    statusCode: response.status,
    body: data
  };
}