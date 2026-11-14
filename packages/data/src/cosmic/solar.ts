export const SOLAR_DETAILS: Record<
  string,
  {
    type: string;
    description: string;
    source: string;
    card?: string;
    caption?: string;
  }
> = {
  "10": {
    type: "Star",
    description:
      "Our Sun is the star at the centre of the solar system. Its gravity holds the planets in orbit, and its light and heat make life on Earth possible.",
    source: "https://science.nasa.gov/sun/",
  },
  "199": {
    type: "Terrestrial planet",
    description:
      "Small and rocky, Mercury is the closest planet to the Sun. Its cratered surface experiences enormous changes in temperature between day and night.",
    source: "https://science.nasa.gov/mercury/",
  },
  "299": {
    type: "Terrestrial planet",
    description:
      "Venus is wrapped in thick clouds and a dense carbon dioxide atmosphere. A powerful greenhouse effect makes it the hottest planet in our solar system.",
    source: "https://science.nasa.gov/venus/",
  },
  "399": {
    type: "Terrestrial planet",
    description:
      "Earth is our ocean world, and the only place we know of with living things. Its atmosphere, liquid water and magnetic field help make our home habitable.",
    source: "https://science.nasa.gov/earth/",
  },
  "301": {
    type: "Natural satellite",
    description:
      "Our Moon is a rocky, cratered world that orbits Earth. Explore its ancient terrain, then return to the game to plan your own lunar mission.",
    source: "https://science.nasa.gov/moon/",
  },
  "499": {
    type: "Terrestrial planet",
    description:
      "Mars is a cold desert world with giant volcanoes, deep canyons and polar ice. Iron minerals in its soil give the Red Planet its familiar colour.",
    source: "https://science.nasa.gov/mars/",
  },
  "599": {
    type: "Gas giant",
    description:
      "Jupiter is the largest planet in our solar system. Bands of clouds sweep around this gas giant, home to powerful storms and a vast family of moons.",
    source: "https://science.nasa.gov/jupiter/",
  },
  "699": {
    type: "Gas giant",
    description:
      "Saturn is surrounded by bright rings made mostly of ice particles. This gas giant has a rich system of moons, including worlds with hidden oceans.",
    source: "https://science.nasa.gov/saturn/",
  },
  "799": {
    type: "Ice giant",
    description:
      "Uranus is an ice giant that rotates on its side. Methane in its atmosphere contributes to its pale blue-green appearance.",
    source: "https://science.nasa.gov/uranus/",
  },
  "899": {
    type: "Ice giant",
    description:
      "Neptune is a distant ice giant with a deep atmosphere and powerful winds. It is the outermost of the eight planets orbiting our Sun.",
    source: "https://science.nasa.gov/neptune/",
  },
  "-170": {
    type: "Space telescope",
    description:
      "The James Webb Space Telescope studies the universe in infrared light. It travels around the Sun–Earth L2 region, keeping its sunshield between its instruments and the Sun.",
    source: "https://science.nasa.gov/mission/webb/",
    card: "webb",
    caption: "AN INFRARED WINDOW ON THE UNIVERSE",
  },
  "-31": {
    type: "Interstellar spacecraft",
    description:
      "Voyager 1 explored Jupiter and Saturn before travelling into interstellar space. Follow this distant explorer and compare its separation from Earth with the time a radio signal needs to cross it.",
    source: "https://science.nasa.gov/mission/voyager/voyager-1/",
    card: "voyager",
    caption: "OUR DISTANT INTERSTELLAR EXPLORER",
  },
  "-32": {
    type: "Interstellar spacecraft",
    description:
      "Voyager 2 visited all four giant planets before entering interstellar space. It remains the only spacecraft to have flown past Uranus and Neptune.",
    source: "https://science.nasa.gov/mission/voyager/voyager-2/",
    card: "voyager",
    caption: "BEYOND THE GIANT PLANETS",
  },
  "-98": {
    type: "Spacecraft",
    description:
      "New Horizons revealed Pluto and its moons, then explored the Kuiper Belt. Its journey opens a window on small, icy worlds in the outer solar system.",
    source: "https://science.nasa.gov/mission/new-horizons/",
    card: "new-horizons",
    caption: "INTO THE KUIPER BELT",
  },
  "-96": {
    type: "Solar spacecraft",
    description:
      "Parker Solar Probe flies through the Sun’s outer atmosphere to study the solar wind and corona. Its protective shield keeps its instruments safe from intense solar heating.",
    source: "https://science.nasa.gov/mission/parker-solar-probe/",
    card: "parker",
    caption: "A JOURNEY TO TOUCH THE SUN",
  },
  "-61": {
    type: "Planetary orbiter",
    description:
      "Juno investigates Jupiter’s atmosphere, magnetic field and deep interior. Its solar-powered spacecraft helps us understand how the giant planet formed.",
    source: "https://science.nasa.gov/mission/juno/",
    card: "juno",
    caption: "EXPLORING THE GIANT PLANET",
  },
};
export const FEATURED_SPACECRAFT = ["-31", "-170", "-96", "-32", "-98", "-61"];

export const SOLAR_SEARCH_ALIASES: Record<string, string[]> = {
  "10": ["sol", "our star"],
  "301": ["luna", "earth's moon"],
  "-170": ["jwst", "webb telescope", "james webb space telescope"],
  "-31": ["voyager1", "voyager one"],
  "-32": ["voyager2", "voyager two"],
  "-96": ["parker", "solar probe"],
};
