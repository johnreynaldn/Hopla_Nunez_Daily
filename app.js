const SAMPLE_DATA = `351-DJ Montierde\t28\t28\t0\t00:00:03\t00:00:12\t00:05:44\t02:40:41\t0%\t
388-Michelle Amatong\t18\t18\t0\t00:00:06\t00:00:11\t00:06:01\t01:48:31\t0%\t
408-Mary Ann Pabalinas\t20\t20\t0\t00:00:08\t00:00:13\t00:06:00\t02:00:06\t0%\t
453-Marisol Anog\t28\t28\t0\t00:00:05\t00:00:10\t00:03:09\t01:28:15\t0%\t
463-Ken Peduhan\t16\t16\t0\t00:00:06\t00:00:14\t00:06:19\t01:41:07\t0%\t
494-Jean Dioso\t14\t14\t0\t00:00:06\t00:00:11\t00:06:13\t01:27:13\t0%\t
576-Czarienne Santiago\t42\t41\t1\t00:00:05\t00:00:16\t00:03:55\t02:40:38\t2.38%\t
589-Cil Pepito\t20\t20\t0\t00:00:05\t00:00:10\t00:06:33\t02:11:02\t0%\t
598-My Libona\t20\t20\t0\t00:00:06\t00:00:12\t00:04:13\t01:24:22\t0%\t
602-Joevelyn Baylon\t22\t22\t0\t00:00:08\t00:00:16\t00:04:10\t01:31:48\t0%\t
807-Mylene Diaz\t21\t21\t0\t00:00:03\t00:00:07\t00:05:34\t01:57:02\t0%`;

const STATUS_STATES = ['ON CALL', 'BREAK', 'LUNCH', 'OFF', 'OUT'];
const STORAGE_KEY = 'hopla_nunez_report_settings_v4';
const HISTORY_KEY = 'hopla_nunez_shift_history_v1';
let parsedAgents = [];
let customTrackerNotes = {};
let saveBadgeTimer = null;

function flashSaveBadge(msg = '✓ Settings Auto-Saved') {
  const badge = document.getElementById('saveStatusBadge');
  if (!badge) return;
  badge.textContent = msg;
  badge.style.background = 'rgba(16, 185, 129, 0.35)';
  clearTimeout(saveBadgeTimer);
  saveBadgeTimer = setTimeout(() => {
    badge.style.background = 'rgba(16, 185, 129, 0.18)';
  }, 900);
}

function getIsoWeekLabel() {
  const now = new Date();
  const temp = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((temp - yearStart) / 86400000) + 1) / 7);
  return `W${weekNo}`;
}

function saveSettings() {
  const statusMap = {};
  parsedAgents.forEach(a => { statusMap[a.name] = a.status; });

  const settings = {
    rawInput: document.getElementById('rawInput').value,
    teamTag: document.getElementById('teamTagInput').value,
    supervisor: document.getElementById('supervisorInput').value,
    scheduled: document.getElementById('scheduledInput').value,
    elapsedHours: document.getElementById('elapsedHoursInput').value,
    weekLabel: document.getElementById('weekLabelInput').value,
    talkThreshold: document.getElementById('talkThresholdInput').value,
    pauseThreshold: document.getElementById('pauseThresholdInput').value,
    logoUrl: document.getElementById('logoUrlInput').value,
    statusMap,
    customTrackerNotes
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    flashSaveBadge('✓ Settings Auto-Saved');
  } catch (e) {}
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) {
      if (saved.rawInput !== undefined) document.getElementById('rawInput').value = saved.rawInput;
      if (saved.teamTag) document.getElementById('teamTagInput').value = saved.teamTag;
      if (saved.supervisor) document.getElementById('supervisorInput').value = saved.supervisor;
      if (saved.scheduled !== undefined) document.getElementById('scheduledInput').value = saved.scheduled;
      if (saved.elapsedHours) document.getElementById('elapsedHoursInput').value = saved.elapsedHours;
      if (saved.weekLabel) document.getElementById('weekLabelInput').value = saved.weekLabel;
      else document.getElementById('weekLabelInput').value = getIsoWeekLabel();
      if (saved.talkThreshold) document.getElementById('talkThresholdInput').value = saved.talkThreshold;
      if (saved.pauseThreshold) document.getElementById('pauseThresholdInput').value = saved.pauseThreshold;
      if (saved.logoUrl !== undefined) document.getElementById('logoUrlInput').value = saved.logoUrl;
      if (saved.customTrackerNotes) customTrackerNotes = saved.customTrackerNotes;
      return saved.statusMap || {};
    }
  } catch (e) {}
  document.getElementById('weekLabelInput').value = getIsoWeekLabel();
  return null;
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function refreshHistoryDropdown() {
  const select = document.getElementById('historySelect');
  const history = getHistory();
  select.innerHTML = '';

  if (history.length === 0) {
    select.innerHTML = '<option value="">-- No saved snapshots yet --</option>';
    return;
  }

  history.forEach((item, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = `${item.label} (${item.totalCalls} calls)`;
    select.appendChild(opt);
  });
}

