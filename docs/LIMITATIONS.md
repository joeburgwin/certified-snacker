# Limitations and possibilities

Rendered at `/household/about` once that page exists. Written for the household, not for engineers.

## Recipes from the web
Most recipe sites publish structured data we read directly. Some block automated fetching (Serious Eats confirmed) or sit behind a paywall (NYT Cooking). For those, use the bookmarklet from your own browser or paste the page text; on a phone, screenshot the recipe and upload it. We ignore the site's own nutrition numbers and compute our own from the ingredients. Imported recipes stay private to the household and always link back to the source.

## Video recipes
TikTok captions can be read automatically. Instagram and YouTube cannot: paste the caption or screenshot the on-screen text. If the recipe is only spoken, we cannot hear it.

## Nutrition
Estimates, not measurements. Computed values are typically within 10–15 % for energy and macros and less certain for salt and micronutrients, so numbers show "≈", kcal round to the nearest 10, and a recipe stays an "Estimate" until its ingredient matches are confirmed. Generic UK foods come from the government's CoFID 2021 dataset (2,887 items); branded products need the back-of-pack form. Balance is shown as progress bars for the day and the week, never grades or per-food red/green labels. Nutrition reflects what was planned, not what was eaten.

## Waitrose prices
Waitrose has no public API and its terms and bot protection make automated fetching unreliable and arguably not allowed. Prices are therefore your remembered prices: add them by hand, paste a product link, or paste a receipt or order email. Each price carries a freshness label; totals are a range with a coverage count ("priced 23 of 27"). We never store your Waitrose login. The list exports as plain text for Waitrose's Multi-search box.

## Cycle features
Opt-in, private to the person, and deliberately gentle. Phases are estimated from logged period starts (only about 13 % of cycles are 28 days), so they need at least three cycles and show their confidence. They switch off entirely under hormonal contraception and pause when cycles look irregular. The evidence supports two things: iron-rich meals with vitamin C when menstruating, and a little more snack room in the luteal phase. Phase-specific food lists, seed cycling and macro shifts by phase have no good evidence and are not here.

## Gym days
A one-tap chip per person per day. Hevy, Strong and Apple Health are not integrated: a web app cannot read them reliably.

## Platform
Hosted on Vercel's free tier in London with a Neon Postgres free database: the first request after a quiet spell can take a second or two. Two people editing the same week see each other's changes within about 30 seconds; there is no live sync.
