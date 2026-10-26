# Design spec: algorithms and screens (synthesised 2026-10-25)

Reference for implementers. Pseudocode is intent, not law; the vitest cases listed under each algorithm are the contract. Later critiques changed a few details (attendees derived at read time with overrides; cook_log is one row per cook with cook_log_rating per rater; tri-state recipe.diet_status; pg driver) — the implementation plan in CLAUDE.md/docs wins where they differ.

## buildShoppingList (aggregate + idempotent reconcile)

**Module**: src/domain/shopping-list.ts (pure) + src/server/actions/shopping.ts (transaction)

Turns the week's plan components into merged, aisle-grouped rows with provenance, converting within unit families and reconciling against existing rows so re-running never duplicates and never loses ticks, aisle moves or manual edits.

**Inputs**: householdId, weekStart; plan_slot+plan_component (kind='recipe') for the 7 dates; recipe + recipe_ingredient + ingredient (aisle, density, is_staple); household.include_optional_ingredients; (M3) food_portion; existing shopping_item rows

**Outputs**: shopping_list row (created if missing, version+1) with shopping_item rows inserted/updated/tombstoned; running twice with no plan change yields identical rows

```
UNIT_FAMILIES (src/domain/units.ts): mass{g:1,kg:1000,oz:28.35,lb:453.6}; volume{ml:1,l:1000,tsp:5,tbsp:15,dsp:10,cup:240,floz:28.4,pint:568}; count{each,clove,slice,can,tin,pack,bunch,sprig,handful,pinch,stalk,rasher,fillet,breast,egg}; normaliseUnit: lowercase, strip plural/period ('tbsps'->'tbsp','grams'->'g','cloves'->'clove'); unknown -> family null (kept as text)

lineToDemand(line, ingredient, factor):
  if line.is_optional && !household.include_optional_ingredients: return null
  u = normaliseUnit(line.unit)
  if line.quantity == null: return {family: u.family ?? 'count', qty: 0, unknown: true, label: u.label}
  q = line.quantity * factor
  mass   -> {family:'mass', qty: q*toBase}
  volume -> ml = q*toBase; ingredient.density_g_per_ml ? {family:'mass', qty: ml*density} : {family:'volume', qty: ml}
  count  -> (M3) p = foodPortion(line.food_code, u.label) ?? foodPortion(null, u.label); if p && ingredient.default_unit in (g,kg): {family:'mass', qty: q*p.grams} else {family:'count', qty: q, label: u.label}
  null   -> {family:'text', qty: 1, label: line.raw_text}

desired = Map()
for c in components ordered by (slot_date, meal_type, position) where c.kind='recipe':
  r = recipe(c.recipe_id); factor = c.portions / r.servings
  for line in r.lines: d = lineToDemand(line, ingredient(line), factor); if !d: continue
    ingKey = line.ingredient_id ?? 'txt:'+slug(line.name_normalised)
    key = `${ingKey}:${d.family}` + (d.family=='count' ? `:${d.label}` : '')
    item = desired.get(key) ?? {ingredient_id, family: d.family, qty: 0, unknown: false, label: d.label, provenance: []}
    item.qty += d.qty; item.unknown ||= d.unknown
    item.provenance.push({component_id: c.id, slot_date, meal_type, recipe_title: r.title, qty: d.qty, unit: d.family})
for s in ingredients where is_staple && !desired.hasIngredient(s.id): desired.set(`staple:${s.id}`, {ingredient_id: s.id, family:'count', qty: 1, source:'staple'})   // collapsed 'Check the cupboard' section

reconcile (one transaction):
  list = INSERT shopping_list(household_id, week_start) ON CONFLICT DO UPDATE SET generated_at=now(), version=version+1 RETURNING *
  existing = shopping_item WHERE list_id
  for (key, want) in desired:
    row = existing[key]
    if row && row.removed_at: continue                              // tombstone wins; never resurrect
    display = qtyDisplay(want)
    if row && row.manually_edited: UPDATE provenance only
    else if row:
      if row.checked_at && want.qty > row.qty*1.10: set checked_at=null, note='more needed since you ticked it'
      UPDATE qty, unit, qty_display, provenance, updated_at   // keep checked_at, aisle_id, position
    else: INSERT {generation_key: key, ingredient_id, display_name, aisle_id: ingredient.aisle_id, source: want.source ?? 'plan', position: nextPos(aisle)}
  for row in existing where source in ('plan','staple') && !desired.has(key) && !removed_at:
    if row.checked_at: UPDATE removed_at=now()   // bought already; folded as 'no longer in plan'
    else DELETE
  // manual rows untouched

qtyDisplay: mass: <100 -> round5+' g'; <1000 -> round10+' g'; else (kg).toFixed(1)+' kg'; volume same with ml/l; count: ceilHalf(qty)+' '+pluralise(label); text: raw; unknown -> append ' + some' (or 'some' when qty 0)
removePlanLine(id): UPDATE removed_at=now(), checked_at=null
restoreRemoved(listId): UPDATE removed_at=null WHERE list_id; then buildShoppingList
Edge cases: zero attendees -> portions 0 -> factor 0 -> lines skipped; recipe.servings 0 guarded (treat as 1); same ingredient in g and cloves stays two rows until M3 portions exist.
```

