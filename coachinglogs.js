const COACHING_STORAGE_KEY = 'hopla_nunez_coaching_defaults_v2';
const BANNER_STORAGE_KEY = 'hopla_nunez_coaching_banner_v1';
const AGENT_ROSTER_MAP_KEY = 'hopla_nunez_agent_directory_v1';
let badgeTimer = null;

function flashBadge(msg = '✓ Defaults Auto-Saved') {
  const badge = document.getElementById('saveBadge');
  if (!badge) return;
  badge.textContent = msg;
  clearTimeout(badgeTimer);
  badgeTimer = setTimeout(() => {
    badge.textContent = '✓ Defaults Auto-Saved';
  }, 1500);
}

function showFallbackLogos() {
  const img = document.getElementById('outBannerImg');
  const fallback = document.getElementById('fallbackLogos');
  if (img) img.style.display = 'none';
  if (fallback) fallback.style.display = 'flex';
}

function applyBannerImage(src) {
  const img = document.getElementById('outBannerImg');
  const fallback = document.getElementById('fallbackLogos');
  if (!img) return;
  img.style.display = 'block';
  if (fallback) fallback.style.display = 'none';
  img.src = src;
}

function resetBannerLogo() {
  try {
    localStorage.removeItem(BANNER_STORAGE_KEY);
  } catch (e) {}
  document.getElementById('inBannerFile').value = '';
  applyBannerImage('header-banner.png');
  flashBadge('✓ Banner Reset');
}

function saveAgentToDirectory() {
  const name = document.getElementById('inName').value.trim();
  const ext = document.getElementById('inExt').value.trim();
  const contractor = document.getElementById('inContractor').value.trim();
  if (!name) return;

  try {
    const dir = JSON.parse(localStorage.getItem(AGENT_ROSTER_MAP_KEY)) || {};
    dir[name.toLowerCase()] = { ext, contractor };
    localStorage.setItem(AGENT_ROSTER_MAP_KEY, JSON.stringify(dir));
  } catch (e) {}
}

function lookupAgentInDirectory(name) {
  if (!name) return null;
  try {
    const dir = JSON.parse(localStorage.getItem(AGENT_ROSTER_MAP_KEY)) || {};
    return dir[name.toLowerCase()] || null;
  } catch (e) {
    return null;
  }
}

function saveDefaults() {
  const defaults = {
    position: document.getElementById('inPosition').value,
    location: document.getElementById('inLocation').value,
    link: document.getElementById('inLink').value,
    coach: document.getElementById('inCoach').value
  };
  try {
    localStorage.setItem(COACHING_STORAGE_KEY, JSON.stringify(defaults));
    saveAgentToDirectory();
    flashBadge('✓ Defaults Auto-Saved');
  } catch (e) {}
}

function loadDefaults() {
  try {
    const savedBanner = localStorage.getItem(BANNER_STORAGE_KEY);
    if (savedBanner) {
      applyBannerImage(savedBanner);
    }

    const saved = JSON.parse(localStorage.getItem(COACHING_STORAGE_KEY));
    if (saved) {
      if (saved.position) document.getElementById('inPosition').value = saved.position;
      if (saved.location) document.getElementById('inLocation').value = saved.location;
      if (saved.link) document.getElementById('inLink').value = saved.link;
      if (saved.coach) document.getElementById('inCoach').value = saved.coach;
    }
  } catch (e) {}
}

function splitCols(line) {
  let cols = line.split('\t').map(c => c.trim());
  if (cols.filter(Boolean).length < 2) {
    cols = line.split(/\s{2,}/).map(c => c.trim());
  }
  return cols;
}