function saveToHistory(autoPrefix = '') {
  const rawInput = document.getElementById('rawInput').value.trim();
  if (!rawInput) return;

  const now = new Date();
  const stamp = now.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const totalCalls = parsedAgents.reduce((sum, a) => sum + a.inbound, 0);
  const statusMap = {};
  parsedAgents.forEach(a => { statusMap[a.name] = a.status; });

  const entry = {
    label: autoPrefix ? `${autoPrefix} • ${stamp}` : stamp,
    totalCalls,
    rawInput,
    elapsedHours: document.getElementById('elapsedHoursInput').value,
    scheduled: document.getElementById('scheduledInput').value,
    statusMap
  };

  const history = getHistory();
  history.unshift(entry);
  if (history.length > 25) history.pop();

  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    refreshHistoryDropdown();
    flashSaveBadge('✓ Snapshot Saved to History');
  } catch (e) {}
}

function loadFromHistory() {
  const idx = document.getElementById('historySelect').value;
  if (idx === '') return;

  const history = getHistory();
  const entry = history[Number(idx)];
  if (!entry) return;

  document.getElementById('rawInput').value = entry.rawInput;
  if (entry.elapsedHours) document.getElementById('elapsedHoursInput').value = entry.elapsedHours;
  if (entry.scheduled !== undefined) document.getElementById('scheduledInput').value = entry.scheduled;

  parsedAgents = parseRawRows(entry.rawInput, entry.statusMap || {});
  saveSettings();
  renderReport();
  flashSaveBadge('✓ Loaded From History');
}

function deleteHistoryItem() {
  const idx = document.getElementById('historySelect').value;
  if (idx === '') return;

  const history = getHistory();
  history.splice(Number(idx), 1);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  refreshHistoryDropdown();
  flashSaveBadge('✓ Snapshot Deleted');
}

function quickResetRoster() {
  const currentRaw = document.getElementById('rawInput').value.trim();
  if (!currentRaw) return;

  saveToHistory('Auto-Backup');

  const lines = currentRaw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const resetLines = lines.map(line => {
    let cols = line.split('\t').map(c => c.trim());
    if (cols.length < 2) {
      cols = line.split(/\s{2,}/).map(c => c.trim());
    }
    const rawAgentCol = cols[0] || '';
    return `${rawAgentCol}\t0\t0\t0\t00:00:00\t00:00:00\t00:00:00\t00:00:00\t0%`;
  });

  parsedAgents.forEach(a => {
    if (a.status === 'OUT') a.status = 'ON CALL';
  });
  customTrackerNotes = {};

  document.getElementById('rawInput').value = resetLines.join('\n');
  document.getElementById('elapsedHoursInput').value = '1';
  generateReport(false);
  flashSaveBadge('✓ Roster Reset (Previous Shift Archived)');
}

