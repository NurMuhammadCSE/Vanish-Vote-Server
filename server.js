const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
// app.use(cors());
app.use(cors({
  origin: ["https://vanish-vote-client.vercel.app/"],  
  methods: ["GET", "POST", "PUT", "DELETE"],  // Specify allowed HTTP methods
  credentials: true  // Important if using cookies or sessions
}));


// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Poll Model
const pollSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: [
      {
        text: { type: String, required: true },
        votes: { type: Number, default: 0 },
      },
    ],
    expiresAt: { type: Date, required: true },
    resultsHidden: { type: Boolean, default: true },
    reactions: {
      likes: { type: Number, default: 0 },
      trending: { type: Number, default: 0 },
    },
    comments: [{ text: String, createdAt: { type: Date, default: Date.now } }], // Add comments field
  });
  
  const Poll = mongoose.model("Poll", pollSchema);
  
// Routes

// Home Route
app.get("/", (req, res) => {
  res.send("🚀 VanishVote Server is Running!");
});

// Create Poll
app.post("/api/polls/create", async (req, res) => {
  const { question, options, expiresIn, resultsHidden } = req.body;
  console.log(req.body);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + parseInt(expiresIn));

  const newPoll = new Poll({
    question,
    options: options.map((option) => ({ text: option })),
    expiresAt,
    resultsHidden,
  });

  try {
    const savedPoll = await newPoll.save();
    res.status(201).json(savedPoll);
  } catch (error) {
    res.status(400).json({ error: "Failed to create poll" });
  }
});

// Vote route in your backend
app.post("/api/polls/:id/vote", async (req, res) => {
  const { id } = req.params;
  const { selectedOption } = req.body;

  // Find the poll by its ID
  const poll = await Poll.findById(id);

  // Find the option object that matches the selected option's text
  const option = poll.options.find((opt) => opt.text === selectedOption);

  if (!option) {
    return res.status(404).json({ error: "Option not found" });
  }

  // Increment the vote for the selected option
  option.votes += 1;

  // Save the updated poll data
  await poll.save();

  res.json({ success: true });
});

// Fetch Poll by ID
app.get("/api/polls/:id", async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ error: "Poll not found" });
    res.status(200).json(poll);
  } catch (error) {
    res.status(400).json({ error: "Error fetching poll" });
  }
});

// Vote on a Poll
app.post("/api/polls/vote/:id", async (req, res) => {
  const { optionIndex } = req.body;
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ error: "Poll not found" });

    poll.options[optionIndex].votes += 1;
    await poll.save();

    res.status(200).json({ message: "Vote submitted successfully!" });
  } catch (error) {
    res.status(400).json({ error: "Error submitting vote" });
  }
});

// Add Reactions
app.post("/api/polls/reaction/:id", async (req, res) => {
  const { type } = req.body; // 'like' or 'trending'
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ error: "Poll not found" });

    if (type === "like") poll.reactions.likes += 1;
    if (type === "trending") poll.reactions.trending += 1;

    await poll.save();
    res.status(200).json({ message: "Reaction added successfully!" });
  } catch (error) {
    res.status(400).json({ error: "Error adding reaction" });
  }
});
// Add route for submitting comments
app.post('/api/polls/:id/comment', async (req, res) => {
    const { text } = req.body;
    try {
        const poll = await Poll.findById(req.params.id);
        if (!poll) return res.status(404).json({ error: 'Poll not found' });

        // Add the new comment to the poll's comments array
        poll.comments.push({ text });
        await poll.save();

        res.status(200).json({ message: 'Comment added successfully' });
    } catch (error) {
        res.status(400).json({ error: 'Error adding comment' });
    }
});

// Fetch comments route
app.get('/api/polls/:id/comments', async (req, res) => {
    try {
        const poll = await Poll.findById(req.params.id);
        if (!poll) return res.status(404).json({ error: 'Poll not found' });
        res.status(200).json(poll.comments); // Return all comments for the poll
    } catch (error) {
        res.status(400).json({ error: 'Error fetching comments' });
    }
});

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
