/** Authored story illustrations, separate from NASA reference imagery. */
export const STORM_STORY = [
  {
    src: `${import.meta.env.BASE_URL}story/flight/solar-storm-alert.webp`,
    alt: "Three worried astronauts notice an amber radiation warning inside their capsule.",
    label: "Radiation warning",
    title: "Something is wrong.",
    line: "Radiation is rising. We need to protect the crew.",
    speaker: "Crew radio",
    action: "Contact the commander",
  },
  {
    src: `${import.meta.env.BASE_URL}story/flight/solar-storm-briefing.webp`,
    alt: "The commander reassures the crew and points to supplies in the capsule's lower cabin.",
    label: "Commander responding",
    title: "Stay together. We have a plan.",
    line: "Use our supplies as shielding. Everyone moves into the cabin shelter.",
    speaker: "Commander",
    action: "Open shelter controls",
  },
] as const;