function timeToSeconds(str) {
  if (!str) return 0;
  const parts = str.trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function formatThresholdLabel(sec) {
  if (sec >= 3600) {
    const hrs = +(sec / 3600).toFixed(1);
    return `${hrs}hr`;
  }
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`;
}

function cleanAgentName(rawName) {
  return rawName.replace(/^\d+\s*[-–—]\s*/, '').trim();
}

function getShortName(fullName) {
  const parts = fullName.split(/\s+/);
  if (parts[0].length <= 2 && parts.length > 1) {
    return `${parts[0]} ${parts[1]}`;
  }
  return parts[0];
}

function getInitials(fullName) {
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function parseRawRows(text, savedStatusMap = {}) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const agents = [];

  lines.forEach((line, idx) => {
    let cols = line.split('\t').map(c => c.trim()).filter(c => c !== '');
    if (cols.length < 7) {
      cols = line.split(/\s{2,}/).map(c => c.trim()).filter(c => c !== '');
    }
    if (cols.length < 7) return;

    const name = cleanAgentName(cols[0]);
    const inbound = parseInt(cols[1], 10) || 0;
    const missed = parseInt(cols[3], 10) || 0;
    const avgTalk = cols[6] || '00:00:00';
    const totalPause = cols[7] || '00:00:00';

    const existing = parsedAgents.find(a => a.name === name);
    const status = existing ? existing.status : (savedStatusMap[name] || 'ON CALL');

    agents.push({
      id: idx,
      name,
      inbound,
      missed,
      avgTalk,
      avgTalkSec: timeToSeconds(avgTalk),
      totalPause,
      totalPauseSec: timeToSeconds(totalPause),
      status
    });
  });

  agents.sort((a, b) => b.inbound - a.inbound || a.name.localeCompare(b.name));
  return agents;
}

function updateTimestamps() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const footerStamp = now.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  document.getElementById('dispTime').textContent = `🕒 ${timeStr}`;
  document.getElementById('dispDate').textContent = `📅 ${dateStr}`;
  document.getElementById('footerRight').textContent = `Generated ${footerStamp}`;
}

function cycleAgentStatus(index) {
  const current = parsedAgents[index].status;
  const nextIdx = (STATUS_STATES.indexOf(current) + 1) % STATUS_STATES.length;
  parsedAgents[index].status = STATUS_STATES[nextIdx];
  saveSettings();
  renderReport();
}

function generateReport(autoSaveHistory = false) {
  const rawText = document.getElementById('rawInput').value;
  parsedAgents = parseRawRows(rawText);
  saveSettings();
  renderReport();
  if (autoSaveHistory && parsedAgents.length > 0) {
    saveToHistory();
  }
}

function clearRawData() {
  document.getElementById('rawInput').value = '';
  parsedAgents = [];
  saveSettings();
  renderReport();
}

function renderReport() {
  updateTimestamps();

  const teamTag = document.getElementById('teamTagInput').value.trim() || 'HOPLA_NUNEZ • OPERATIONS';
  const supervisor = document.getElementById('supervisorInput').value.trim() || 'John Reynald D. Nuñez';
  const elapsedHours = Math.max(0.1, parseFloat(document.getElementById('elapsedHoursInput').value) || 1);
  const talkThreshSec = timeToSeconds(document.getElementById('talkThresholdInput').value || '00:05:30');
  const pauseThreshSec = timeToSeconds(document.getElementById('pauseThresholdInput').value || '01:00:00');
  const logoUrl = document.getElementById('logoUrlInput').value.trim();

  document.getElementById('dispTeamTag').textContent = teamTag;
  document.getElementById('dispSupervisor').textContent = `Lead: ${supervisor}`;
  document.getElementById('footerLeft').textContent = `${supervisor} • Operations Pulse Report`;

  const logoBox = document.getElementById('brandLogoBox');
  if (logoUrl) {
    logoBox.innerHTML = `<img src="${logoUrl}" alt="Team Logo" onerror="this.parentElement.innerHTML='<span class=\\'brand-logo-mark\\'>HN</span><span>HOPLA</span>'" />`;
  } else {
    logoBox.innerHTML = `<span class="brand-logo-mark">HN</span><span>HOPLA</span>`;
  }

  const totalInbound = parsedAgents.reduce((sum, a) => sum + a.inbound, 0);
  const totalMissed = parsedAgents.reduce((sum, a) => sum + a.missed, 0);
  const answerRate = totalInbound > 0 ? (((totalInbound - totalMissed) / totalInbound) * 100).toFixed(1) : '100.0';
  const maxInbound = parsedAgents.length > 0 ? Math.max(...parsedAgents.map(a => a.inbound), 1) : 1;

  const onCallCount = parsedAgents.filter(a => a.status === 'ON CALL').length;
  const breakCount = parsedAgents.filter(a => a.status === 'BREAK' || a.status === 'LUNCH').length;
  const offCount = parsedAgents.filter(a => a.status === 'OFF').length;
  const outCount = parsedAgents.filter(a => a.status === 'OUT').length;
  const presentCount = parsedAgents.length - offCount;
  const scheduledInput = parseInt(document.getElementById('scheduledInput').value, 10);
  const scheduledCount = !isNaN(scheduledInput) && scheduledInput > 0 ? scheduledInput : parsedAgents.length;

  document.getElementById('dispAnswerRate').textContent = `${answerRate}%`;
  document.getElementById('dispMissedSummary').textContent = `${totalMissed} missed total`;
  document.getElementById('dispHeadcount').textContent = `${presentCount} / ${scheduledCount}`;
  document.getElementById('dispTotalCallsBadge').textContent = `${totalInbound} total calls`;
  document.getElementById('kpiTotalInbound').textContent = totalInbound;
  document.getElementById('kpiOnCall').textContent = onCallCount;
  document.getElementById('kpiBreak').textContent = breakCount;
  document.getElementById('kpiAbsent').textContent = offCount + outCount;

  const tbody = document.getElementById('leaderboardBody');
  tbody.innerHTML = '';

  if (parsedAgents.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="center" style="padding: 32px; color: #64748b; font-weight: 500;">Paste your dialer data above and click <strong>Generate Report</strong>.</td></tr>`;
  }

  parsedAgents.forEach((agent, idx) => {
    const rank = idx + 1;
    const tr = document.createElement('tr');
    if (rank === 1) tr.classList.add('top-1');
    else if (rank === 2) tr.classList.add('top-2');
    else if (rank === 3) tr.classList.add('top-3');
    if (agent.status === 'OUT') tr.classList.add('row-out');

    const rankLabel = String(rank).padStart(2, '0');
    let rankClass = 'rank-tag';
    if (rank === 1) rankClass += ' r1';
    else if (rank === 2) rankClass += ' r2';
    else if (rank === 3) rankClass += ' r3';

    const initials = getInitials(agent.name);
    const avgPerHour = (agent.inbound / elapsedHours).toFixed(1);
    const barPct = Math.round((agent.inbound / maxInbound) * 100);

    let statusClass = 'status-oncall';
    if (agent.status === 'BREAK' || agent.status === 'LUNCH') statusClass = 'status-break';
    else if (agent.status === 'OFF') statusClass = 'status-off';
    else if (agent.status === 'OUT') statusClass = 'status-out';

    const talkHtml = agent.avgTalkSec > talkThreshSec
      ? `<span class="time-alert-pill">${agent.avgTalk}</span>`
      : agent.avgTalk;

    const missedHtml = agent.missed > 0
      ? `<span class="missed-num missed-alert">${agent.missed}</span>`
      : `<span class="missed-num">${agent.missed}</span>`;

    tr.innerHTML = `
      <td>
        <div class="agent-cell">
          <span class="${rankClass}">${rankLabel}</span>
          <div class="avatar-circle">${initials}</div>
          <div class="agent-name">${agent.name}</div>
        </div>
      </td>
      <td class="center">
        <div class="volume-cell">
          <span class="inbound-num">${agent.inbound}</span>
          <div class="vol-bar-track"><div class="vol-bar-fill" style="width: ${barPct}%;"></div></div>
        </div>
      </td>
      <td class="center"><span class="avg-hour-badge">${avgPerHour}/hr</span></td>
      <td class="center">
        <span class="status-pill ${statusClass}" onclick="cycleAgentStatus(${idx})" title="Click to toggle status">
          ${agent.status}
        </span>
      </td>
      <td class="center">${missedHtml}</td>
      <td class="center mono-time">${talkHtml}</td>
      <td class="center mono-time">${agent.totalPause}</td>
    `;
    tbody.appendChild(tr);
  });

  const highPauseAgents = parsedAgents.filter(a => a.totalPauseSec > pauseThreshSec);
  const highTalkAgents = parsedAgents.filter(a => a.avgTalkSec > talkThreshSec);
  const missedCallAgents = parsedAgents.filter(a => a.missed > 0);
  const pauseLabel = formatThresholdLabel(pauseThreshSec);
  const talkLabel = formatThresholdLabel(talkThreshSec);

  const issueList = document.getElementById('issueList');
  const issues = [];
  if (highPauseAgents.length > 0) {
    issues.push(`High pause time (>${pauseLabel}): ${highPauseAgents.map(a => getShortName(a.name)).join(', ')}`);
  }
  if (highTalkAgents.length > 0) {
    issues.push(`Elevated avg talk time (>${talkLabel}): ${highTalkAgents.map(a => getShortName(a.name)).join(', ')}`);
  }
  if (missedCallAgents.length > 0) {
    issues.push(`Missed inbound calls recorded: ${missedCallAgents.map(a => `${getShortName(a.name)} (${a.missed})`).join(', ')}`);
  }
  if (issues.length === 0) {
    issues.push('No threshold breaches detected this hour across pause, talk time, or missed calls.');
  }
  issueList.innerHTML = issues.map(item => `<li>${item}</li>`).join('');

  const actionList = document.getElementById('actionList');
  const actions = [];
  if (highPauseAgents.length > 0) {
    actions.push(`Follow up with ${highPauseAgents.map(a => getShortName(a.name)).join(', ')} regarding pause time compliance.`);
  }
  if (highTalkAgents.length > 0) {
    actions.push(`Coach ${highTalkAgents.map(a => getShortName(a.name)).join(', ')} on call pacing to bring AHT under ${talkLabel}.`);
  }
  if (missedCallAgents.length > 0) {
    actions.push('Verify queue availability and aux codes for agents with missed calls.');
  }
  actions.push('Next hourly pulse update scheduled at the top of the hour.');
  actionList.innerHTML = actions.map(item => `<li>${item}</li>`).join('');

  const summaryList = document.getElementById('summaryList');
  const avgVol = parsedAgents.length > 0 ? (totalInbound / parsedAgents.length).toFixed(1) : '0.0';
  const top3 = parsedAgents.slice(0, 3).map(a => `${getShortName(a.name)} (${a.inbound})`).join(', ');

  const summaries = [
    `Team handled ${totalInbound} inbound calls (${answerRate}% answer rate) with ${presentCount}/${scheduledCount} active agents.`,
    top3 ? `Top volume leaders: ${top3}.` : 'No agent data loaded yet.',
    `Team average productivity: ${avgVol} calls per agent.`,
    `Live floor distribution: ${onCallCount} on call, ${breakCount} on break/lunch, ${outCount} out (shift ended), ${offCount} off.`,
    `Continuous monitoring active for AHT and aux compliance.`
  ];
  summaryList.innerHTML = summaries.map(item => `<li>${item}</li>`).join('');

  renderDailyTracker();
}

