const ATTENDANCE_STORAGE_KEY = 'hopla_nunez_attendance_roster_v1';
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DEFAULT_ROSTER = [
  { cid: '26-091-B', ext: '602', name: 'Joevelyn Baylon', lob: 'Inbound', days: { Monday: 'OFF', Tuesday: '11:00 AM', Wednesday: '11:00 AM', Thursday: '11:00 AM', Friday: '11:00 AM', Saturday: '11:00 AM', Sunday: 'OFF' } },
  { cid: '26-080-B', ext: '463', name: 'Ken Joseph Peduhan', lob: 'Inbound', days: { Monday: 'OFF', Tuesday: '11:00 AM', Wednesday: '11:00 AM', Thursday: '11:00 AM', Friday: '11:00 AM', Saturday: '11:00 AM', Sunday: 'OFF' } },
  { cid: '26-079-B', ext: '450', name: 'John Reynald Nunez', lob: 'Inbound', days: { Monday: 'OFF', Tuesday: '11:00 AM', Wednesday: '11:00 AM', Thursday: '11:00 AM', Friday: '11:00 AM', Saturday: '11:00 AM', Sunday: 'OFF' } },
  { cid: '26-209-B', ext: '589', name: 'Cecil Pepito', lob: 'Inbound', days: { Monday: 'OFF', Tuesday: '11:00 AM', Wednesday: '11:00 AM', Thursday: '11:00 AM', Friday: '11:00 AM', Saturday: '11:00 AM', Sunday: 'OFF' } },
  { cid: '26-299-B', ext: '808', name: 'Jennifer Cabrera', lob: 'Inbound', days: { Monday: 'OFF', Tuesday: '11:00 AM', Wednesday: '11:00 AM', Thursday: '11:00 AM', Friday: '11:00 AM', Saturday: '11:00 AM', Sunday: 'OFF' } },
  { cid: '26-072-B', ext: '388', name: 'Michelle Antoneitte Amatong', lob: 'Inbound', days: { Monday: 'OFF', Tuesday: '11:00 AM', Wednesday: '11:00 AM', Thursday: '11:00 AM', Friday: '11:00 AM', Saturday: '11:00 AM', Sunday: 'OFF' } },
  { cid: '26-081-B', ext: '494', name: 'Michelle Jean Dioso', lob: 'Inbound', days: { Monday: 'OFF', Tuesday: '11:00 AM', Wednesday: '11:00 AM', Thursday: '11:00 AM', Friday: '11:00 AM', Saturday: '11:00 AM', Sunday: 'OFF' } },
  { cid: '26-088-B', ext: '604', name: 'Rael Aron Balajadia', lob: 'Inbound', days: { Monday: 'OFF', Tuesday: '11:00 AM', Wednesday: '11:00 AM', Thursday: '11:00 AM', Friday: '11:00 AM', Saturday: '11:00 AM', Sunday: 'OFF' } },
  { cid: '26-073-B', ext: '408', name: 'Mary Ann Pabalinas', lob: 'Inbound', days: { Monday: 'OFF', Tuesday: '11:00 AM', Wednesday: '11:00 AM', Thursday: '11:00 AM', Friday: '11:00 AM', Saturday: '11:00 AM', Sunday: 'OFF' } },
  { cid: '26-292-B', ext: '807', name: 'Mylene Diaz', lob: 'Inbound', days: { Monday: 'OFF', Tuesday: '11:00 AM', Wednesday: '11:00 AM', Thursday: '11:00 AM', Friday: '11:00 AM', Saturday: '11:00 AM', Sunday: 'OFF' } },
  { cid: '26-206-B', ext: '576', name: 'Czarienne Santiago', lob: 'Inbound', days: { Monday: 'OFF', Tuesday: '9:00 AM', Wednesday: '9:00 AM', Thursday: '11:00 AM', Friday: '11:00 AM', Saturday: '11:00 AM', Sunday: 'OFF' } },
  { cid: '26-103-B', ext: '351', name: 'David John Montierde', lob: 'Inbound', days: { Monday: 'OFF', Tuesday: '9:00 AM', Wednesday: '9:00 AM', Thursday: '11:00 AM', Friday: '11:00 AM', Saturday: '11:00 AM', Sunday: 'OFF' } },
  { cid: '26-204-B', ext: '598', name: 'Myla Libona', lob: 'Inbound - HO Buffer', days: { Monday: '11:00 AM', Tuesday: '11:00 AM', Wednesday: '11:00 AM', Thursday: 'OFF', Friday: 'OFF', Saturday: '11:00 AM', Sunday: '11:00 AM' } }
];

