require("dotenv").config();
const express = require("express"),
  cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const app = express();
app.use(cors(), express.json());
const http = createServer(app);
const io = new Server(http, { cors: { origin: "*" } });

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
const captionCache = {};

async function genCaption(tags) {
  const key = tags.join(",");
  if (captionCache[key]) return captionCache[key];
  try {
    const res = await axios.post("https://aistudio.google.com/api/gemini", {
      /* prompt, key */
    });
    return (captionCache[key] = res.data.caption);
  } catch {
    return "YOLO to the moon!";
  }
}

app.post("/memes", async (req, res) => {
  const { title, image_url, tags } = req.body;
  const { data, error } = await sb
    .from("memes")
    .insert([{ title, image_url, tags }])
    .select();
  const meme = data[0];
  const caption = await genCaption(tags);
  await sb.from("memes").update({ caption }).eq("id", meme.id);
  res.json({ ...meme, caption });
  io.emit("new-meme", meme);
});

app.get("/leaderboard", async (req, res) => {
  const { data } = await sb
    .from("memes")
    .select("*")
    .order("upvotes", { ascending: false })
    .limit(req.query.top || 10);
  res.json(data);
});

app.post("/memes/:id/bid", async (req, res) => {
  const { credits } = req.body,
    meme_id = req.params.id;
  const user_id = "cyberpunk420";
  const { data } = await sb
    .from("bids")
    .insert([{ meme_id, user_id, credits }])
    .select();
  io.emit("new-bid", { meme_id, user_id, credits: data[0].credits });
  res.json(data[0]);
});

app.post("/memes/:id/vote", async (req, res) => {
  const { type } = req.body;
  const inc = type === "up" ? 1 : -1;
  await sb.rpc("increment_upvotes", { meme_id: req.params.id, inc });
  const { data } = await sb
    .from("memes")
    .select("upvotes")
    .eq("id", req.params.id);
  io.emit("vote", { meme_id: req.params.id, upvotes: data[0].upvotes });
  res.json({ upvotes: data[0].upvotes });
});

http.listen(4000, () => console.log("Server on 4000"));
