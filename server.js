const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;
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
  return String(name || "").trim().slice(0, 12);
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
    hp: 300,
    answer: 0,
    damage: 0,
    answered: false
  };

  saveData();

  res.json({ success: true });
});

app.post("/submit-answer", (req, res) => {
  const name = cleanName(req.body.name);
  const answer = Number(req.body.answer);

  if (!name || !players[name]) {
    return res.json({
      success: false,
      message: "参加登録をしてください"
    });
  }

  if (!isAcceptingAnswers) {
    return res.json({
      success: false,
      message: "現在は回答を締め切っています"
    });
  }

  if (!Number.isFinite(answer) || answer < 0 || answer > 100) {
    return res.json({
      success: false,
      message: "0〜100で入力してください"
    });
  }

  if (players[name].answered) {
    return res.json({
      success: false,
      message: "この問題にはすでに回答済みです"
    });
  }

  players[name].answer = answer;
  players[name].answered = true;

  saveData();

  res.json({ success: true, message: "送信OK" });
});

app.post("/calculate", (req, res) => {
  const correct = Number(req.body.correct);

  players.forEach(player => {
    if (player.answer !== null) {
      const diff = Math.abs(player.answer - correct);

      player.damage = diff;

      // PERFECTなら回復
      if (diff === 0) {
        player.hp += 10;

        // 最大HPは200
        if (player.hp > 200) {
          player.hp = 200;
        }
      } else {
        // 通常ダメージ
        player.hp -= diff;

        // 0未満防止
        if (player.hp < 0) {
          player.hp = 0;
        }
      }
    }
  });

  savePlayers();

  res.json({
    success: true
  });
});

  Object.keys(players).forEach(name => {
    const player = players[name];
    const diff = Math.abs(player.answer - correct);

    player.damage = diff;
    player.hp -= diff;

    if (player.hp < 0) player.hp = 0;
  });

  saveData();
  res.json(players);
});

app.post("/next-round", (req, res) => {
  Object.keys(players).forEach(name => {
    players[name].answer = 0;
    players[name].answered = false;
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