let rosterData = [];
let activeEditTarget = null;
let saveBadgeTimer = null;

function flashSaveBadge(msg = '✓ Roster Auto-Saved') {
  const badge = document.getElementById('attSaveBadge');
  if (!badge) return;
  badge.textContent = msg;
  clearTimeout(saveBadgeTimer);
  saveBadgeTimer = setTimeout(() => {
    badge.textContent = '✓ Roster Auto-Saved';
  }, 1500);
}

function saveRoster() {
  try {
    localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(rosterData));
    flashSaveBadge('✓ Roster Auto-Saved');
  } catch (e) {}
}

function loadRoster() {
  try {
    const saved = JSON.parse(localStorage.getItem(ATTENDANCE_STORAGE_KEY));
    if (Array.isArray(saved) && saved.length > 0) {
      rosterData = saved;
      return;
    }
  } catch (e) {}
  rosterData = JSON.parse(JSON.stringify(DEFAULT_ROSTER));
}

function resetDefaultRoster() {
  rosterData = JSON.parse(JSON.stringify(DEFAULT_ROSTER));
  saveRoster();
  renderAttendance();
  flashSaveBadge('✓ Reset to Default 13-Agent Roster');
}

function getSelectedDay() {
  const val = document.getElementById('activeDaySelect').value;
  if (val !== 'AUTO') return val;
  const now = new Date();
  return now.toLocaleDateString('en-US', { weekday: 'long' });
}

function getShiftClass(val) {
  const v = (val || '').trim().toUpperCase();
  if (v === 'OFF') return 'shift-off';
  if (v.includes('LOA') || v.includes('LEAVE') || v.includes('ABSENT')) return 'shift-loa';
  if (v.includes('SWAP')) return 'shift-swap';
  if (v.startsWith('9:')) return 'shift-9';
  return 'shift-11';
}

