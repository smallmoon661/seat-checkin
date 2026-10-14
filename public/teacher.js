const classroom = document.getElementById('classroom');
const toast = document.getElementById('toast');

function showToast(msg, ms = 2200) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), ms);
}

const modalOverlay = document.getElementById('modalOverlay');
const modalSheet = document.getElementById('modalSheet');
const modalMessage = document.getElementById('modalMessage');
const modalInput = document.getElementById('modalInput');
const modalCancel = document.getElementById('modalCancel');
const modalOk = document.getElementById('modalOk');

let modalResolve = null;
let modalHasInput = false;

function openModal(message, { withInput = false } = {}) {
  modalHasInput = withInput;
  modalMessage.textContent = message;
  modalInput.style.display = withInput ? 'block' : 'none';
  modalInput.type = 'password';
  modalInput.value = '';
  modalOverlay.classList.add('show');
  modalSheet.classList.add('show');
  if (withInput) setTimeout(() => modalInput.focus(), 50);
  return new Promise((resolve) => {
    modalResolve = resolve;
  });
}

function closeModal(confirmed) {
  modalOverlay.classList.remove('show');
  modalSheet.classList.remove('show');
  if (modalResolve) {
    modalResolve(confirmed ? (modalHasInput ? modalInput.value : true) : null);
    modalResolve = null;
  }
}

modalCancel.addEventListener('click', () => closeModal(false));
modalOverlay.addEventListener('click', () => closeModal(false));
modalOk.addEventListener('click', () => closeModal(true));
modalInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') closeModal(true);
});

function showConfirm(message) {
  return openModal(message).then((r) => r !== null);
}

async function getPassword() {
  let pwd = localStorage.getItem('teacherPwd');
  if (!pwd) {
    pwd = await openModal('请输入教师密码（只需输入一次，会保存在本机浏览器）', { withInput: true });
    if (pwd) localStorage.setItem('teacherPwd', pwd);
  }
  return pwd;
}

function buildGrid() {
  classroom.innerHTML = '';
  LAYOUT.forEach((block) => {
    const grid = document.createElement('div');
    grid.className = 'block';
    grid.style.gridTemplateColumns = `repeat(${block.cols}, 64px)`;
    grid.style.gridTemplateRows = `repeat(${block.rows}, 44px)`;
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
  if (absentPanel.classList.contains('show')) loadAbsent();
}

async function clearSeat(seatId) {
  const el = document.getElementById(`seat-${seatId}`);
  if (!el.classList.contains('taken')) return;
  if (!(await showConfirm(`清除座位 ${el.title}（${el.textContent}）的签到记录？`))) return;
  const pwd = await getPassword();
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

const absentPanel = document.getElementById('absentPanel');
const absentSummary = document.getElementById('absentSummary');
const absentList = document.getElementById('absentList');

async function loadAbsent() {
  const res = await fetch('/api/absent');
  const { label, total, absent } = await res.json();
  absentList.innerHTML = '';
  if (total === 0) {
    absentSummary.textContent = '还没有导入名单，请先导入班级名单';
    return;
  }
  if (absent.length === 0) {
    absentSummary.textContent = `${label}：${total} 人已全部签到`;
    return;
  }
  absentSummary.textContent = `${label}：共 ${total} 人，已签到 ${total - absent.length} 人，未签到 ${absent.length} 人`;
  absent.forEach((name) => {
    const span = document.createElement('span');
    span.textContent = name;
    absentList.appendChild(span);
  });
}

document.getElementById('absentBtn').addEventListener('click', () => {
  if (absentPanel.classList.toggle('show')) loadAbsent();
});

async function loadPresetButtons() {
  const res = await fetch('/api/roster/presets');
  const presets = await res.json();
  const toolbar = document.getElementById('presetToolbar');
  toolbar.innerHTML = '';
  presets.forEach((p) => {
    const btn = document.createElement('button');
    btn.textContent = `导入${p.label}（${p.count}人）`;
    btn.addEventListener('click', async () => {
      if (!(await showConfirm(`导入${p.label}的名单？会替换当前名单。`))) return;
      const pwd = await getPassword();
      const r = await fetch('/api/roster/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Teacher-Password': pwd || '' },
        body: JSON.stringify({ key: p.key }),
      });
      const data = await r.json();
      if (r.ok) {
        showToast(`已导入${p.label}，共 ${data.count} 人`);
        loadRosterCount();
      } else {
        localStorage.removeItem('teacherPwd');
        showToast(data.error || '导入失败');
      }
    });
    toolbar.appendChild(btn);
  });
}

loadPresetButtons();

const rosterPanel = document.getElementById('rosterPanel');
const rosterCount = document.getElementById('rosterCount');
const rosterText = document.getElementById('rosterText');

document.getElementById('toggleRosterBtn').addEventListener('click', () => {
  rosterPanel.classList.toggle('show');
});

async function loadRosterCount() {
  const res = await fetch('/api/roster');
  const names = await res.json();
  rosterCount.textContent = `当前名单：${names.length} 人`;
  if (absentPanel.classList.contains('show')) loadAbsent();
}

document.getElementById('saveRosterBtn').addEventListener('click', async () => {
  const pwd = await getPassword();
  const res = await fetch('/api/roster', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Teacher-Password': pwd || '' },
    body: JSON.stringify({ text: rosterText.value }),
  });
  const data = await res.json();
  if (res.ok) {
    showToast(`名单已保存，共 ${data.count} 人`);
    rosterText.value = '';
    loadRosterCount();
  } else {
    localStorage.removeItem('teacherPwd');
    showToast(data.error || '保存失败');
  }
});

loadRosterCount();

document.getElementById('resetBtn').addEventListener('click', async () => {
  if (!(await showConfirm('确认清空全部座位，开始新的一节课？'))) return;
  const pwd = await getPassword();
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