function renderDailyTracker() {
  const table = document.getElementById('dailyTrackerTable');
  if (!table) return;

  const weekInput = document.getElementById('weekLabelInput');
  const weekLabel = (weekInput && weekInput.value.trim()) ? weekInput.value.trim() : getIsoWeekLabel();

  const now = new Date();
  const dateLabel = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;

  const orderedAgents = [...parsedAgents].sort((a, b) => a.id - b.id);

  if (orderedAgents.length === 0) {
    table.innerHTML = '';
    return;
  }

  let headHtml = `<tr class="tracker-head-row">
    <th class="corner-peach"></th>
    <th class="corner-peach"></th>`;
  orderedAgents.forEach(agent => {
    headHtml += `<th class="agent-pink-head">${agent.name}</th>`;
  });
  headHtml += `</tr>`;

  let gapHtml = `<tr class="tracker-gap-row">
    <td class="week-peach-cell"></td>`;
  for (let i = 0; i <= orderedAgents.length; i++) {
    gapHtml += `<td></td>`;
  }
  gapHtml += `</tr>`;

  let valHtml = `<tr class="tracker-val-row">
    <td class="week-peach-cell">${weekLabel}</td>
    <td class="date-pink-cell">${dateLabel}</td>`;

  orderedAgents.forEach(agent => {
    let displayVal = agent.inbound;
    if (customTrackerNotes[agent.name] !== undefined && customTrackerNotes[agent.name] !== '') {
      displayVal = customTrackerNotes[agent.name];
    } else if (agent.status === 'OFF' && agent.inbound === 0) {
      displayVal = 'OFF';
    }
    const safeName = agent.name.replace(/"/g, '&quot;');
    valHtml += `<td class="val-pink-cell" contenteditable="true" data-agent="${safeName}" onblur="updateTrackerCell(this)">${displayVal}</td>`;
  });
  valHtml += `</tr>`;

  table.innerHTML = headHtml + gapHtml + valHtml;
}

function updateTrackerCell(cell) {
  const agentName = cell.getAttribute('data-agent');
  const val = cell.textContent.trim();
  const agent = parsedAgents.find(a => a.name === agentName);

  if (agent && val === String(agent.inbound)) {
    delete customTrackerNotes[agentName];
  } else {
    customTrackerNotes[agentName] = val;
  }
  saveSettings();
}

function copyTrackerRow() {
  const table = document.getElementById('dailyTrackerTable');
  if (!table) return;
  const valCells = table.querySelectorAll('tr.tracker-val-row td.val-pink-cell');
  const rowText = Array.from(valCells).map(td => td.textContent.trim().replace(/\s+/g, ' ')).join('\t');

  navigator.clipboard.writeText(rowText).then(() => {
    const btn = document.getElementById('copySheetRowBtn');
    if (btn) {
      btn.textContent = '✓ Copied Call Volumes!';
      setTimeout(() => { btn.textContent = '📋 Copy Row for Sheets'; }, 1600);
    }
  });
}

function loadSampleData() {
  document.getElementById('rawInput').value = SAMPLE_DATA;
  document.getElementById('scheduledInput').value = '';
  document.getElementById('elapsedHoursInput').value = '1';
  document.getElementById('talkThresholdInput').value = '00:05:30';
  document.getElementById('pauseThresholdInput').value = '01:00:00';
  parsedAgents = [];
  customTrackerNotes = {};
  generateReport(false);
}

function togglePresentationMode() {
  document.body.classList.toggle('presentation-mode');
}

function downloadReportPNG() {
  const target = document.getElementById('reportCapture');
  html2canvas(target, {
    scale: 2,
    backgroundColor: '#f8fafc',
    useCORS: true
  }).then(canvas => {
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.download = `Hopla_Nunez-Pulse-Report-${stamp}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
}

[
  'teamTagInput',
  'supervisorInput',
  'scheduledInput',
  'elapsedHoursInput',
  'weekLabelInput',
  'talkThresholdInput',
  'pauseThresholdInput',
  'logoUrlInput'
].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    saveSettings();
    renderReport();
  });
});

window.addEventListener('DOMContentLoaded', () => {
  const savedStatusMap = loadSettings();
  if (!savedStatusMap) {
    document.getElementById('rawInput').value = SAMPLE_DATA;
  }
  parsedAgents = parseRawRows(document.getElementById('rawInput').value, savedStatusMap || {});
  refreshHistoryDropdown();
  renderReport();
});