export const ORGANIZATION_NAME = "HSAPSS Windsor";
export const APP_NAME = "Assembly Manager";
export const APP_FULL_NAME = `${ORGANIZATION_NAME} ${APP_NAME}`;

export function getCollegeDisplayName(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "College Assembly") return ORGANIZATION_NAME;
  return trimmed;
}