**Tests**: tests/unit/shopping-list.test.ts: run twice == identical rows; portions 2->4 doubles qty; removing a component removes its line unless manual; tombstone survives regeneration; checked flag survives qty change <=10% and is cleared when qty grows >10%; manual row untouched; 'to taste' line renders '+ some'; g + kg merge; tsp + tbsp merge to ml; cloves stay separate from g without portion row and merge with one; optional lines excluded by default; staple appears only when not already demanded; BST week (2026-03-23, 2026-10-19) date range correct

## suggest / dueForRotation / surpriseMe

**Module**: src/domain/suggest.ts + src/domain/weights.ts

Ranks recipes for a slot with hard filters (never_again, hated ingredient, diet rules, same-week repeat) then a weighted score over frequency tier, due-ness, stars, ingredient preferences, weeknight time fit, gym day, cycle phase and week nutrition gaps. Terms without data return neutral so it works from M2 and sharpens in M3/M4. Every term yields an explain entry.

**Inputs**: slot {slot_date, meal_type, attendee_person_ids, guest_count, diet_rules, max_minutes}; attendees (person rows with diet_rules, prefs, recipe_rating, day_context, cycle estimate for the viewer only); household.weeknight_prep_cap_min; weekSoFar (components in the ISO week + per-person totals); candidates (kind in kindsFor(meal_type), meal_types contains meal_type, not archived) with recipe_nutrition, effPrep, times_cooked, last_cooked_on

**Outputs**: [{recipe, score, reasons: string[]}] sorted desc; due list; surpriseMe preview assignments

```
INTERVAL = {rotation:10, time_to_time:35, if_needs_must:120, unset:21}; TIER_BASE = {rotation:1.0, time_to_time:0.6, if_needs_must:0.1, unset:0.5}
minTier(r, attendees) = most reluctant tier among attendees' recipe_rating (never_again > if_needs_must > time_to_time > rotation); unset if none
hardFilter(r):
  if any attendee tier == never_again: drop
  if any attendee hate on any non-optional line.ingredient_id: drop
  rules = union(slot.diet_rules, attendees.flatMap(diet_rules)); if !(rules ⊆ r.diet_tags): drop
  if intersect(r.tags ∪ line names, union(attendees.avoid_tags)): drop
  if r.id in weekSoFar.recipeIds && poolAfterFilters >= 3: drop
  if minTier == if_needs_must && count(others) >= 3: drop
score(r):
  tier = minTier(r); base = TIER_BASE[tier]
  days = r.last_cooked_on ? daysBetween(r.last_cooked_on, slot.slot_date) : null
  due = days == null ? 0.6 : clamp((days - 0.5*INTERVAL[tier]) / INTERVAL[tier], -0.5, 1.2)
  stars = (mean(attendees.map(stars ?? 3.5)) - 3) / 2
  pref = clamp(Σ_{attendee, line} {love:+0.15, like:+0.05, dislike:-0.4}[level], -0.8, 0.6)
  cap = slot.max_minutes ?? household.weeknight_prep_cap_min
  timeFit = (isWeekday && meal_type=='dinner') ? (effPrep(r) <= cap ? 0.3 : -0.6*(effPrep(r)-cap)/cap) : 0
  n = recipe_nutrition.per_serving (null before M3 -> gym=phase=gap=0)
  gym = 0; if meal_type in (lunch,dinner) && any attendee isGym(slot_date): need = 0.3*(weight_kg ?? 70); gym += n.protein_g >= need ? 0.35 : -0.1; gym += n.carb_g >= 50 ? 0.15 : 0
  phase = 0; for e in attendees where e == viewer && cycle.enabled && !paused:
    menstrual && n.iron_mg >= 3: phase += heavy_periods ? 0.4 : 0.3   [evidence menstrual_iron]
    luteal && meal_type=='snack' && (n.fibre_g >= 3 || n.protein_g >= 8 || n.calcium_mg >= 120): phase += 0.3   [evidence luteal_snack]
  gap = 0.5 * Σ_{k in fibre_g, fv_portions, protein_g} clamp((targetSoFar_k - totalSoFar_k)/targetSoFar_k, 0, 1) * min(1, n[k]/dailyTarget_k)
  novelty = r.times_cooked == 0 ? 0.15 : 0; variety = -0.3 if r.main_protein == adjacent-day dinner main_protein
  treat = r.is_treat && meal_type != 'snack' ? -0.15 : 0
  return 1.2*base + 0.6*stars + 1.0*due + pref + timeFit + gym + phase + gap + novelty + variety + treat + random(0, 0.1)
reasons = top 2 positive terms rendered ('in rotation · 16 days since', 'gym day · 34 g protein', 'fills fibre gap', 'luteal · higher-fibre snack')
dueForRotation(week): tier rotation && due > 0.3, plus time_to_time && due > 0.8, sorted by due desc; copy 'last cooked N weeks ago'; tier 'due' definition per tier: rotation after 10 d, time_to_time after 35 d, if_needs_must never shown as due
surpriseMe(week, mealTypes=['dinner']): for slot in empty unlocked slots ordered (date, meal): ranked = suggest(slot).slice(0,8); pick = softmaxSample(ranked, T=0.7); preview.push({slot, recipe: pick, portions: attendees+guests}); weekSoFar.add(pick). UI deals preview cards; per-card shuffle resamples excluding previous picks; Keep week commits via placeComponents.
Search: never_again recipes render dimmed at 40% with a rose dot and sort last; if_needs_must sort below unset.
```