function mapFieldByLabel(label, val) {
  if (!val) return false;
  const k = label.trim().toLowerCase();
  if (k === 'name' || k === 'agent name' || k === 'agent full name') {
    document.getElementById('inName').value = val;
    return true;
  }
  if (k.includes('ext')) {
    document.getElementById('inExt').value = val;
    return true;
  }
  if (k.includes('contractor')) {
    document.getElementById('inContractor').value = val;
    return true;
  }
  if (k.includes('position') || k.includes('role')) {
    document.getElementById('inPosition').value = val;
    return true;
  }
  if (k.includes('date') || k.includes('time')) {
    document.getElementById('inDateTime').value = val;
    return true;
  }
  if (k.includes('session type') || k === 'type') {
    document.getElementById('inType').value = val;
    return true;
  }
  if (k.includes('location')) {
    document.getElementById('inLocation').value = val;
    return true;
  }
  if (k === 'link' || k.includes('meet')) {
    document.getElementById('inLink').value = val;
    return true;
  }
  if (k.includes('coached by') || k === 'coach') {
    document.getElementById('inCoach').value = val;
    return true;
  }
  if (k.includes('issue')) {
    document.getElementById('inIssue').value = val;
    return true;
  }
  return false;
}

function isHeaderRow(cols) {
  const knownHeaders = ['name', 'extension id', 'ext id', 'ext', 'contractor id', 'position', 'session type', 'link', 'coached by', 'presenting issue(s)'];
  const matches = cols.filter(c => knownHeaders.includes(c.toLowerCase()));
  return matches.length >= 2;
}

/* =========================================================
   SMART AUTO-FILL PARSER (HANDLES ALL PASTE FORMATS)
   ========================================================= */
