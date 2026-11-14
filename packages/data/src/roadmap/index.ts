export const ROADMAP_SOURCES = [
  {
    id: "astronaut",
    name: "NASA · Become an Astronaut",
    url: "https://www.nasa.gov/humans-in-space/astronauts/become-an-astronaut/",
    note: "Current NASA entry requirements; alternative degree and pilot routes are on the official page.",
  },
  {
    id: "careers",
    name: "NASA · Careers",
    url: "https://www.nasa.gov/careers/",
    note: "Career families and applications. Scientist/engineer paths below are editorial guidance, not NASA hiring requirements.",
  },
  {
    id: "cube",
    name: "NASA · CubeSat 101 (2017)",
    url: "https://www.nasa.gov/wp-content/uploads/2017/03/nasa_csli_cubesat_101_508.pdf",
    note: "Chapter 2: development stages and historical planning durations. Stages overlap; do not add their durations.",
  },
  {
    id: "launch",
    name: "SpaceX · Rideshare",
    url: "https://new.spacex.com/rideshare",
    note: "Advertised launch reference: $350,000 for 50 kg to SSO, $7,000/kg additional. Not a CubeSat mission total or individual dispenser-slot quote; reconfirm availability and terms.",
  },
  {
    id: "telescope",
    name: "NASA · HaloSat space telescope",
    url: "https://science.nasa.gov/science-research/science-enabling-technology/technology-highlights/cubesat-platform-enables-inexpensive-space-telescope/",
    note: "Historical example: less than $4M from project start through the first year of operations. Not a current university quote.",
  },
  {
    id: "csli",
    name: "NASA · CubeSat Launch Initiative",
    url: "https://www.nasa.gov/cubesat-launch-initiative-introduction/",
    note: "CSLI is for eligible U.S. educational/nonprofit organizations. It is not a worldwide free-launch entitlement.",
  },
] as const;
export type SourceId = (typeof ROADMAP_SOURCES)[number]["id"];
export interface RoadmapNode {
  title: string;
  subtitle: string;
  detail: string;
  source: SourceId;
  time?: string;
  cost?: string;
}
export interface CareerPath {
  name: string;
  badge: string;
  caveat: string;
  nodes: RoadmapNode[];
}
export const CAREER_PATHS: CareerPath[] = [
  {
    name: "Astronaut",
    badge: "NASA selection route",
    caveat:
      "NASA requires U.S. citizenship. Qualifying does not guarantee selection or a flight. Other agencies have their own rules.",
    nodes: [
      {
        title: "Build your foundations",
        subtitle: "School · curiosity first",
        detail:
          "Explore maths, science, computing and clear communication. School clubs and safe experiments are suggested learning activities, not official NASA entry criteria.",
        source: "careers",
      },
      {
        title: "Study a STEM subject",
        subtitle: "University education",
        detail:
          "Choose an accredited relevant subject such as engineering, biological or physical science, computer science or mathematics. NASA lists a STEM master's degree, with specified alternatives on its official page.",
        source: "astronaut",
      },
      {
        title: "Gain professional experience",
        subtitle: "3+ years · qualifying route",
        detail:
          "NASA currently requires at least three years of related professional experience after qualifying degree completion. Pilot and medical routes have specific alternatives; check the full current requirements.",
        source: "astronaut",
      },
      {
        title: "Check eligibility & health",
        subtitle: "U.S. citizenship required",
        detail:
          "Applicants must meet citizenship, education/experience and the NASA long-duration flight astronaut physical requirements. Leadership, teamwork and communication matter too.",
        source: "astronaut",
      },
      {
        title: "Apply & pass selection",
        subtitle: "Only when recruitment opens",
        detail:
          "Read the current vacancy and apply through its official application link. Meeting minimum requirements does not guarantee interviews or selection. There is no guaranteed age-by-age schedule.",
        source: "astronaut",
      },
      {
        title: "Train as a candidate",
        subtitle: "Selection is the beginning",
        detail:
          "Selected astronaut candidates undertake training. Qualification, assignment to a mission and an actual spaceflight are separate milestones; none is guaranteed by finishing this roadmap.",
        source: "astronaut",
      },
    ],
  },
  {
    name: "Space scientist",
    badge: "Suggested learning path",
    caveat:
      "An illustrative research pathway, not a universal qualification checklist. Degrees, citizenship and experience depend on the institution and vacancy.",
    nodes: [
      {
        title: "Ask scientific questions",
        subtitle: "School · maths & science",
        detail:
          "Learn to test ideas, work with evidence and communicate results. Try astronomy, physics, Earth science or biology; space science includes many disciplines.",
        source: "careers",
      },
      {
        title: "Choose a relevant degree",
        subtitle: "Physics · geology · biology · more",
        detail:
          "Select a subject that matches your research interest. Learn statistics and programming alongside your main discipline. No single degree guarantees a NASA job.",
        source: "careers",
      },
      {
        title: "Work with real data",
        subtitle: "Projects & research experience",
        detail:
          "Analyse an open scientific dataset with a mentor, record methods and uncertainty, and present a reproducible project. This is practical editorial advice rather than a NASA requirement.",
        source: "careers",
      },
      {
        title: "Develop research expertise",
        subtitle: "Graduate study where needed",
        detail:
          "Many research careers involve graduate study and some require a PhD. Check actual university and job requirements; not every science-related job requires a doctorate.",
        source: "careers",
      },
      {
        title: "Join a research team",
        subtitle: "University · institute · industry",
        detail:
          "Look for supervised research, internships and collaborations for which you are eligible. NASA civil service, contractors and university collaborators are different employers and routes.",
        source: "careers",
      },
      {
        title: "Apply to a specific role",
        subtitle: "Read the actual vacancy",
        detail:
          "Match the advertised research field, qualifications, work authorization and experience. Use the employer's official listing; a research career is not restricted to direct NASA employment.",
        source: "careers",
      },
    ],
  },
  {
    name: "Space engineer",
    badge: "Suggested learning path",
    caveat:
      "Hardware and software careers have different requirements. This is guidance, not NASA certification or a promise of employment.",
    nodes: [
      {
        title: "Learn how things work",
        subtitle: "School · maths & computing",
        detail:
          "Explore coding, electronics, mechanics and teamwork through age-appropriate, supervised projects. Keep notes on what you built and tested.",
        source: "careers",
      },
      {
        title: "Choose your discipline",
        subtitle: "Engineering or computing",
        detail:
          "Possible routes include electrical, mechanical, aerospace or software engineering and computer science. Choose a recognized programme suited to your intended work.",
        source: "careers",
      },
      {
        title: "Build & test projects",
        subtitle: "Portfolio · design decisions",
        detail:
          "Create a small demonstrator, document requirements, test it, and explain failures and improvements. This is a recommended learning activity, not an official hiring threshold.",
        source: "careers",
      },
      {
        title: "Gain team experience",
        subtitle: "Labs · internships · industry",
        detail:
          "Seek eligible placements and team engineering work. Practise version control, technical writing, review and testing. Requirements vary by position and employer.",
        source: "careers",
      },
      {
        title: "Specialise in a subsystem",
        subtitle: "Software · power · radio · more",
        detail:
          "Develop depth in a useful area while understanding interfaces to the rest of a spacecraft. Graduate study can help in some roles; consult actual vacancies.",
        source: "careers",
      },
      {
        title: "Apply & keep learning",
        subtitle: "Agency · supplier · university",
        detail:
          "Compare role requirements and work authorization at agencies, suppliers and research institutions. Direct agency employment and work on an agency-funded project are different routes.",
        source: "careers",
      },
    ],
  },
];
export const MISSION_NODES: RoadmapNode[] = [
  {
    title: "Define the science",
    subtitle: "01 · What will it measure?",
    time: "Concept: 1–6 months",
    cost: "Scope & feasibility work",
    detail:
      "Choose a measurable question and the data needed to answer it. Examples include Earth observations, radiation measurements or a focused telescope payload. Telescope pointing and thermal needs require a separate feasibility study.",
    source: "cube",
  },
  {
    title: "Form a team & find funding",
    subtitle: "02 · Faculty, partners & budget",
    time: "Funding: 1–12 months",
    cost: "Staff, training, facilities & reserves",
    detail:
      "Assign science, systems, hardware, software and operations responsibilities. Seek university sponsorship and suitable funders. Obtain dated supplier and integrator quotations; no universal total price applies.",
    source: "cube",
  },
  {
    title: "Review feasibility",
    subtitle: "03 · Is space really needed?",
    time: "Review: 1–2 months",
    cost: "Trade studies & early prototypes",
    detail:
      "Check whether a ground instrument or hosted payload can meet the goal first. For an orbital mission assess mass, energy, pointing, data return, safety, orbit and lifecycle cost before committing.",
    source: "cube",
  },
  {
    title: "Design the spacecraft",
    subtitle: "04 · Payload + supporting systems",
    time: "Design: 1–6 months",
    cost: "Payload, bus, power, radio & software",
    detail:
      "Develop the payload and spacecraft together. Include structure, power, batteries, thermal control, attitude control, communications and flight software. Agree interfaces with the mission integrator.",
    source: "cube",
  },
  {
    title: "Build, license & test",
    subtitle: "05 · Parallel workstreams",
    time: "Hardware/testing: 2–12 months",
    cost: "Manufacture, test access & compliance",
    detail:
      "Build a ground station and perform system and environment tests. Coordinate radio authorization and other applicable permissions with the relevant authorities; the U.S.-focused 2017 guide is not a substitute for your country's current rules.",
    source: "cube",
  },
  {
    title: "Choose the launch route",
    subtitle: "06 · Provider or integrator",
    time: "Ready-to-launch wait: months to years",
    cost: "Launch + dispenser/integration + logistics",
    detail:
      "Ask a launch provider or payload integrator about orbit, interface, mass, deployment and testing. A small CubeSat may need an integrator/dispenser service; a 50 kg rideshare price is not an individual CubeSat-slot quote. CSLI eligibility is limited.",
    source: "launch",
  },
  {
    title: "Pass readiness & integrate",
    subtitle: "07 · Evidence before flight",
    time: "Deliver 4 weeks–6 months before launch",
    cost: "Final tests, shipping & integration",
    detail:
      "Submit the required test evidence and safety/interface documents. The NASA guide gives this historical delivery range; your provider's contract and mission schedule control the actual dates.",
    source: "cube",
  },
  {
    title: "Launch, operate & close out",
    subtitle: "08 · Science starts after deployment",
    time: "Operations: mission-dependent",
    cost: "Ground service, staff & end-of-mission work",
    detail:
      "Commission the satellite, receive data, analyse results and plan end-of-mission activities. Mission success depends on useful data and reliable operations, not merely reaching orbit.",
    source: "cube",
  },
];
