const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = "players.json";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let players = {};
let isAcceptingAnswers = true;

if (fs.existsSync(DATA_FILE)) {
  players = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(players, null, 2));
}

function cleanName(name) {
  return String(name || "").trim().slice(0, 22);
}

app.post("/register", (req, res) => {
  const name = cleanName(req.body.name);

  if (!name) {
    return res.json({ success: false, message: "名前を入力してください" });
  }

  if (players[name]) {
    return res.json({
      success: false,
      exists: true,
      message: "この名前は既に登録されています"
    });
  }

  players[name] = {
    hp: 200,
    answer: null,
    damage: null,
    answered: false,
    perfect: false,
    perfectCount: 0
  };

  saveData();
  res.json({ success: true });
});

app.post("/submit-answer", (req, res) => {
  const name = cleanName(req.body.name);
  const answer = Number(req.body.answer);

  if (!name || !players[name]) {
    return res.json({ success: false, message: "参加登録をしてください" });
  }

  if (!isAcceptingAnswers) {
    return res.json({ success: false, message: "現在は回答を締め切っています" });
  }

  if (!Number.isFinite(answer) || answer < 0 || answer > 100) {
    return res.json({ success: false, message: "0〜100で入力してください" });
  }

  if (players[name].answered) {
    return res.json({ success: false, message: "この問題にはすでに回答済みです" });
  }

  players[name].answer = answer;
  players[name].answered = true;
  players[name].perfect = false;

  saveData();
  res.json({ success: true, message: "送信OK" });
});

app.post("/calculate", (req, res) => {
  const correct = Number(req.body.correct);

  if (!Number.isFinite(correct) || correct < 0 || correct > 100) {
    return res.json({
      success: false,
      message: "正解は0〜100で入力してください"
    });
  }

  Object.keys(players).forEach(name => {
    const player = players[name];

    if (!player.answered || player.answer === null) {
      return;
    }

    const diff = Math.abs(player.answer - correct);

    player.damage = diff;

    if (diff === 0) {
      player.perfect = true;
      player.perfectCount = (player.perfectCount || 0) + 1;
      player.hp += 10;

      if (player.hp > 300) player.hp = 300;
    } else {
      player.perfect = false;
      player.hp -= diff;

      if (player.hp < 0) player.hp = 0;
    }
  });

  saveData();
  res.json(players);
});

app.post("/next-round", (req, res) => {
  Object.keys(players).forEach(name => {
    players[name].answer = null;
    players[name].answered = false;
    players[name].perfect = false;
  });

  isAcceptingAnswers = true;
  saveData();

  res.json({ success: true });
});

app.get("/answer-status", (req, res) => {
  res.json({ isAcceptingAnswers });
});

app.post("/close-answers", (req, res) => {
  isAcceptingAnswers = false;
  res.json({ success: true });
});

app.post("/open-answers", (req, res) => {
  isAcceptingAnswers = true;
  res.json({ success: true });
});

app.get("/get-players", (req, res) => {
  res.json(players);
});

app.get("/get-player/:name", (req, res) => {
  const name = cleanName(req.params.name);
  const player = players[name];

  if (!player) {
    return res.json({ success: false });
  }

  res.json({ success: true, player });
});

app.post("/reset", (req, res) => {
  players = {};
  saveData();
  res.json({ success: true });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`http://localhost:${PORT}`);
});
