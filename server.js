const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const LAYOUT = [
  { zone: 'L', rows: 6, cols: 3 },
  { zone: 'M', rows: 7, cols: 4 },
  { zone: 'R', rows: 7, cols: 3 },
];

function isValidSeat(seatId) {
  const m = /^([LMR])-(\d+)-(\d+)$/.exec(seatId || '');
  if (!m) return false;
  const row = Number(m[2]);
  const col = Number(m[3]);
  const block = LAYOUT.find((b) => b.zone === m[1]);
  if (!block) return false;
  return row >= 1 && row <= block.rows && col >= 1 && col <= block.cols;
}

let seats = {}; // seatId -> { name, time }

const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || 'teacher123';

function checkAuth(req) {
  return req.headers['x-teacher-password'] === TEACHER_PASSWORD;
}

app.get('/api/seats', (req, res) => {
  res.json(seats);
});

app.post('/api/checkin', (req, res) => {
  const { seatId, name } = req.body || {};
  if (!isValidSeat(seatId)) return res.status(400).json({ error: '座位不存在' });
  const trimmed = (name || '').trim().slice(0, 20);
  if (!trimmed) return res.status(400).json({ error: '请输入姓名' });
  if (seats[seatId]) {
    return res.status(409).json({ error: `该座位已被 ${seats[seatId].name} 选择，请换一个座位` });
  }
  seats[seatId] = { name: trimmed, time: Date.now() };
  res.json({ ok: true });
});

app.post('/api/reset', (req, res) => {
  if (!checkAuth(req)) return res.status(401).json({ error: '密码错误' });
  seats = {};
  res.json({ ok: true });
});

app.delete('/api/seats/:seatId', (req, res) => {
  if (!checkAuth(req)) return res.status(401).json({ error: '密码错误' });
  delete seats[req.params.seatId];
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`listening on ${PORT}`));