function parseAndFillCoaching(showFeedback = false) {
  const raw = document.getElementById('rawCoachingPaste').value.trim();
  if (!raw) return;

  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const consumedLineIndexes = new Set();

  // PASS 1: Check for 2-row paired blocks (Values on row i, Headers on row i+1 OR Headers on row i, Values on row i+1)
  for (let i = 0; i < lines.length - 1; i++) {
    const rowA = splitCols(lines[i]);
    const rowB = splitCols(lines[i + 1]);

    if (isHeaderRow(rowB) && rowA.length >= 2) {
      // Values on top (rowA), Headers below (rowB) — e.g. "David John Montierde | 351 | 26-103-B | Customer Support Specialist"
      rowB.forEach((header, idx) => {
        if (rowA[idx]) mapFieldByLabel(header, rowA[idx]);
      });
      consumedLineIndexes.add(i);
      consumedLineIndexes.add(i + 1);
      i++;
    } else if (isHeaderRow(rowA) && rowB.length >= 2) {
      // Headers on top (rowA), Values below (rowB)
      rowA.forEach((header, idx) => {
        if (rowB[idx]) mapFieldByLabel(header, rowB[idx]);
      });
      consumedLineIndexes.add(i);
      consumedLineIndexes.add(i + 1);
      i++;
    }
  }

  // PASS 2: Process remaining unconsumed lines
  const remainingLines = lines.filter((_, idx) => !consumedLineIndexes.has(idx));
  const leftoverNotes = [];

  remainingLines.forEach(line => {
    const cols = splitCols(line).filter(Boolean);

    // Check for inline horizontal Session Table rows: e.g. "Session Location | Gmeet | Link | https://..."
    if (cols.length === 4 && mapFieldByLabel(cols[0], cols[1])) {
      mapFieldByLabel(cols[2], cols[3]);
      return;
    }

    // Check for single "Label: Value" or "Label [Tab] Value"
    if (cols.length === 2 && mapFieldByLabel(cols[0], cols[1])) {
      return;
    }
    const colonMatch = line.match(/^([^:]+):\s*(.+)$/);
    if (colonMatch && !/^https?$/i.test(colonMatch[1].trim()) && mapFieldByLabel(colonMatch[1], colonMatch[2])) {
      return;
    }

    // Check if it's a multi-column row (Agent Info row or Scorecard row)
    if (cols.length >= 3) {
      let foundExt = '';
      let foundContractor = '';
      let foundName = '';
      let foundPosition = '';
      let foundIssue = '';
      const scorecardCols = [];
      const hasPercentages = cols.some(c => /\d+(\.\d+)?%/.test(c));

      cols.forEach(col => {
        // "351-DJ Montierde" combined format
        const prefixMatch = col.match(/^(\d{2,5})\s*[-–—]\s*(.+)$/);
        if (prefixMatch && !foundExt && !foundName) {
          foundExt = prefixMatch[1];
          foundName = prefixMatch[2].trim();
          scorecardCols.push(foundName);
          return;
        }

        // Standalone 3-4 digit Extension ID (e.g. "351")
        if (!foundExt && /^\d{3,4}$/.test(col)) {
          foundExt = col;
          return;
        }

        // Contractor ID pattern (e.g. "26-103-B")
        if (!foundContractor && /^[A-Z0-9]{1,4}-\d{2,5}(-[A-Z0-9]+)?$/i.test(col)) {
          foundContractor = col;
          return;
        }

        // Position / Title keywords
        if (!foundPosition && /(specialist|representative|agent|support|associate|lead|analyst)/i.test(col)) {
          foundPosition = col;
          return;
        }

        // Presenting Issue keywords (e.g. "PIP 1", "PIP 2", "Attendance")
        if (/^(PIP\s*\d*|Attendance|AHT|CSAT|QA|Behavior|Compliance|Coaching)/i.test(col)) {
          foundIssue = col;
        }

        // First person-like name
        if (!foundName && /^[A-Za-zÀ-ÿ .'-]{4,}$/.test(col) && !foundIssue) {
          foundName = col;
        }

        scorecardCols.push(col);
      });

      if (foundName) {
        document.getElementById('inName').value = foundName;
        const savedProfile = lookupAgentInDirectory(foundName);
        if (!foundExt && savedProfile && savedProfile.ext) foundExt = savedProfile.ext;
        if (!foundContractor && savedProfile && savedProfile.contractor) foundContractor = savedProfile.contractor;
      }
      if (foundExt) document.getElementById('inExt').value = foundExt;
      if (foundContractor) document.getElementById('inContractor').value = foundContractor;
      if (foundPosition) document.getElementById('inPosition').value = foundPosition;
      if (foundIssue) document.getElementById('inIssue').value = foundIssue;

      // Only update the Scorecard Strip if the pasted row actually contains scorecard metrics/percentages
      if (hasPercentages || scorecardCols.length >= 5) {
        document.getElementById('inScorecardRow').value = scorecardCols.join('\t');
      }
      return;
    }

    // Anything else goes into Optional Discussion Notes
    leftoverNotes.push(line);
  });

  if (leftoverNotes.length > 0) {
    document.getElementById('inNotes').value = leftoverNotes.join('\n');
  }

  saveDefaults();
  renderCoachingSheet();
  if (showFeedback) {
    flashBadge('⚡ Auto-Filled Coaching Log!');
  }
}

function loadSampleCoachingPaste() {
  document.getElementById('rawCoachingPaste').value =
    'David John Montierde\t351\t26-103-B\tCustomer Support Specialist\nName\tExtension ID\tContractor ID\tPosition';
  parseAndFillCoaching(true);
}

function renderCoachingSheet() {
  document.getElementById('outName').textContent = document.getElementById('inName').value.trim();
  document.getElementById('outExt').textContent = document.getElementById('inExt').value.trim();
  document.getElementById('outContractor').textContent = document.getElementById('inContractor').value.trim();
  document.getElementById('outPosition').textContent = document.getElementById('inPosition').value.trim();

  document.getElementById('outDateTime').textContent = document.getElementById('inDateTime').value.trim();
  document.getElementById('outType').textContent = document.getElementById('inType').value.trim();
  document.getElementById('outLocation').textContent = document.getElementById('inLocation').value.trim();

  const linkVal = document.getElementById('inLink').value.trim();
  const linkEl = document.getElementById('outLink');
  linkEl.textContent = linkVal;
  linkEl.href = linkVal.startsWith('http') ? linkVal : `https://${linkVal}`;

  document.getElementById('outCoach').textContent = document.getElementById('inCoach').value.trim();
  document.getElementById('outIssue').textContent = document.getElementById('inIssue').value.trim();
  document.getElementById('outNotes').textContent = document.getElementById('inNotes').value.trim();

  renderScorecardStrip();
}

function renderScorecardStrip() {
  const rawRow = document.getElementById('inScorecardRow').value.trim();
  const table = document.getElementById('outScorecardTable');
  table.innerHTML = '';

  if (!rawRow) return;

  let cols = rawRow.split('\t').map(c => c.trim());
  if (cols.length < 3) {
    cols = rawRow.split(/\s{2,}/).map(c => c.trim());
  }

  const tr = document.createElement('tr');
  cols.forEach((val, idx) => {
    const td = document.createElement('td');
    td.textContent = val;

    if (idx === 0) {
      td.className = 'sc-agent';
    } else if (idx === 1) {
      td.className = 'sc-sup';
    } else if (idx === 2) {
      td.className = 'sc-red-text';
    } else if (val.endsWith('%')) {
      const pct = parseFloat(val);
      if (!isNaN(pct)) {
        if (idx === cols.length - 2 && pct >= 70) {
          td.className = 'sc-red-fill';
        } else if (pct >= 70) {
          td.className = 'sc-red-text';
        }
      }
    } else if (!isNaN(parseFloat(val)) && val.includes('.')) {
      const score = parseFloat(val);
      if (score >= 4.5) td.className = 'sc-green-text';
      else if (score < 4.0) td.className = 'sc-red-text';
    }

    tr.appendChild(td);
  });

  table.appendChild(tr);
}

function setNowTimestamp() {
  const now = new Date();
  const dayDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
  const startTime = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).toLowerCase().replace(' ', '');

  const endObj = new Date(now.getTime() + 15 * 60000);
  const endTime = endObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).toLowerCase().replace(' ', '');

  document.getElementById('inDateTime').value = `${dayDate} ${startTime} – ${endTime} EST`;
  renderCoachingSheet();
}