**Tests**: tests/unit/suggest.test.ts: never_again hidden; hate filters; vegan slot only vegan-tagged; overdue rotation beats fresh time_to_time; if_needs_must appears only when pool < 3; same-week repeat excluded when pool >= 3; weeknight cap penalty ordering; gym day raises a 30 g-protein recipe above a 10 g one; menstrual phase raises iron-rich only for the viewer; softmax sampling never returns a filtered recipe; reasons contain the top term

## matchLines + computeRecipeNutrition + attribute

**Module**: src/ai/match-ingredients.ts (IO) + src/domain/nutrition.ts (pure)

Deterministic parse, cached Claude structured-output match to a CoFID food per line, deterministic gram conversion, per-recipe and per-serving totals with estimate flags and 5-a-day/variety credits, then attribution to attendees for day/week totals.

**Inputs**: recipe_ingredient rows; food (+trgm), food_alias (household first), food_portion, ingredient_line_cache; Anthropic client

**Outputs**: recipe_ingredient.food_code/grams_estimate/grams_method/match_confidence/match_source; recipe_nutrition upsert; recipe.nutrition_status; per-person day totals (computed on read)

```
matchLines(recipeId):
  for l in lines where food_code is null: norm = normalise(l.raw_text) (NFKC lowercase, unicode fractions -> decimals, strip bullets, collapse spaces); l.line_hash = sha256(norm)
    hit = cache[line_hash] -> apply(parsed, source='cache'); hits++
    else p = parseIngredient(norm)[0]; cands = SELECT code,name FROM (food.search_name UNION food_alias.alias where household_id is null or = hh) ORDER BY similarity DESC LIMIT 10 (household aliases first; prefer 'boiled/cooked' variants when desc says cooked)
    todo.push({line_id, raw: norm, parsed: p, candidates: cands})
  if todo: out = parseWithLog({model: EXTRACT, system:[{text: MATCH_PROMPT + unit guidance, cache_control:{type:'ephemeral'}}], messages:[{role:'user', content: JSON.stringify(todo)}], output_config:{format: zodOutputFormat(MatchedLines)}}, purpose:'match')
    // per line: {line_id, qty, qty_max, unit, name_normalised, preparation, is_optional, food_code: enum(candidates)|null, grams_estimate|null, confidence 0..1, note}
    if mean(confidence) < 0.6 or zod fails: retry once with ESCALATE
    write lines (match_source='llm'); upsert ingredient by name_key; INSERT cache
  computeRecipeNutrition(recipeId)
confirmLine(lineId, foodCode?): set food_code, confirmed_at=now(), match_source='manual' if changed; if changed: upsert food_alias(household, source='user_fix') and update cache; recompute
grams(l, f):
  u = normaliseUnit(l.unit); q = l.quantity
  if q == null: return {g: 0, method:'none', flag:'unknown_qty'}
  mass -> {g: q*toBase, method:'mass'}
  volume -> ml = q*toBase; d = f.density_g_per_ml ?? (f.basis=='per_100ml' ? 1.0 : null); d ? {g: ml*d, method: f.density_g_per_ml ? 'volume' : 'density'} : {g: ml*1.0, method:'density'}
  count -> p = foodPortion(f.code, u.label ?? 'each') ?? foodPortion(null, u.label); if p: {g: q*p.grams, method:'portion'}
  if l.grams_estimate: {g: l.grams_estimate, method:'llm'}
  return {g: 0, method:'none'}
computeRecipeNutrition(r):
  T = zeros(NUTRIENTS); flags = {unconfirmed:0, llm_grams:0, missing_lines:0, missing_nutrients:{}, no_energy:0}; fv = pulse = dried = juice = 0; plants = Set(); eatwell = {}
  for l in lines where !l.is_optional (unless household.include_optional_ingredients):
    if !l.food_code: flags.missing_lines++; continue
    f = food(l.food_code); {g, method} = grams(l, f); if method in ('none'): flags.missing_lines++; continue
    if method in ('llm','density'): flags.llm_grams++
    if !l.confirmed_at: flags.unconfirmed++
    amt = f.basis=='per_100ml' ? g/(f.density_g_per_ml ?? 1) : g
    for k in NUTRIENTS: f[k] != null ? T[k] += amt/100*f[k] : flags.missing_nutrients[k]++
    if f.kcal == null: flags.no_energy++
    eatwell[f.eatwell_group] += g; if f.is_plant: plants.add(f.plant_key)
    switch f.fv_kind: fresh: fv += g; pulse: pulse += g; dried: dried += g; juice: juice += g   // potato excluded
  T.salt_g = T.sodium_mg*2.5/1000; T.free_sugars_est_g = Σ sugars_g of lines where eatwell_group=='discretionary' or fv_kind=='juice' (proxy, flagged)
  fvPerRecipe = fv/80 + dried/30 + min(pulse,80)/80 + min(juice,150)/150
  perServing = T / r.servings; fv_ps = fvPerRecipe / r.servings
  npm = nutrientProfile2005(T per 100 g of total grams); r.is_treat = npm >= 4
  is_estimate = flags.unconfirmed+llm_grams+missing_lines+no_energy > 0
  status = missing_lines == lines.length ? 'missing' : is_estimate ? 'estimate' : 'verified'
  UPSERT recipe_nutrition{version+1, servings_at_calc, per_recipe, per_serving, fv_ps, plant_keys, eatwell_g, npm_score, is_estimate, flags}; UPDATE recipe.nutrition_status
attribute(component c, slot s): per = per_serving(c.recipe); A = s.attendee_person_ids; share = c.portions / max(1, |A| + s.guest_count); for p in A: dayTotals[p][s.slot_date] += per*share; leftovers: same using source recipe; note/out: 0
day fv cap: pulses max 1, juice max 1 at day level; weekTotals = Σ planned days
Display: kcal to 10, grams to 1, micronutrients bands (low/ok/good vs target), '≈' + amber Estimate badge whenever status != verified or any component recipe has llm_grams; tooltip 'database estimates are typically within 10-15% for energy; salt and micronutrients less certain'
```

