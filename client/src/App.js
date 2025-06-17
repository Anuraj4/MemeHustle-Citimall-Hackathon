import { useState, useEffect } from "react";
import io from "socket.io-client";
import axios from "axios";
const socket = io("http://localhost:4000");

function App() {
  const [memes, setMemes] = useState([]);
  const [memeForm, setMemeForm] = useState({
    title: "",
    image_url: "",
    tags: "",
  });

  useEffect(() => {
    axios
      .get("http://localhost:4000/leaderboard?top=20")
      .then((r) => setMemes(r.data));
    socket.on("new-meme", (meme) => setMemes((m) => [meme, ...m]));
    socket.on("new-bid", (data) =>
      setMemes((m) =>
        m.map((x) =>
          x.id === data.meme_id ? { ...x, highestBid: data.credits } : x
        )
      )
    );
    socket.on("vote", (data) =>
      setMemes((m) =>
        m.map((x) =>
          x.id === data.meme_id ? { ...x, upvotes: data.upvotes } : x
        )
      )
    );
  }, []);

  const submitMeme = async (e) => {
    e.preventDefault();
    const tags = memeForm.tags.split(",").map((t) => t.trim());
    const res = await axios.post("http://localhost:4000/memes", {
      ...memeForm,
      tags,
    });
    setMemes([res.data, ...memes]);
  };

  const bid = async (id) => {
    const credits = prompt("Enter bid credits:") || 0;
    await axios.post(`http://localhost:4000/memes/${id}/bid`, {
      credits: Number(credits),
    });
  };

  const vote = async (id, type) => {
    await axios.post(`http://localhost:4000/memes/${id}/vote`, { type });
  };

  return (
    <div className="p-4 bg-black text-white min-h-screen">
      <h1 className="text-4xl neon-glow">MemeHustle</h1>
      <form onSubmit={submitMeme} className="my-4">
        <input
          placeholder="Title"
          onChange={(e) =>
            setMemeForm((f) => ({ ...f, title: e.target.value }))
          }
        />
        <input
          placeholder="Image URL"
          onChange={(e) =>
            setMemeForm((f) => ({ ...f, image_url: e.target.value }))
          }
        />
        <input
          placeholder="Tags (comma)"
          onChange={(e) => setMemeForm((f) => ({ ...f, tags: e.target.value }))}
        />
        <button type="submit" className="bg-pink-600 px-4 py-2 neon-button">
          Create Meme
        </button>
      </form>
      <div className="grid grid-cols-3 gap-4">
        {memes.map((m) => (
          <div key={m.id} className="p-2 bg-gray-900 rounded glitch-card">
            <img src={m.image_url} alt={m.title} className="w-full" />
            <h2>{m.title}</h2>
            <p className="text-sm italic">{m.caption}</p>
            <p>
              Upvotes: {m.upvotes}{" "}
              <button onClick={() => vote(m.id, "up")}>👍</button>{" "}
              <button onClick={() => vote(m.id, "down")}>👎</button>
            </p>
            <p>Highest Bid: {m.highestBid || 0}</p>
            <button
              onClick={() => bid(m.id)}
              className="bg-blue-600 px-2 py-1 neon-button"
            >
              Bid
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
