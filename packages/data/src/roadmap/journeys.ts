export interface JourneyStep {
  title: string;
  when: string;
  why: string;
  activity: string;
  takeaway: string;
}
export const JOURNEYS: JourneyStep[][] = [
  [
    {
      title: "Stay curious about your world",
      when: "Start here · school",
      why: "Astronauts solve problems and explain what they notice. You can practise those habits long before choosing a degree.",
      activity:
        "Keep a Moon journal for one week. Sketch its shape and write one question each evening.",
      takeaway:
        "Practise maths, reading and explaining ideas. You do not need expensive equipment.",
    },
    {
      title: "Learn to be a great teammate",
      when: "While you are at school",
      why: "Space crews depend on each other. Listening, sharing tasks and speaking clearly are useful skills.",
      activity:
        "Build a paper lander with a friend. Give each person a role, test it and discuss what to change.",
      takeaway:
        "Keep activities safe and supervised. These are learning suggestions, not NASA selection tests.",
    },
    {
      title: "Find a STEM subject you love",
      when: "Later · university",
      why: "NASA's astronaut route includes a relevant STEM master's degree or specified alternatives. Several subjects can lead toward this route.",
      activity:
        "Compare engineering, physics, biology, mathematics and computer science. Ask a teacher what studying each one involves.",
      takeaway:
        "Choose a recognised programme. Follow the current official education requirements when you are ready.",
    },
    {
      title: "Become good at real work",
      when: "After study · professional experience",
      why: "The standard NASA route requires related professional experience. Pilot and medical routes have their own details.",
      activity:
        "Explore how researchers, engineers, doctors and pilots work. You do not have to join the military to become a NASA astronaut.",
      takeaway:
        "The current vacancy specifies three years of qualifying experience, with alternative pilot criteria. Read its exact rules.",
    },
    {
      title: "Check the real application rules",
      when: "Adults · when a vacancy opens",
      why: "NASA requires U.S. citizenship and a qualifying medical examination. Astronaut recruitment is not a yearly school admission.",
      activity:
        "With an adult, open the official announcement. Look for citizenship, qualifications, documents and closing date.",
      takeaway:
        "For a learner in Bangladesh, direct NASA astronaut eligibility is a real constraint. Space research and engineering offer other routes with different employer rules.",
    },
    {
      title: "Selection → training → possible mission",
      when: "Only after selection",
      why: "Selected candidates train for about two years. Completing training makes them eligible for assignments; it does not promise a spaceflight.",
      activity:
        "Read a real astronaut biography. Notice how different their education and work can be.",
      takeaway:
        "A roadmap helps you prepare. It cannot guarantee selection, health qualification or a mission.",
    },
  ],
  [
    {
      title: "Turn wonder into a question",
      when: "Start here · school",
      why: "Space scientists ask questions about planets, stars, Earth and life. Good questions are specific enough to investigate.",
      activity:
        "Ask: does the Moon appear at the same time every evening? Make a prediction and write it down.",
      takeaway:
        "Curiosity comes first. Physics, geology, biology and computing can all connect to space.",
    },
    {
      title: "Collect evidence, not just answers",
      when: "School · practise investigating",
      why: "Science means recording what happened, checking your idea and being honest when the evidence is unclear.",
      activity:
        "Observe for a week. Make a small table or graph. Explain what your observations can and cannot tell you.",
      takeaway:
        "Learn maths, statistics, clear writing and coding at your own pace. Ask a teacher for help.",
    },
    {
      title: "Choose your science direction",
      when: "Later · university",
      why: "Different questions need different disciplines. A planetary geologist and an astrophysicist do different work.",
      activity:
        "Compare two university subjects and the research questions their students investigate.",
      takeaway:
        "There is no single 'NASA scientist degree'. Match your studies to the work you want to do.",
    },
    {
      title: "Do research with a mentor",
      when: "University · projects",
      why: "A supervised project teaches you to use methods, check errors and explain results other people can reproduce.",
      activity:
        "Find an open space dataset and a small question. Write down the source, method and limitations with a supervisor.",
      takeaway:
        "Never claim a discovery from a picture or one unusual data point alone.",
    },
    {
      title: "Build expertise in your field",
      when: "Graduate study or relevant work",
      why: "Some research jobs require a PhD; others have different degree and experience requirements.",
      activity:
        "Read three real research vacancies. Compare the education, skills, work authorization and experience requested.",
      takeaway:
        "This is a suggested learning path, not an official NASA hiring checklist.",
    },
    {
      title: "Find your place in a science team",
      when: "Apply to individual opportunities",
      why: "You can work on space science at universities, research institutes, companies and agencies. Their rules differ.",
      activity:
        "Check the employer's official vacancy. Direct NASA civil-service employment and university collaboration are different routes.",
      takeaway:
        "Scientists do not wait for an astronaut intake. Apply when a suitable research or job announcement opens.",
    },
  ],
  [
    {
      title: "Ask: how does that work?",
      when: "Start here · school",
      why: "Space engineers turn a need into something that can be built and tested. Start with everyday problems.",
      activity:
        "Sketch a rover that could carry a sample. Label its wheels, power source and radio.",
      takeaway:
        "Maths, computing, science and drawing your ideas are useful foundations.",
    },
    {
      title: "Build something small & safe",
      when: "School · supervised projects",
      why: "A prototype makes an idea testable. A test that fails can teach you what to improve.",
      activity:
        "Make a paper lander. Set a safe drop height, test the same way each time and record your improvements.",
      takeaway:
        "Use adult supervision. You do not need rockets, dangerous chemicals or expensive kits.",
    },
    {
      title: "Choose an engineering direction",
      when: "Later · university",
      why: "Spacecraft need mechanical, electrical, aerospace, software and other engineering disciplines.",
      activity:
        "Compare a hardware and a software course. Find a student project you would enjoy contributing to.",
      takeaway:
        "The best degree depends on the subsystem and role, not one universal space-career formula.",
    },
    {
      title: "Learn to design, test & explain",
      when: "University · team projects",
      why: "Real engineering needs requirements, interfaces and evidence that a design works.",
      activity:
        "Document a small project: its goal, design, test results and one change you made after a failure.",
      takeaway:
        "Teamwork, clear documentation and careful testing matter as much as a polished final picture.",
    },
    {
      title: "Gain experience in a subsystem",
      when: "Placements · labs · industry",
      why: "Power, radio, robotics and flight software are examples of specialisms. Each has its own requirements.",
      activity:
        "Read official internship or job listings and identify one skill you can practise next.",
      takeaway:
        "Internships and vacancies have their own citizenship, student-status and work-authorization rules.",
    },
    {
      title: "Apply where your skills fit",
      when: "Agency · university · supplier",
      why: "Many organisations build and operate space missions. Working with a mission supplier is different from joining NASA directly.",
      activity:
        "Use the actual employer's application page. Match the required skills, qualifications and eligibility.",
      takeaway:
        "Engineering roles open individually. There is no astronaut-style intake for every engineer.",
    },
  ],
];
export const APPLICATION_HISTORY = [
  {
    date: "2–31 March 2020",
    title: "Applications opened",
    detail: "The recruitment window that preceded the 2021 class.",
    url: "https://www.nasa.gov/image-article/astronaut-selection-timeline/",
  },
  {
    date: "6 December 2021",
    title: "A new class announced",
    detail: "10 candidates were selected from more than 12,000 applicants.",
    url: "https://www.nasa.gov/centers-and-facilities/goddard/nasas-2021-included-mars-landing-first-flight-artemis-more/",
  },
  {
    date: "5 March–16 April 2024",
    title: "The next application window",
    detail:
      "Application dates are different from the later class announcement date.",
    url: "https://www.nasa.gov/humans-in-space/becoming-an-astronaut/2024-be-an-astronaut-campaign/",
  },
  {
    date: "22 September 2025",
    title: "Latest selected class",
    detail: "NASA introduced 10 candidates from more than 8,000 applicants.",
    url: "https://www.nasa.gov/news-release/nasa-selects-all-american-2025-class-of-astronaut-candidates/",
  },
];
export const ASTRONAUT_VACANCY = {
  url: "https://www.usajobs.gov/job/891970300",
  deadline: "2026-12-04T04:59:00Z",
  checked: "14 November 2026",
  label: "3 December 2026 · 11:59 p.m. EST",
};