function clearAgentFields() {
  document.getElementById('rawCoachingPaste').value = '';
  document.getElementById('inName').value = '';
  document.getElementById('inExt').value = '';
  document.getElementById('inContractor').value = '';
  document.getElementById('inScorecardRow').value = '';
  document.getElementById('inNotes').value = '';
  renderCoachingSheet();
}

function downloadCoachingPNG() {
  const target = document.getElementById('coachingCapture');
  const agentName = (document.getElementById('inName').value.trim() || 'Agent').replace(/\s+/g, '_');
  const stamp = new Date().toISOString().slice(0, 10);

  html2canvas(target, {
    scale: 2,
    backgroundColor: '#f5bfc6',
    useCORS: true
  }).then(canvas => {
    const link = document.createElement('a');
    link.download = `Coaching-Log-${agentName}-${stamp}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
}

document.getElementById('rawCoachingPaste').addEventListener('paste', () => {
  setTimeout(() => parseAndFillCoaching(true), 20);
});

document.getElementById('inBannerFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const dataUrl = ev.target.result;
    applyBannerImage(dataUrl);
    try {
      localStorage.setItem(BANNER_STORAGE_KEY, dataUrl);
      flashBadge('✓ Banner Image Saved');
    } catch (err) {
      flashBadge('✓ Banner Applied');
    }
  };
  reader.readAsDataURL(file);
});

[
  'inName', 'inExt', 'inContractor', 'inPosition',
  'inDateTime', 'inType', 'inLocation', 'inLink',
  'inCoach', 'inIssue', 'inScorecardRow', 'inNotes'
].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    saveDefaults();
    renderCoachingSheet();
  });
});

window.addEventListener('DOMContentLoaded', () => {
  loadDefaults();
  renderCoachingSheet();
});