**Tests**: tests/unit/nutrition.test.ts: 100 g CoFID white rice fixture -> exact per-100 values; tbsp olive oil via density; 2 cloves garlic via portion row; 'to taste' line flagged not counted; per_100ml food uses density; juice capped at 1 portion/day; pulses capped; potato not counted; status transitions missing->estimate->verified; version increments; attribution splits by attendees+guests; free_sugars proxy only from discretionary/juice

## prepTimeLearner

**Module**: src/domain/prep-time.ts

Remembers how long recipes really take: per-recipe median of the last 5 actuals once there are 3, blended with the stated time before that, plus a household run-over factor for never-cooked recipes.

**Inputs**: recipe.prep_min_stated, prep_min_learned, prep_samples; cook_log.actual_prep_min/planned_prep_min history; household.prep_factor

**Outputs**: recipe.prep_min_learned, prep_samples, household.prep_factor; effPrep(recipe) with copy

```
onCookLogged(log) [inside the cook_log transaction, only when actual_prep_min != null]:
  recent = last 5 actual_prep_min for recipe ordered by cooked_on desc (clamp each 1..600)
  n = recent.length
  learned = n >= 3 ? round5(median(recent)) : round5((stated*(3-n) + Σ recent)/3)   // stated fades out over 3 cooks; if stated null use mean(recent)
  UPDATE recipe SET prep_min_learned=learned, prep_samples=n
  L = last 20 household cook_logs with actual and planned > 0; household.prep_factor = |L| < 5 ? 1.0 : clamp(median(actual/planned), 0.7, 1.6)
effPrep(r): r.prep_samples > 0 ? r.prep_min_learned : r.prep_min_stated == null ? null : round5(r.prep_min_stated * household.prep_factor)
copy: samples>0 -> '≈ 25 min · you took 25 last time (recipe says 20)'; samples==0 && factor != 1 -> '≈ 24 min (you usually run 15% over)'; else 'Prep 20 min'
Display: shelf and planner cards, recipe sheet header, time-fit score; ritual PrepNudge preset to planned_prep_min (= effPrep snapshot) with -5 / about right / +5 / +15 / custom; 'about right' writes actual = planned.
```

**Tests**: tests/unit/prep-time.test.ts: 0 samples stated 20 factor 1 -> 20; 1 actual 30 stated 20 -> 23 (round5 25); 3 actuals [25,30,60] -> 30; outlier resistance; factor needs >=5 logs; factor clamp; null stated with samples uses mean

## estimateCyclePhase + nudges + logPeriodStarted

**Module**: src/domain/cycle.ts (pure) + src/server/actions/cycle.ts

Calendar-only phase estimate for the signed-in person from period start dates with explicit learning/irregular/overdue states, hard-off for hormonal contraception, low confidence on variability; produces evidence-tagged nudges only.

**Inputs**: cycle_consent; cycle_event.started_on desc (last 8); today (IsoDate in Europe/London)

**Outputs**: {enabled, reason?, phase: menstrual|follicular|ovulatory|luteal|unknown, day, cycleLength, confidence: ok|low, paused, nextPeriodEstimate, window, snackBonusKcal, nudgeIds[]}

```
estimate(consent, starts, today):
  if !consent || consent.revoked_at: return {enabled:false, reason:'not_opted_in'}
  if consent.hormonal_contraception: return {enabled:false, reason:'hc'}   // copy: 'Cycle features off: withdrawal bleeds aren't periods'
  if starts.length < 4: return {enabled:true, reason:'learning', logged: max(0, starts.length-1), needed: 3, phase: starts.length && daysBetween(starts[0], today)+1 <= 5 ? 'menstrual' : 'unknown'}
  lengths = diffs of consecutive starts (max 7 values); L = median(lengths); sd = stdev(lengths)
  jumps = count i where |lengths[i]-lengths[i+1]| >= 7; if jumps >= 2: return {enabled:true, paused:true, reason:'irregular'}   // STRAW+10; copy 'cycles look irregular — phase suggestions paused'
  confidence = (sd > 4.5 || any len < 21 || any len > 35) ? 'low' : 'ok'
  day = daysBetween(starts[0], today) + 1
  if day > L + 7: return {enabled:true, phase:'unknown', late:true, reason:'overdue'}   // offer to log
  ov = L - consent.luteal_days (13); mEnd = ended_on logged this cycle ? daysBetween(start, ended_on)+1 : 5
  phase = day <= mEnd ? 'menstrual' : day < ov-1 ? 'follicular' : day <= ov+1 ? 'ovulatory' : 'luteal'
  next = addDays(starts[0], L); window = ±max(2, round(sd))
  snackBonusKcal = phase=='luteal' ? 100 : 0
  nudgeIds = menstrual ? ['iron_rich_meals', heavy_periods ? 'iron_heavy' : null, 'vit_c_pairing', 'tea_coffee_timing'] : luteal ? ['luteal_snack_allowance','calcium_option','cravings_acknowledge'] : []
logPeriodStarted(personId, date=today): assert session.user_id == person.user_id; INSERT cycle_event ON CONFLICT (person_id, started_on) DO NOTHING; if previous start < 15 days ago: require confirm flag
revoke: DELETE cycle_event WHERE person_id; UPDATE cycle_consent revoked_at
UI: phase chip 'Luteal · est.' only for the viewer; every nudge opens EvidenceSheet from data/evidence.json; no macro shifts, seed cycling or food lists
```

