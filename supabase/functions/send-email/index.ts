//@ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
//@ts-ignore
import { Resend } from "npm:resend@2.0.0";
//@ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

/* ==================== CONFIG ==================== */

// TEST KEY — kept intentionally

// @ts-ignore
const resendApiKey = Deno.env.get("RESEND_API_KEY")
const resend = new Resend(resendApiKey);

//@ts-ignore
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
//@ts-ignore
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const EMAIL_FROM = "Roux Magic <no-reply@rouxmagic.com>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* ==================== EMAIL STYLES ==================== */

const baseStyles = `
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a; }
.container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
.header { text-align: center; margin-bottom: 32px; }
.logo { font-size: 28px; font-weight: bold; color: #f4a100; letter-spacing: 2px; }
.content { background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); border-radius: 16px; padding: 32px; border: 1px solid #333; }
h1 { color: #ffffff; font-size: 24px; margin: 0 0 16px 0; }
p { color: #cccccc; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
.highlight { color: #f4a100; font-weight: 600; }
.button { display: inline-block; background: linear-gradient(135deg, #f4a100 0%, #d48800 100%); color: #000000 !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 16px 0; }
.footer { text-align: center; margin-top: 32px; color: #666666; font-size: 14px; }
.divider { height: 1px; background: #333; margin: 24px 0; }
`;

/* ==================== EMAIL TEMPLATES ==================== */

function welcomeEmailTemplate(username: string): string {
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
<div class="container">
  <div class="header"><div class="logo">ROUXMAGIC</div></div>
  <div class="content">
    <h1>Welcome to RouxMagic, ${username}! 🎬</h1>
    <p>You've just unlocked access to exclusive films, music, books, comics, and recipes.</p>
    <div class="divider"></div>
    <a href="https://rouxmagic.com" class="button">Explore RouxMagic</a>
    <p>— The RouxMagic Team</p>
  </div>
</div>
</body>
</html>`;
}

function songReleaseNotifyTemplate(
  songTitle: string,
  artistName: string
): string {
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
<div class="container">
  <div class="header"><div class="logo">ROUXMAGIC</div></div>
  <div class="content">
    <h1>🔔 You're on the list!</h1>
    <p>We'll notify you when <span class="highlight">"${songTitle}"</span> by <span class="highlight">${artistName}</span> releases.</p>
    <a href="https://rouxmagic.com/listen" class="button">Explore Music</a>
  </div>
</div>
</body>
</html>`;
}

function eventNotifyTemplate(eventTitle: string, eventType: string): string {
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
<div class="container">
  <div class="header"><div class="logo">ROUXMAGIC</div></div>
  <div class="content">
    <h1>🎬 You're on the list!</h1>
    <p><span class="highlight">${eventTitle}</span> (${eventType})</p>
    <a href="https://rouxmagic.com" class="button">Explore RouxMagic</a>
  </div>
</div>
</body>
</html>`;
}

function recipeEmailTemplate(
  recipeName: string,
  recipeDescription: string,
  ingredients: string,
  instructions: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
<style>
${baseStyles}
.recipe { background:#1f1f1f;padding:16px;border-radius:8px }
</style>
</head>
<body>
<div class="container">
  <div class="header"><div class="logo">ROUXMAGIC</div></div>
  <div class="content">
    <h1>${recipeName}</h1>
    <p>${recipeDescription}</p>
    <div class="recipe">
      <h3>Ingredients</h3>
      <ul>${ingredients
        .split("\n")
        .map((i) => `<li>${i}</li>`)
        .join("")}</ul>
      <h3>Instructions</h3>
      <ol>${instructions
        .split("\n")
        .map((i) => `<li>${i}</li>`)
        .join("")}</ol>
    </div>
  </div>
</div>
</body>
</html>`;
}

/* ==================== TYPES ==================== */

interface EmailRequest {
  type: "welcome" | "song_release" | "event_notify" | "recipe";
  email: string;
  userId?: string;
  [key: string]: any;
}

/* ==================== HELPERS ==================== */

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

/* ==================== HANDLER ==================== */

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: EmailRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body?.type || !body?.email || !isValidEmail(body.email)) {
    return json({ error: "Invalid request payload" }, 400);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let subject = "";
  let html = "";
  let metadata = {};

  try {
    switch (body.type) {
      case "welcome":
        subject = "Welcome to RouxMagic!";
        html = welcomeEmailTemplate(body.username);
        metadata = { username: body.username };
        break;

      case "song_release":
        subject = `Song release: ${body.songTitle}`;
        html = songReleaseNotifyTemplate(body.songTitle, body.artistName);
        metadata = { songId: body.songId };
        break;

      case "event_notify":
        subject = `Event: ${body.eventTitle}`;
        html = eventNotifyTemplate(body.eventTitle, body.eventType);
        metadata = { eventId: body.eventId };
        break;

      case "recipe":
        subject = `Recipe: ${body.recipeName}`;
        html = recipeEmailTemplate(
          body.recipeName,
          body.recipeDescription,
          body.ingredients,
          body.instructions
        );
        metadata = { recipeId: body.recipeId };
        break;
    }

    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: Array.isArray(body.email) ? body.email : [body.email], // test target
      subject,
      html,
    });


    supabase.from("email_logs").insert({
      user_id: body.userId ?? null,
      email_to: body.email,
      type: body.type,
      subject,
      status: "sent",
      metadata,
    });

    return json({ success: true, data: result || { email_result: null } });
  } catch (err) {
    supabase.from("email_logs").insert({
      user_id: body.userId ?? null,
      email_to: body.email,
      type: body.type,
      status: "failed",
      error_message: err instanceof Error ? err.message : "Unknown error",
      metadata,
    });

    return json({ success: false, error: "Email failed" }, 500);
  }
});
