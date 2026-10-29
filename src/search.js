const greeklishMap = {
  α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th",
  ι: "i", κ: "k", λ: "l", μ: "m", ν: "n", ξ: "x", ο: "o", π: "p",
  ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", φ: "f", χ: "ch", ψ: "ps",
  ω: "o",
};

const greeklishDigraphs = [
  [/αι/g, "ai"], [/ει/g, "ei"], [/οι/g, "oi"], [/ου/g, "ou"],
  [/αυ/g, "av"], [/ευ/g, "ev"], [/μπ/g, "mp"], [/ντ/g, "nt"],
  [/γκ/g, "g"], [/γγ/g, "ng"], [/τσ/g, "ts"], [/τζ/g, "tz"],
];

const searchStopWords = new Set([
  "parking", "park", "θεσεις", "θεση", "σταθμευση", "περιοχη", "περιοχησ",
  "area", "district", "square", "plateia", "athens", "athina", "athinae",
  "center", "centre", "of", "στην", "στο", "στη", "της", "του",
]);

const citySearchTerms = new Set([
  "αθηνα", "αθηνας", "αθηνων", "athens", "athina", "athinas", "athinon",
  "κεντρο", "kentro", "center", "centre", "of",
]);

function normalizeSearchText(value) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("el")
    .replace(/[ς]/g, "σ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function transliterateGreek(value) {
  const withDigraphs = greeklishDigraphs.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    normalizeSearchText(value),
  );
  return withDigraphs.replace(/[α-ω]/g, (letter) => greeklishMap[letter] ?? letter);
}

function editDistance(first, second) {
  let previousRow = Array.from({ length: second.length + 1 }, (_, index) => index);
  for (let row = 1; row <= first.length; row += 1) {
    const currentRow = [row];
    for (let column = 1; column <= second.length; column += 1) {
      currentRow[column] = Math.min(
        currentRow[column - 1] + 1,
        previousRow[column] + 1,
        previousRow[column - 1] + (first[row - 1] === second[column - 1] ? 0 : 1),
      );
    }
    previousRow = currentRow;
  }
  return previousRow[second.length];
}

export function isAthensWideSearch(query) {
  const tokens = normalizeSearchText(query)
    .split(/\s+/)
    .filter(
      (token) => citySearchTerms.has(token) || !searchStopWords.has(token),
    );
  return (
    tokens.length > 0 &&
    tokens.every(
      (token) =>
        citySearchTerms.has(token) ||
        citySearchTerms.has(transliterateGreek(token)),
    )
  );
}

export function matchesSearch(query, spot) {
  const queryTokens = normalizeSearchText(query)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !searchStopWords.has(token))
    .map((token) => [token, transliterateGreek(token)]);
  if (queryTokens.length === 0) return true;

  const searchableText = [
    spot.area,
    spot.landmark,
    spot.address,
    spot.name,
    transliterateGreek(spot.area),
    transliterateGreek(spot.landmark),
    transliterateGreek(spot.address),
  ].join(" ");
  const searchableTokens = normalizeSearchText(searchableText).split(/\s+/);

  return queryTokens.every((queryVariants) =>
    searchableTokens.some((candidate) => {
      return queryVariants.some((queryToken) => {
        if (candidate.includes(queryToken) || queryToken.includes(candidate)) return true;
        if (queryToken.length < 4) return false;
        return editDistance(queryToken, candidate) <= (queryToken.length > 7 ? 2 : 1);
      });
    }),
  );
}
