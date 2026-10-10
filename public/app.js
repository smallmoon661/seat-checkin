const classroom = document.getElementById('classroom');
const sheet = document.getElementById('sheet');
const seatNameEl = document.getElementById('seatName');
const nameInput = document.getElementById('nameInput');
const confirmBtn = document.getElementById('confirmBtn');
const toast = document.getElementById('toast');

let pendingSeatId = null;
let mySeat = localStorage.getItem('mySeat');

function showToast(msg, ms = 2200) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), ms);
}

function buildGrid() {
  classroom.innerHTML = '';
  LAYOUT.forEach((block) => {
    const grid = document.createElement('div');
    grid.className = 'block';
    grid.style.gridTemplateColumns = `repeat(${block.cols}, 30px)`;
    grid.style.gridTemplateRows = `repeat(${block.rows}, 30px)`;
    for (let row = 1; row <= block.rows; row++) {
      for (let col = 1; col <= block.cols; col++) {
        const seatId = `${block.zone}-${row}-${col}`;
        const btn = document.createElement('div');
        btn.className = 'seat';
        btn.id = `seat-${seatId}`;
        btn.textContent = `${row}-${col}`;
        btn.addEventListener('click', () => onSeatClick(seatId, block.zoneName, row, col));
        grid.appendChild(btn);
      }
    }
    classroom.appendChild(grid);
  });
}

function onSeatClick(seatId, zoneName, row, col) {
  if (mySeat) {
    showToast('你已经签到过了，若选错座位请告知老师');
    return;
  }
  const el = document.getElementById(`seat-${seatId}`);
  if (el.classList.contains('taken')) {
    showToast('该座位已被选，请换一个');
    return;
  }
  pendingSeatId = seatId;
  seatNameEl.textContent = seatLabel(zoneName, row, col);
  nameInput.value = '';
  sheet.classList.add('show');
  nameInput.focus();
}

confirmBtn.addEventListener('click', async () => {
  const name = nameInput.value.trim();
  if (!name) {
    showToast('请输入姓名');
    return;
  }
  const res = await fetch('/api/checkin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seatId: pendingSeatId, name }),
  });
  const data = await res.json();
  if (res.ok) {
    mySeat = pendingSeatId;
    localStorage.setItem('mySeat', mySeat);
    sheet.classList.remove('show');
    showToast(`签到成功：${seatNameEl.textContent}`);
    loadSeats();
  } else {
    showToast(data.error || '签到失败');
    loadSeats();
  }
});

async function loadSeats() {
  const res = await fetch('/api/seats');
  const seats = await res.json();
  LAYOUT.forEach((block) => {
    for (let row = 1; row <= block.rows; row++) {
      for (let col = 1; col <= block.cols; col++) {
        const seatId = `${block.zone}-${row}-${col}`;
        const el = document.getElementById(`seat-${seatId}`);
        const info = seats[seatId];
        el.classList.remove('taken', 'mine');
        if (info) {
          el.textContent = info.name;
          el.classList.add(seatId === mySeat ? 'mine' : 'taken');
        } else {
          el.textContent = `${row}-${col}`;
        }
      }
    }
  });
}

buildGrid();
loadSeats();
setInterval(loadSeats, 3000);
