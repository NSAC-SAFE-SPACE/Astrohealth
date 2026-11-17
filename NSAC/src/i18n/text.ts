export function localizedText(language: string, french: string, english: string): string {
  return language.toLowerCase().startsWith('fr') ? french : english;
}

export function languageLocale(language: string): string {
  return language.toLowerCase().startsWith('fr') ? 'fr-FR' : 'en-US';
}