**Tests**: tests/unit/cycle.test.ts: <4 starts -> learning; hc -> disabled; 28-day regular -> ov 15, day 20 luteal; sd>4.5 -> low; len 19 -> low; two jumps >=7 -> paused; day L+8 -> overdue; luteal bonus 100; menstrual nudge ids; heavy_periods adds iron_heavy; ended_on shortens menstrual; BST boundary dates

## energyTargets + snackRoom + balance

**Module**: src/domain/energy.ts, src/domain/balance.ts

Per-person targets from Henry/Oxford BMR x PAL (flat 2000/2500 fallback) with gym and luteal modifiers; snack and treats allowance shown as 'room left'; day and rolling-week balance bars against UK targets, never grades.

**Inputs**: person; day_context (gym); cycle estimate (viewer); dayTotals from attribute(); plant_keys over the week

**Outputs**: targets {kcalRange|null, protein_g, fibre_g 30, satfat_max_g, free_sugars_max_g 30, salt_max_g 6, fv 5, iron_mg}; {snackBudgetKcal, snackUsedKcal, roomLeftKcal, treatsBudgetKcal}; balance components 0..1

```
HENRY_MJ (verified bands only): female 18-30: 0.0546w+2.33; female 30-60: 0.0407w+2.90; male 18-30: 0.0669w+2.28; other bands null until verified vs Henry 2005 Table 25 (test.skip)
bmrKcal(p) = band ? HENRY_MJ[sex][band](weight_kg)*239 : null
tdee(p, gym) = (p.kcal_override && (p.kcal_override >= 1400 || p.kcal_override_confirmed) ? p.kcal_override : bmrKcal(p) ? bmrKcal*p.pal : (p.sex=='male' ? 2500 : 2000)) + (gym ? (day_context.gym_kcal_override ?? p.gym_kcal_bonus) : 0)
targets(p, gym, cycle): t = tdee; kcalRange = p.show_energy ? [round10(0.9t), round10(1.1t)] : null; protein_g = (p.protein_g_per_kg ?? (gym_weekdays.length >= 3 ? 1.6 : 1.2)) * (p.weight_kg ?? (male ? 80 : 65)); satfat_max_g = male ? 30 : 20; iron_mg = female && age < 50 ? 14.8 : 8.7
snackBudgetKcal = round10(t*snack_pct/100 + (gym ? 100 : 0) + (cycle.snackBonusKcal ?? 0)); treatsBudgetKcal = round10(t*treats_pct/100)
snackUsedKcal(p, date) = Σ attribute() over components in the snack slot of date for p; roomLeft = max(0, budget - used); display 'room left ≈ 180 kcal' (never negative, never 'over'); when used > budget show 'snack room used up' in neutral copy
within(x, lim) = x <= lim ? 1 : clamp(1 - (x-lim)/(0.5*lim), 0, 1)
day(p, d): T = dayTotals; fv = min(1, T.fv/5); fibre = min(1, T.fibre_g/30); protein = min(1, T.protein_g/targets.protein_g); spread = min(1, meals with protein >= 0.3*weight / 2); satfat = within(T.satfat_g, satfat_max); sugars = within(T.free_sugars_est_g, 30) (tooltip 'rough'); salt = within(T.salt_g, 6)
week(p): planned days only; variety = min(1, |distinct plant_keys|/25) shown as a count with 20-30 'great'; weekScore = 0.85*mean(dayScores) + 0.15*variety (internal, drives the 'Certified Snacker' stamp at >= 0.8; no grade shown)
Gym plate hint: gym day with no lunch/dinner having protein >= 0.3*kg && carb >= 40 shows a quiet 'post-gym plate' chip on dinner.
```

**Tests**: tests/unit/energy.test.ts and balance.test.ts: female 30y 65kg PAL1.4 -> BMR 1385, TDEE 1940; missing weight -> flat 2000; override 1200 unconfirmed -> ignored; gym adds 300 and snack +100; luteal snack +100; room left never negative; within() gradients; variety count capped; unplanned days not penalised

## importPipeline (tiered acquire -> extract -> review -> acceptImport)