function renderAttendance() {
  const activeDay = getSelectedDay();
  const search = (document.getElementById('searchAgentInput').value || '').trim().toLowerCase();
  const now = new Date();
  const fullDateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  document.getElementById('attDateSubtitle').textContent = `Active Shift Day: ${activeDay} • Today's Date: ${fullDateStr}`;
  document.getElementById('attFooterStamp').textContent = `John Reynald D. Nuñez • Updated ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

  // Highlight active day column header
  document.querySelectorAll('#scheduleHeaderRow th[data-day]').forEach(th => {
    if (th.getAttribute('data-day') === activeDay) {
      th.classList.add('today-col-head');
    } else {
      th.classList.remove('today-col-head');
    }
  });

  // Calculate stats for the active day
  let onShift11 = 0;
  let onShift9 = 0;
  let onShiftOther = 0;
  let offCount = 0;
  let exceptionList = [];
  const scheduledChips = [];

  rosterData.forEach(agent => {
    const shiftVal = (agent.days[activeDay] || 'OFF').trim();
    const upper = shiftVal.toUpperCase();

    if (upper === 'OFF') {
      offCount++;
    } else if (upper.includes('LOA') || upper.includes('LEAVE')) {
      exceptionList.push(`${agent.name.split(' ')[0]} (LOA)`);
      scheduledChips.push({ ext: agent.ext, name: agent.name, shift: shiftVal, type: 'chip-loa' });
    } else if (upper.includes('SWAP')) {
      exceptionList.push(`${agent.name.split(' ')[0]} (Swap)`);
      onShiftOther++;
      scheduledChips.push({ ext: agent.ext, name: agent.name, shift: shiftVal, type: 'chip-swap' });
    } else if (upper.startsWith('9:')) {
      onShift9++;
      scheduledChips.push({ ext: agent.ext, name: agent.name, shift: shiftVal, type: 'chip-9' });
    } else {
      onShift11++;
      scheduledChips.push({ ext: agent.ext, name: agent.name, shift: shiftVal, type: 'chip-11' });
    }
  });

  const totalOnShift = onShift11 + onShift9 + onShiftOther;
  document.getElementById('statOnShift').textContent = totalOnShift;
  document.getElementById('statShiftBreakdown').textContent = `${onShift11} @ 11:00 AM • ${onShift9} @ 9:00 AM`;
  document.getElementById('statOff').textContent = offCount;
  document.getElementById('statTotalRoster').textContent = `${rosterData.length} total agents`;
  document.getElementById('statExceptions').textContent = exceptionList.length;
  document.getElementById('statExceptionNames').textContent = exceptionList.length > 0 ? exceptionList.join(', ') : 'No LOA or Swaps';

  document.getElementById('todayStripTitle').textContent = `✅ SCHEDULED AGENTS FOR ${activeDay.toUpperCase()} (${totalOnShift} ON SHIFT):`;
  const chipsContainer = document.getElementById('todayAgentChips');
  if (scheduledChips.length === 0) {
    chipsContainer.innerHTML = `<span style="font-size:12px; color:#64748b;">No agents scheduled on ${activeDay}.</span>`;
  } else {
    chipsContainer.innerHTML = scheduledChips.map(c => `
      <span class="agent-chip ${c.type}">
        <span class="chip-ext">${c.ext}</span>
        <span>${c.name}</span>
        <strong>(${c.shift})</strong>
      </span>
    `).join('');
  }

  // Render Table Rows
  const tbody = document.getElementById('scheduleTableBody');
  tbody.innerHTML = '';

  rosterData.forEach((agent, rowIndex) => {
    if (search && !agent.name.toLowerCase().includes(search) && !agent.ext.toLowerCase().includes(search) && !agent.cid.toLowerCase().includes(search)) {
      return;
    }

    const tr = document.createElement('tr');
    const lobClass = agent.lob.toLowerCase().includes('buffer') ? 'cell-lob-buffer' : '';

    let cellsHtml = `
      <td>${agent.cid}</td>
      <td>${agent.ext}</td>
      <td>${agent.name}</td>
      <td class="${lobClass}">${agent.lob}</td>
    `;

    DAYS_OF_WEEK.forEach(day => {
      const val = agent.days[day] || 'OFF';
      const sClass = getShiftClass(val);
      const todayHighlight = day === activeDay ? 'today-col-cell' : '';
      cellsHtml += `<td class="shift-cell ${sClass} ${todayHighlight}" onclick="openShiftPopover(event, ${rowIndex}, '${day}')">${val}</td>`;
    });

    cellsHtml += `
      <td data-html2canvas-ignore="true">
        <button type="button" class="remove-row-btn" onclick="removeAgentRow(${rowIndex})" title="Remove agent">🗑️</button>
      </td>
    `;

    tr.innerHTML = cellsHtml;
    tbody.appendChild(tr);
  });
}

function openShiftPopover(event, rowIndex, day) {
  event.stopPropagation();
  activeEditTarget = { rowIndex, day };

  const agent = rosterData[rowIndex];
  const pop = document.getElementById('cellPopover');
  document.getElementById('popAgentTitle').textContent = `${agent.name} • ${day}`;
  document.getElementById('popCustomInput').value = agent.days[day] || '';

  pop.style.display = 'block';
  const rect = event.target.getBoundingClientRect();
  const topPos = Math.min(window.innerHeight - 210, rect.bottom + 4);
  const leftPos = Math.min(window.innerWidth - 260, Math.max(10, rect.left));
  pop.style.top = `${topPos}px`;
  pop.style.left = `${leftPos}px`;
}

function applyQuickShift(newVal) {
  if (!activeEditTarget) return;
  const { rowIndex, day } = activeEditTarget;
  rosterData[rowIndex].days[day] = newVal;
  closePopover();
  saveRoster();
  renderAttendance();
}

function applyCustomShift() {
  if (!activeEditTarget) return;
  const customVal = document.getElementById('popCustomInput').value.trim();
  if (!customVal) return;
  applyQuickShift(customVal);
}

function closePopover() {
  const pop = document.getElementById('cellPopover');
  if (pop) pop.style.display = 'none';
  activeEditTarget = null;
}

function addAgentRow() {
  const cid = document.getElementById('newCid').value.trim() || '26-000-B';
  const ext = document.getElementById('newExt').value.trim() || '000';
  const name = document.getElementById('newName').value.trim();
  const lob = document.getElementById('newLob').value;
  const pattern = document.getElementById('newPattern').value;

  if (!name) {
    alert('Please enter the agent full name.');
    return;
  }

  let days = { Monday: 'OFF', Tuesday: '11:00 AM', Wednesday: '11:00 AM', Thursday: '11:00 AM', Friday: '11:00 AM', Saturday: '11:00 AM', Sunday: 'OFF' };
  if (pattern === 'tue_sat_9_11') {
    days = { Monday: 'OFF', Tuesday: '9:00 AM', Wednesday: '9:00 AM', Thursday: '11:00 AM', Friday: '11:00 AM', Saturday: '11:00 AM', Sunday: 'OFF' };
  } else if (pattern === 'mon_wed_sat_sun_11') {
    days = { Monday: '11:00 AM', Tuesday: '11:00 AM', Wednesday: '11:00 AM', Thursday: 'OFF', Friday: 'OFF', Saturday: '11:00 AM', Sunday: '11:00 AM' };
  } else if (pattern === 'mon_fri_11') {
    days = { Monday: '11:00 AM', Tuesday: '11:00 AM', Wednesday: '11:00 AM', Thursday: '11:00 AM', Friday: '11:00 AM', Saturday: 'OFF', Sunday: 'OFF' };
  }

  rosterData.push({ cid, ext, name, lob, days });

  document.getElementById('newCid').value = '';
  document.getElementById('newExt').value = '';
  document.getElementById('newName').value = '';

  saveRoster();
  renderAttendance();
  flashSaveBadge(`✓ Added ${name}`);
}

function removeAgentRow(index) {
  const agent = rosterData[index];
  if (!agent) return;
  if (!confirm(`Remove ${agent.name} (${agent.ext}) from the schedule?`)) return;

  rosterData.splice(index, 1);
  saveRoster();
  renderAttendance();
  flashSaveBadge(`✓ Removed ${agent.name}`);
}

function toggleBulkPaste() {
  const drawer = document.getElementById('bulkPasteDrawer');
  drawer.style.display = drawer.style.display === 'none' ? 'flex' : 'none';
}

function importBulkSchedule() {
  const raw = document.getElementById('bulkSchedulePaste').value.trim();
  if (!raw) return;

  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const imported = [];

  lines.forEach(line => {
    const cols = line.split('\t').map(c => c.trim());
    if (cols.length < 4) return;
    if (cols[0].toUpperCase() === 'CID' && cols[2].toUpperCase() === 'AGENT') return;

    imported.push({
      cid: cols[0] || '',
      ext: cols[1] || '',
      name: cols[2] || '',
      lob: cols[3] || 'Inbound',
      days: {
        Monday: cols[4] || 'OFF',
        Tuesday: cols[5] || 'OFF',
        Wednesday: cols[6] || 'OFF',
        Thursday: cols[7] || 'OFF',
        Friday: cols[8] || 'OFF',
        Saturday: cols[9] || 'OFF',
        Sunday: cols[10] || 'OFF'
      }
    });
  });

  if (imported.length > 0) {
    rosterData = imported;
    saveRoster();
    renderAttendance();
    toggleBulkPaste();
    flashSaveBadge(`✓ Imported ${imported.length} Agents`);
  }
}

function copyRosterForPulse() {
  const activeDay = getSelectedDay();
  const activeAgents = rosterData.filter(a => {
    const v = (a.days[activeDay] || 'OFF').toUpperCase();
    return v !== 'OFF' && !v.includes('LOA');
  });

  const text = activeAgents.map(a => `${a.ext}-${a.name}`).join('\n');
  navigator.clipboard.writeText(text).then(() => {
    flashSaveBadge(`✓ Copied ${activeAgents.length} Active Agents for ${activeDay}`);
  });
}

function downloadSchedulePNG() {
  const target = document.getElementById('attendanceCapture');
  const day = getSelectedDay();
  html2canvas(target, {
    scale: 2,
    backgroundColor: '#f8fafc',
    useCORS: true
  }).then(canvas => {
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.download = `Hopla_Nunez-Schedule-${day}-${stamp}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
}

document.addEventListener('click', (e) => {
  const pop = document.getElementById('cellPopover');
  if (pop && pop.style.display === 'block' && !pop.contains(e.target)) {
    closePopover();
  }
});

window.addEventListener('DOMContentLoaded', () => {
  loadRoster();
  renderAttendance();
});