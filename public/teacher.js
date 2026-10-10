const classroom = document.getElementById('classroom');
const toast = document.getElementById('toast');

function showToast(msg, ms = 2200) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), ms);
}

function getPassword() {
  let pwd = localStorage.getItem('teacherPwd');
  if (!pwd) {
    pwd = prompt('请输入教师密码（只需输入一次，会保存在本机浏览器）');
    if (pwd) localStorage.setItem('teacherPwd', pwd);
  }
  return pwd;
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
        btn.title = seatLabel(block.zoneName, row, col);
        btn.addEventListener('click', () => clearSeat(seatId));
        grid.appendChild(btn);
      }
    }
    classroom.appendChild(grid);
  });
}

async function loadSeats() {
  const res = await fetch('/api/seats');
  const seats = await res.json();
  LAYOUT.forEach((block) => {
    for (let row = 1; row <= block.rows; row++) {
      for (let col = 1; col <= block.cols; col++) {
        const seatId = `${block.zone}-${row}-${col}`;
        const el = document.getElementById(`seat-${seatId}`);
        const info = seats[seatId];
        if (info) {
          el.textContent = info.name;
          el.classList.add('taken');
        } else {
          el.textContent = `${row}-${col}`;
          el.classList.remove('taken');
        }
      }
    }
  });
}

async function clearSeat(seatId) {
  const el = document.getElementById(`seat-${seatId}`);
  if (!el.classList.contains('taken')) return;
  if (!confirm(`清除座位 ${el.title}（${el.textContent}）的签到记录？`)) return;
  const pwd = getPassword();
  const res = await fetch(`/api/seats/${seatId}`, {
    method: 'DELETE',
    headers: { 'X-Teacher-Password': pwd || '' },
  });
  if (res.ok) {
    loadSeats();
  } else {
    localStorage.removeItem('teacherPwd');
    showToast('密码错误');
  }
}

document.getElementById('refreshBtn').addEventListener('click', loadSeats);

document.getElementById('resetBtn').addEventListener('click', async () => {
  if (!confirm('确认清空全部座位，开始新的一节课？')) return;
  const pwd = getPassword();
  const res = await fetch('/api/reset', {
    method: 'POST',
    headers: { 'X-Teacher-Password': pwd || '' },
  });
  if (res.ok) {
    showToast('已清空');
    loadSeats();
  } else {
    localStorage.removeItem('teacherPwd');
    showToast('密码错误');
  }
});

buildGrid();
loadSeats();
setInterval(loadSeats, 2000);