**Module**: src/import/*.ts + src/ai/extract-recipe.ts + src/server/actions/imports.ts

URL, pasted text, captured HTML, image, PDF or video caption -> ExtractedRecipe with per-field confidence via JSON-LD first, Claude structured outputs second, Blob + vision for uploads; nothing is saved until reviewed.

**Inputs**: {source_type, url?, text?, html?, blob_url?}; recipe-scrapers, Readability+linkedom, Anthropic, unpdf, sharp

**Outputs**: recipe_import row (status, extracted, field_confidence, warnings); on accept: recipe + recipe_ingredient + ingredient upserts, then matchLines (M3+)

```
tier0(url): res = fetch(url, {headers: browser UA/Accept/Accept-Language en-GB, redirect:'follow', signal: timeout(10s)}); html = first 2 MB; if status in (401,403,429) or /Just a moment|cf-mitigated|captcha|Access Denied|sign in to continue/i.test(html) or html.length < 2000: status='blocked' -> UI offers bookmarklet / share / paste
tier1(html): ev = inspectRecipeEvidence(html, url); detected -> r = scrapeRecipe(html, url, {safeParse:true, parseIngredients:true, fallbackYield:'4 servings'}); conf = (r.ingredients.length > 2 && r.instructions.length > 0 && r.yields) ? 0.9 : 0.6; normalise (keep raw JSON-LD; discard site nutrition; drop Bon Appetit totalTime); conf >= 0.9 -> extracted; uncertain/partial -> tier2 with partial
tier2(html|text, partial?): doc = Readability(linkedom(html)); keep ul/ol/table, strip script/style/nav, cap ~30K tokens; out = parseWithLog({model: EXTRACT, system:[{text: prompts/extract-recipe.md, cache_control}], messages:[text + partial], output_config: zodOutputFormat(ExtractedRecipe)}, 'import'); if zod fails or perFieldConfidence.ingredients < 0.6 or steps < 0.6: retry once ESCALATE; merge: JSON-LD fields with conf >= 0.6 win
tier3(blob_url): image -> sharp EXIF rotate, <= 1568 px long edge, JPEG q85 -> vision (EXTRACT for clean screenshots, ESCALATE for handwriting/dense pages); PDF <= 20 pages -> document block; larger -> unpdf.extractText to find recipe page ranges, one chunk per request via recipe_import.chunk_cursor
tier4(url): tiktok -> oembed title -> tier2; youtube -> Data API snippet.description (YOUTUBE_API_KEY) -> tier2; instagram -> status 'needs_caption' with one-line explanation
ExtractedRecipe = {title, servings{amount, unit}, times{prep, cook, total}, ingredientGroups[{name, items[{raw, quantity, unit, name, prep, optional}]}], steps[], dietTags[], cuisine, imageUrl, perFieldConfidence{title, servings, times, ingredients, steps}, warnings[]} (zod, additionalProperties false, no min/max)
review: fields with confidence < 0.7 or warnings amber; inline edit servings/times/lines; each line: parse-ingredient qty/unit/name + household ingredient typeahead (trgm on ingredient.name_key; 'create new' default); M3+: CoFID pill; progress 'n of m lines confirmed'
acceptImport(importId): one transaction: INSERT recipe (capture_method, source_url, source_name 'Imported from <host>', kind), recipe_ingredient rows, upsert ingredient by name_key, diet_tags = computeDietTags(lines by ingredient.category), status 'saved'; then matchLines (M3+). Copyright hygiene copy on the review screen; steps/photos household-private.
```

**Tests**: tests/unit/import-normalise.test.ts: JSON-LD fixture (BBC Good Food) -> conf 0.9; uncertain fixture -> tier2 invoked; blocked markers -> 'blocked'; merge precedence; unicode fractions; ingredient group names preserved; servings fallback. tests/e2e/import-review.spec.ts: paste text -> review -> save -> recipe visible

## priceTotals + observation inputs

**Module**: src/domain/pricing.ts + src/ai/parse-receipt.ts

Basket range and coverage from the latest preferred observation per ingredient, with staleness bands, promo expiry and pack rounding; never a live call.

**Inputs**: shopping_item rows (qty, unit) with ingredient_id; price_observation latest per ingredient where is_preferred; today

**Outputs**: {lowPence, highPence, pricedCount, totalCount, staleCount, items:[{item_id, pence, band, packs}]}

```
band(obs) = age<7 ? 'fresh' : age<30 ? 'approx' : age<90 ? 'stale' : 'excluded'
for item in list where !removed_at:
  obs = latest preferred observation(ingredient_id); if !obs or band=='excluded': unpriced++; continue
  if obs.is_loose_weight && obs.unit_price_pence && item.unit in mass/volume: high = ceil(toBase(item.qty, item.unit)/toBase(1, obs.unit_uom) * obs.unit_price_pence)
  else if obs.pack_qty && sameFamily(obs.pack_unit, item.unit): packs = max(1, ceil(toBase(item.qty)/toBase(obs.pack_qty, obs.pack_unit))); high = packs*obs.pack_price_pence; item.packs_display = `${packs} × ${obs.pack_qty}${obs.pack_unit}`
  else: high = obs.pack_price_pence
  promoOk = obs.promo && (!obs.promo.expires_on || obs.promo.expires_on >= today); low = promoOk ? applyPromo(high, obs.promo) : high
  totals.low += low; totals.high += high; if band=='stale': stale++
header: '≈ £41–£46 · priced 23 of 27 · 4 prices older than a month'; '~' prefix on approx, muted on stale, '—' tap to add on unpriced
inputs: manual (price, pack); Waitrose product URL paste -> lineNumber = /\/(\d{6})-/ ; receipt/order text paste -> parseWithLog(ReceiptLines {lines[{name, pack, price_pence, unit_price_pence?, unit_uom?, promo?}]}, 'receipt') -> trgm match to ingredients with review -> observations
export: 'Copy for Waitrose Multi-search' = unchecked items one per line, <= 50 lines, display names only
flagged refresh (WAITROSE_REFRESH_ENABLED): GET www.waitrose.com/api/products-prod/v1/products/{a+b+...}?view=EXTENDED, <= 20 lineNumbers, 1 req/s, once per 24 h per product, circuit-break on 403/HTML/timeout, no retries; writes source='api'
```

**Tests**: tests/unit/pricing.test.ts: bands by age; excluded >90 d drops from totals and counts unpriced; pack rounding ceil; loose weight by unit price; promo expired -> low == high; coverage counts; Multi-search export <= 50 lines

# Screens

## Week planner (hero) — `/week/[[...weekStart]]`

See and shape the whole week; place cards; read context and balance without leaving the grid.

**Interactions**: Drag a card from the shelf onto a slot (1 px accent ring + inset tint on target); drag between slots; inline PortionsStepper (default attendees+guests; '+1 guest' chip); hover actions (lock, swap, remove, open); click opens recipe sheet; Surprise me deals preview cards into empty unlocked slots with per-card shuffle and Keep/Discard; context chips toggle gym per person and away; 'Rate last night' banner when rituals pending; empty slot shows faint '+' opening shelf search; keyboard: space lifts, arrows move, enter drops.

**Motion**: layout/layoutId settle with spring {stiffness 500, damping 38}; drag overlay scale 1.02, shadow 0 8px 24px rgba(0,0,0,.12); vacated slot collapses 220 ms (0.2,0,0,1); deal stagger 60 ms, cards fade+rise 8 px over 220 ms; shuffle rotateX 90->0 260 ms; invalid drop snaps back 220 ms; week change 200 ms ViewTransition crossfade; reduced motion: opacity 80 ms only.

**Empty state**: 'Your week is empty.' with two actions: 'Paste a recipe link' and 'Add a set breakfast' (three starter bundles shown as draggable cards); first saved card gets a single 2-cycle 'drag me' ring pulse.

## Suggestion shelf — `/week (right panel)`

Offer the next thing to place, explained in one line, biased by context.

**Interactions**: Due: carousel of rotation recipes 'last cooked 3 weeks ago'; Suggested: 8 cards with a reason row and refresh; Breakfasts and Snacks: bundle/snack cards with portions preset; Search: trgm search with diet and time filters; every card draggable plus 'Place in next empty <meal>' for keyboard; cards violating the targeted slot's diet or an attendee's hate dim to 40%.

**Motion**: Tab cross-fade 150 ms; list items enter with 20 ms stagger (max 8); carousel scroll-snap 220 ms; reason chips appear 80 ms after the card.

**Empty state**: Due: 'Rate a few dinners and your rotation appears'; Suggested: 'Add recipes to get suggestions'; Search: 'Nothing matches'.

## Recipe sheet and cook mode — `/recipes/[id], /recipes/[id]/cook`

Read and cook at the planned portions; see honest nutrition and the two-axis rating state.

**Interactions**: Image, title, 'Imported from <site>' link, effPrep copy, servings scaler synced to slot portions, ingredient lines with CoFID pills (amber unconfirmed; tap accept / search) and per-line love/hate, steps, nutrition per portion with ≈ and Estimate badge, tier + stars inline edit per person (manager switches person), cook-log history; Cook mode: large steps, keep-awake, timer chips from minutes_hint, 'Done cooking' opens the ritual.

**Motion**: ViewTransition shared element on the image 320 ms (0.32,0.72,0,1), scrim 200 ms; pill accept colour 120 ms with a 1 px tick drawing 200 ms; servings change crossfades quantities 150 ms.

**Empty state**: Library empty: 'Nothing here yet' + Import; no nutrition yet: 'Match ingredients to see nutrition'.

## Post-dinner ritual — `/cook/[cookLogId] (and sheet from banner)`

Capture stars, frequency, real prep time and eaters in 10 seconds; the engine of the app.

**Interactions**: Recipe title and image; 5 stars; four frequency words in a row with microcopy under the selected one ('Rotation — again soon', 'Time to time — a treat', 'If needs must — emergency ration', 'Never again — noted'); PrepNudge 'Said 20 min — how long really?' with -5 / about right / +5 / +15 / custom; eater avatars toggle; optional note; Done; 'Didn't cook it' marks skipped; person switcher for manager rating on behalf.

**Motion**: Star fill scale 1->1.15->1 in 120 ms; frequency underline slides 220 ms; stepper number crossfade 150 ms; Done collapses card 260 ms and the banner fades; reduced motion instant.

**Empty state**: No pending rituals: banner hidden; /cook list shows 'Nothing to rate — plan something for tonight'.

## Import and review ('tidy up') — `/import, /import/[importId]`

Bring recipes in from URL, paste, upload or video and show exactly what was understood before saving.

**Interactions**: Paste URL or text, drop a photo/PDF, 'how to capture blocked pages' (bookmarklet drag target, share target); streaming progress with step labels (Fetching, Reading structured data, Asking Claude); review: left thumbnail + provenance (site, method, model), right checklist with amber fields < 0.7, editable servings/times/lines, ingredient typeahead, CoFID pills (M3), progress 'n of m lines confirmed', Save or Save and confirm later; blocked state explains and offers bookmarklet/paste.

**Motion**: Thin indeterminate bar; warning fields get one 300 ms amber underline sweep; confirmed lines fade amber->neutral 120 ms, progress bar grows 220 ms; Estimate flips to Verified with a 260 ms crossfade; no confetti.

**Empty state**: 'Paste a link, some text, or drop a photo' with the three starter paths and a one-line note on what cannot be imported (spoken-only videos, Instagram without caption).

## Shopping list (phone, one hand) — `/shop/[[...weekStart]]`

Walk Waitrose top to bottom in aisle order, tick with a thumb, see roughly what it costs.

**Interactions**: Header: week, '≈ £41–£46 · priced 23 of 27' (M5), Copy for Multi-search; sticky aisle sections; 56 px rows, 44 px checkbox hit area, qty_display and packs_display right; tap row for provenance ('Tue dinner · Chilli', 'Thu breakfast · Granola & yogurt') and quantity override; drag/long-press an Unsorted item into an aisle (learned); checked rows slide into 'In the trolley'; Add item; staples under 'Check the cupboard'; price band tint on pence.

**Motion**: Checkbox fills 120 ms; row slides into the pile 220 ms (0.2,0,0,1); aisle header shadow 150 ms when stuck; reduced motion opacity only.

**Empty state**: 'Plan something and it shows up here' with a link to /week.

## Me — `/me, /me/cycle`

Personal context without turning the app into a diet tracker.

**Interactions**: Optional body fields with 'why we ask' and ±10% explanation; show_energy off by default; PAL picker 1.4/1.6/1.8; gym weekday pattern; snack and treats %; dislikes list; Cycle: 'Turn on cycle features' -> consent sheet (what is stored, who sees it, delete any time) -> hormonal contraception switch (explains phases off) -> heavy periods -> 'Period started' with backdate, calendar of logged starts, phase card 'estimated' with confidence; export CSV / delete all; passkey enrolment (M4).

**Motion**: Panels expand height-auto 220 ms; consent sheet 320 ms with no autoplay; phase chip fades in 150 ms when enough cycles exist.

**Empty state**: Cycle: 'Log 3 cycles to see estimates (1 of 3 logged)'; targets: 'Using the UK default of 2,000 kcal until you add details'.

## Household and About & limits — `/household, /household/about`

Manager tools and the honest limitations page (R15).

**Interactions**: Members with role, invite link copy, add a non-login person (child/guest), acting-as explanation; aisle order via motion Reorder (drag handles, keyboard); set breakfast editor with nutrition preview; staples; llm spend this month; About renders LIMITATIONS.md: nutrition accuracy, import blockers, video captions, Waitrose stance, cycle evidence.

**Motion**: Reorder 220 ms layout springs; everything else static.

**Empty state**: Bundles: 'Create your first set breakfast' with the three starters as templates.

# Design tokens

Typography: Inter variable (next/font), font-feature-settings 'tnum' on quantities and prices; scale px/line-height 11/16 meta, 13/20 UI, 15/24 body, 20/28 title, 28/34 display; weights 400/500/600; letter-spacing -0.01em at 20+. Spacing: 4 px grid; tokens 4, 8, 12, 16, 24, 32, 48; gutter 16 px; slot min-height 96 px; shelf 320 px; rail 56 px. Radii 6 controls, 10 cards, 16 sheets; hairline 1 px borders. Colour (OKLCH in @theme; dark redefinitions under @media (prefers-color-scheme: dark) guarded by :root:not([data-theme=light]) and under [data-theme=dark]): light bg oklch(0.99 0 0), surface oklch(0.975 0.003 90), raised oklch(1 0 0), border oklch(0.90 0.004 90), text oklch(0.22 0.01 90), muted oklch(0.50 0.01 90); dark bg oklch(0.17 0.005 90), surface 0.21, raised 0.24, border 0.30, text 0.93, muted 0.65. One accent herb green oklch(0.62 0.15 150) light / oklch(0.72 0.14 150) dark reserved for state, primary action and drop targets; amber oklch(0.78 0.14 75) for estimates/low confidence only; rose oklch(0.62 0.18 20) for never_again and hate only; no gradients, no per-food red/green; bars neutral fill with accent at >= 0.8. Shadows none at rest; drag overlay and sheets only. Motion: --dur-micro 120ms (hover, press, toggle, colour), --dur-move 220ms (layout, reorder, drop settle, list enter), --dur-sheet 320ms (sheets, dialogs, ViewTransition); --ease-out cubic-bezier(0,0,0.2,1), --ease-standard cubic-bezier(0.2,0,0,1), --ease-sheet cubic-bezier(0.32,0.72,0,1); springs only for drop settle {stiffness 500, damping 38}; stagger 20 ms lists / 60 ms deal, max 8. Reduced motion: durations 1 ms except opacity 80 ms; MotionConfig reducedMotion='user'; ViewTransition none. Focus 2 px accent ring offset 2 px. Icons lucide 16 px rows / 20 px rail, stroke 1.5. Density: hover-revealed actions on laptop, always visible on touch; rows 44 px desktop, 56 px phone.

# What makes it fun

The week fills like a board: cards slide out of the shelf and settle with a soft spring, portions sit on the card, and Surprise me deals a hand into the empty slots you can shuffle one at a time until it feels right. Context is a toggle, not a form: tap the gym chip on Thursday and the shelf quietly reorders with a one-line reason; turn on cycle features and a small 'Luteal · est.' dot appears with an evidence sheet one tap away. The post-dinner ritual is tiny and a little cheeky (four words, one of which is 'Never again — noted') and pays back visibly: the Due carousel fills, 'you took 25 last time' appears on the card, and the shelf stops offering what you hated. Import review is a tidy-up where amber lines turn calm. In the shop, ticked items drop into the trolley pile and the header says what it will roughly cost and how old the prices are. Nothing shouts: one accent, one typeface, no grades, no red, no calorie hero; a quiet 'Certified Snacker' stamp when the week lands well.
