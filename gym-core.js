(function (root) {
  "use strict";
  const gyms = [
    { id: "apartment", name: "Apartment gym", short: "Apartment" },
    { id: "university", name: "University gym", short: "University" },
    { id: "previous", name: "Previous gym", short: "Previous gym" }
  ];
  const normalize = value => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const gymId = value => gyms.some(gym => gym.id === value) ? value : "previous";
  const gymName = value => gyms.find(gym => gym.id === gymId(value)).name;
  const unit = exercise => ["lb", "kg"].includes(exercise?.loadUnit) ? exercise.loadUnit : "unspecified";
  const unilateral = exercise => exercise?.trackingMode === "unilateral" || exercise?.unilateral === true;
  const exerciseKey = exercise => JSON.stringify([
    normalize(exercise?.name), normalize(exercise?.equipment), unilateral(exercise) ? "unilateral" : "bilateral", unit(exercise)
  ]);
  const timestamp = workout => {
    const value = Date.parse(workout.finishedAt || workout.startedAt || "");
    return Number.isFinite(value) ? value : 0;
  };
  const sessionsAt = (sessions, gym) => sessions.filter(session => gymId(session.gymId) === gymId(gym));
  const validSet = set => Number.isFinite(Number(set?.weight)) && Number(set?.weight) > 0 && Number.isInteger(Number(set?.reps)) && Number(set?.reps) > 0;
  const estimate = set => Math.round(Number(set.weight) * (1 + Number(set.reps) / 30));
  const entries = (exercise, side = null) => (exercise.sets || []).map(set => side ? set[side] : set).filter(Boolean);
  const bestSet = (exercise, side = null) => entries(exercise, side).filter(validSet).sort((a, b) => estimate(b) - estimate(a))[0] || null;
  function series(sessions, gym) {
    const result = new Map();
    for (const session of sessionsAt(sessions, gym)) {
      for (const exercise of session.exercises || []) {
        if (!normalize(exercise.name)) continue;
        for (const side of unilateral(exercise) ? ["left", "right"] : [null]) {
          if (!bestSet(exercise, side)) continue;
          const key = JSON.stringify([exerciseKey(exercise), side]);
          if (!result.has(key)) result.set(key, {
            key, exerciseKey: exerciseKey(exercise), name: String(exercise.name).trim(), equipment: String(exercise.equipment || "").trim(),
            side, unit: unit(exercise),
            detail: [exercise.equipment || "Default setup", side ? `${side === "left" ? "Left" : "Right"} side` : "Bilateral", unit(exercise) === "unspecified" ? "Unit not set" : unit(exercise)].join(" · ")
          });
        }
      }
    }
    return [...result.values()].sort((a, b) => `${a.name} ${a.detail}`.localeCompare(`${b.name} ${b.detail}`));
  }
  function points(sessions, gym, key) {
    const selected = series(sessions, gym).find(item => item.key === key);
    if (!selected) return [];
    return sessionsAt(sessions, gym).map(session => {
      const best = (session.exercises || []).filter(exercise => exerciseKey(exercise) === selected.exerciseKey)
        .map(exercise => bestSet(exercise, selected.side)).filter(Boolean).sort((a, b) => estimate(b) - estimate(a))[0];
      return best ? { sessionId: session.id, timestamp: timestamp(session), finishedAt: session.finishedAt || session.startedAt,
        weight: best.weight, reps: best.reps, rir: best.rir, estimate: estimate(best) } : null;
    }).filter(Boolean).sort((a, b) => a.timestamp - b.timestamp || String(a.sessionId).localeCompare(String(b.sessionId)));
  }
  function previous(sessions, workout, exercise) {
    if (!workout || !normalize(exercise?.name)) return null;
    const cutoff = timestamp(workout) || Infinity;
    for (const session of sessionsAt(sessions, workout.gymId).filter(item => item.id !== workout.id && timestamp(item) < cutoff).sort((a, b) => timestamp(b) - timestamp(a))) {
      const matched = (session.exercises || []).find(item => exerciseKey(item) === exerciseKey(exercise) &&
        (unilateral(item) ? ["left", "right"] : [null]).some(side => entries(item, side).some(set => Number(set.reps) > 0)));
      if (matched) return { session, exercise: matched };
    }
    return null;
  }
  const api = { gyms, gymId, gymName, unit, unilateral, exerciseKey, timestamp, sessionsAt, series, points, previous };
  root.WorkoutDomain = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
