// storage.js - 로컬 데이터 관리 (localStorage 기반, 오프라인 완전 지원)

const Storage = (() => {
  const KEY = 'nonogram_galaxy_save';
  const VERSION = 2;

  const defaults = () => ({
    version: VERSION,
    clearedStages: [],          // 클리어한 스테이지 id 배열
    bestTimes: {},              // { stageId: seconds }
    infiniteLevel: 1,           // 무한 모드 최고 레벨
    dailyCleared: {},           // { 'YYYY-MM-DD': true }
    totalCleared: 0,
    totalPlayTime: 0,           // 초 단위 누적
    settings: {
      sfx: true,
      particles: true,
      colorScheme: 'galaxy',    // galaxy | neon | classic
    },
    lastPlayed: null,
  });

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      const data = JSON.parse(raw);
      // 버전 마이그레이션
      if (!data.version || data.version < VERSION) {
        return Object.assign(defaults(), data, { version: VERSION });
      }
      return Object.assign(defaults(), data);
    } catch (e) {
      console.warn('[Storage] load failed:', e);
      return defaults();
    }
  }

  function save(data) {
    try {
      data.lastPlayed = new Date().toISOString();
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[Storage] save failed:', e);
    }
  }

  // ── 세이브 데이터 조회/수정 헬퍼 ───────────────────────────────────────

  let _cache = null;

  function get() {
    if (!_cache) _cache = load();
    return _cache;
  }

  function persist() {
    if (_cache) save(_cache);
  }

  function markStageCleared(stageId, timeSec) {
    const d = get();
    if (!d.clearedStages.includes(stageId)) {
      d.clearedStages.push(stageId);
      d.totalCleared += 1;
    }
    if (!d.bestTimes[stageId] || timeSec < d.bestTimes[stageId]) {
      d.bestTimes[stageId] = Math.round(timeSec * 10) / 10;
    }
    persist();
  }

  function markDailyCleared(dateStr, timeSec) {
    const d = get();
    if (!d.dailyCleared[dateStr]) {
      d.dailyCleared[dateStr] = timeSec;
      d.totalCleared += 1;
    }
    persist();
  }

  function updateInfiniteLevel(level) {
    const d = get();
    if (level > d.infiniteLevel) {
      d.infiniteLevel = level;
      persist();
    }
  }

  function addPlayTime(seconds) {
    const d = get();
    d.totalPlayTime = (d.totalPlayTime || 0) + seconds;
    persist();
  }

  function isStageCleared(stageId) {
    return get().clearedStages.includes(stageId);
  }

  function getBestTime(stageId) {
    return get().bestTimes[stageId] ?? null;
  }

  function getSettings() {
    return get().settings;
  }

  function updateSetting(key, value) {
    const d = get();
    d.settings[key] = value;
    persist();
  }

  function getStats() {
    const d = get();
    return {
      cleared: d.totalCleared,
      playTime: d.totalPlayTime,
      infiniteLevel: d.infiniteLevel,
      dailyClearedCount: Object.keys(d.dailyCleared).length,
    };
  }

  function exportData() {
    return JSON.stringify(get(), null, 2);
  }

  function importData(jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      _cache = Object.assign(defaults(), parsed, { version: VERSION });
      persist();
      return true;
    } catch (e) {
      return false;
    }
  }

  function reset() {
    _cache = defaults();
    persist();
  }

  return {
    get, persist,
    markStageCleared, markDailyCleared,
    updateInfiniteLevel, addPlayTime,
    isStageCleared, getBestTime,
    getSettings, updateSetting,
    getStats, exportData, importData, reset,
  };
})();
