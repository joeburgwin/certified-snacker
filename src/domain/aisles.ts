/** Guess a Waitrose aisle for a new ingredient from its vocabulary key. Users can re-aisle by drag; this is only a first guess. */

const RULES: Array<[RegExp, string]> = [
  [
    /\b(chicken|beef|pork|lamb|mince|steak|bacon|sausage|ham|turkey|duck|salmon|cod|haddock|prawn|tuna|mackerel|trout|sea bass|fish|chorizo|pancetta|gammon)\b/,
    "Meat & fish",
  ],
  [
    /\b(milk|butter|cheese|cheddar|parmesan|feta|mozzarella|yoghurt|yogurt|cream|egg|creme fraiche|halloumi|mascarpone|ricotta)\b/,
    "Dairy & eggs",
  ],
  [
    /\b(tofu|hummus|houmous|pesto|fresh pasta|gnocchi|dip|tortilla|wrap|olives?)\b/,
    "Chilled",
  ],
  [/\b(frozen|peas|ice cream|sweetcorn)\b/, "Frozen"],
  [
    /\b(bread|roll|bagel|pitta|naan|baguette|croissant|crumpet|muffin|sourdough)\b/,
    "Bakery",
  ],
  [
    /\b(tin|tinned|canned|chopped tomato|coconut milk|chickpeas|beans|lentils|passata|tomato puree|stock|sweetcorn|tuna|jar|paste)\b/,
    "Tins & jars",
  ],
  [
    /\b(rice|pasta|spaghetti|penne|noodles|couscous|quinoa|oats|porridge|granola|cereal|flour|bulgur|polenta|lentil)\b/,
    "Dry goods & grains",
  ],
  [
    /\b(sugar|baking powder|bicarbonate|yeast|vanilla|cocoa|chocolate|icing|cornflour|honey|syrup|dates?|raisins?|nuts?|almond|walnut|seeds?)\b/,
    "Baking",
  ],
  [
    /\b(oil|vinegar|soy|sauce|mustard|ketchup|mayonnaise|salt|pepper|cumin|paprika|turmeric|coriander seed|cinnamon|chilli flakes|curry|garam masala|oregano|thyme|bay|spice|herb|stock cube|harissa|tahini|miso|sriracha)\b/,
    "Spices & sauces",
  ],
  [
    /\b(crisps|biscuits?|crackers?|popcorn|chocolate bar|snack bar|rice cakes?)\b/,
    "Snacks",
  ],
  [/\b(juice|water|coffee|tea|squash|beer|wine|cola|lemonade)\b/, "Drinks"],
  [
    /\b(kitchen roll|foil|cling film|washing up|bin bags?|toilet roll)\b/,
    "Household",
  ],
  [
    /\b(onion|garlic|tomato|potato|carrot|pepper|chilli|lemon|lime|apple|banana|berry|berries|spinach|kale|lettuce|cucumber|courgette|aubergine|mushroom|broccoli|cauliflower|leek|celery|ginger|avocado|herbs?|parsley|basil|coriander|mint|dill|spring onion|cabbage|squash|sweet potato|orange|grape|pear|mango|salad|rocket|beetroot|fennel|asparagus|green bean|mangetout|pea shoots?)\b/,
    "Fruit & veg",
  ],
];

export function guessAisle(nameKey: string): string | null {
  for (const [re, aisle] of RULES) if (re.test(nameKey)) return aisle;
  return null;
}
