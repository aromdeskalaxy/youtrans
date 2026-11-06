const favoritePrefix = "favorite:";

function favoriteKey(word, language = "en") {
  const normalized = word.normalize("NFC").toLocaleLowerCase(language);
  return language === "en" ? favoritePrefix + normalized : `${favoritePrefix}${language}:${normalized}`;
}
