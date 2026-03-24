import { useTranslation } from "react-i18next";

/**
 * Returns the localized display name for a character.
 * Falls back to fallbackName if no translation exists.
 */
export function useLocalizedCharacterName(characterId: string, fallbackName: string = ""): string {
  const { t } = useTranslation();
  const key = `character.${characterId}.name`;
  const translated = t(key);
  return translated !== key ? translated : fallbackName;
}

/**
 * Returns both localized name and role for a character.
 * Falls back to fallbackName/fallbackRole if no translation exists.
 */
export function useLocalizedCharacter(characterId: string, fallbackName: string, fallbackRole: string) {
  const { t } = useTranslation();
  const nameKey = `character.${characterId}.name`;
  const roleKey = `character.${characterId}.role`;
  const name = t(nameKey) !== nameKey ? t(nameKey) : fallbackName;
  const role = t(roleKey) !== roleKey ? t(roleKey) : fallbackRole;
  return { name, role };
}
