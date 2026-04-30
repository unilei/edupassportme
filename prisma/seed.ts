import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clean up – new aggregator tables first (FK order)
  await prisma.application.deleteMany();
  await prisma.sponsoredListing.deleteMany();
  await prisma.clickEvent.deleteMany();
  await prisma.savedListing.deleteMany();
  await prisma.savedSearch.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.appUser.deleteMany();
  await prisma.syncLog.deleteMany();
  await prisma.listingTag.deleteMany();
  await prisma.listingOffer.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.provider.deleteMany();

  // Clean up – existing tables
  await prisma.itemTag.deleteMany();
  await prisma.item.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();

  // ── Categories (15) ──────────────────────────────────
  const cats = {
    onlineCourses: await prisma.category.create({
      data: { name: "Online Courses", slug: "online-courses", description: "MOOCs and course platforms for all subjects", icon: "GraduationCap", sortOrder: 1, groupName: "Learning" },
    }),
    languageLearning: await prisma.category.create({
      data: { name: "Language Learning", slug: "language-learning", description: "Apps and platforms to learn new languages", icon: "Globe", sortOrder: 2, groupName: "Learning" },
    }),
    codingTech: await prisma.category.create({
      data: { name: "Coding & Tech", slug: "coding-tech", description: "Programming tutorials, bootcamps, and practice platforms", icon: "Code", sortOrder: 3, groupName: "Learning" },
    }),
    stemScience: await prisma.category.create({
      data: { name: "STEM & Science", slug: "stem-science", description: "Math, science, and engineering learning resources", icon: "Atom", sortOrder: 4, groupName: "Learning" },
    }),
    testPrep: await prisma.category.create({
      data: { name: "Test Prep & Tutoring", slug: "test-prep-tutoring", description: "Standardized test preparation and tutoring services", icon: "ClipboardCheck", sortOrder: 5, groupName: "Learning" },
    }),
    aiStudyTools: await prisma.category.create({
      data: { name: "AI & Study Tools", slug: "ai-study-tools", description: "AI-powered assistants and smart study aids", icon: "Brain", sortOrder: 6, groupName: "Tools" },
    }),
    productivity: await prisma.category.create({
      data: { name: "Productivity", slug: "productivity", description: "Note-taking, organization, and workflow tools for learners", icon: "Zap", sortOrder: 7, groupName: "Tools" },
    }),
    writingResearch: await prisma.category.create({
      data: { name: "Writing & Research", slug: "writing-research", description: "Writing assistants, citation managers, and research tools", icon: "PenTool", sortOrder: 8, groupName: "Tools" },
    }),
    creativeDesign: await prisma.category.create({
      data: { name: "Creative & Design", slug: "creative-design", description: "Design, art, music, and creative learning platforms", icon: "Palette", sortOrder: 9, groupName: "Tools" },
    }),
    academicResearch: await prisma.category.create({
      data: { name: "Academic Research", slug: "academic-research", description: "Journals, papers, and scholarly databases", icon: "BookOpen", sortOrder: 10, groupName: "Resources" },
    }),
    kidsK12: await prisma.category.create({
      data: { name: "Kids & K-12", slug: "kids-k12", description: "Educational resources for children and teens", icon: "Baby", sortOrder: 11, groupName: "Resources" },
    }),
    professionalDev: await prisma.category.create({
      data: { name: "Professional Development", slug: "professional-development", description: "Career skills, certifications, and professional upskilling", icon: "Briefcase", sortOrder: 12, groupName: "Resources" },
    }),
    teachingLMS: await prisma.category.create({
      data: { name: "Teaching & LMS", slug: "teaching-lms", description: "Tools for educators and learning management systems", icon: "School", sortOrder: 13, groupName: "Resources" },
    }),
    booksReading: await prisma.category.create({
      data: { name: "Books & Reading", slug: "books-reading", description: "E-books, audiobooks, and reading platforms", icon: "BookMarked", sortOrder: 14, groupName: "Resources" },
    }),
    communityForums: await prisma.category.create({
      data: { name: "Community & Forums", slug: "community-forums", description: "Educational communities, Q&A, and discussion platforms", icon: "Users", sortOrder: 15, groupName: "Resources" },
    }),
  };

  // ── Tags (16) ────────────────────────────────────────
  const tagData = [
    { name: "Free", slug: "free" },
    { name: "Freemium", slug: "freemium" },
    { name: "Paid", slug: "paid" },
    { name: "Mobile", slug: "mobile" },
    { name: "Web", slug: "web" },
    { name: "Certificate", slug: "certificate" },
    { name: "Self-paced", slug: "self-paced" },
    { name: "Interactive", slug: "interactive" },
    { name: "Video", slug: "video" },
    { name: "AI-powered", slug: "ai-powered" },
    { name: "Open Source", slug: "open-source" },
    { name: "K-12", slug: "k-12" },
    { name: "Higher Education", slug: "higher-education" },
    { name: "Professional", slug: "professional" },
    { name: "Beginner-friendly", slug: "beginner-friendly" },
    { name: "Community", slug: "community" },
  ];

  const tags: Record<string, { id: string }> = {};
  for (const t of tagData) {
    tags[t.slug] = await prisma.tag.create({ data: t });
  }

  // ── Items (~50) ──────────────────────────────────────
  const items = [
    // ── Online Courses ──
    { name: "Coursera", slug: "coursera", url: "https://www.coursera.org", description: "Learn from world-class universities and companies. Online courses, professional certificates, and degrees from Stanford, Google, IBM, and more.", icon: "https://www.coursera.org/favicon.ico", featured: true, categoryId: cats.onlineCourses.id, tags: ["freemium", "web", "mobile", "certificate", "self-paced", "video"] },
    { name: "edX", slug: "edx", url: "https://www.edx.org", description: "Access courses from Harvard, MIT, and 160+ institutions. Free online courses with optional paid certificates in every subject.", icon: "https://www.edx.org/favicon.ico", featured: true, categoryId: cats.onlineCourses.id, tags: ["freemium", "web", "mobile", "certificate", "self-paced", "higher-education", "video"] },
    { name: "Udemy", slug: "udemy", url: "https://www.udemy.com", description: "Online learning marketplace with over 200,000 courses in programming, business, design, marketing, and personal development.", icon: "https://www.udemy.com/favicon.ico", categoryId: cats.onlineCourses.id, tags: ["paid", "web", "mobile", "self-paced", "video", "beginner-friendly"] },
    { name: "FutureLearn", slug: "futurelearn", url: "https://www.futurelearn.com", description: "Online courses and degrees from leading universities and organizations worldwide. Social learning at its best.", icon: "https://www.futurelearn.com/favicon.ico", categoryId: cats.onlineCourses.id, tags: ["freemium", "web", "certificate", "self-paced", "video", "community"] },
    { name: "Udacity", slug: "udacity", url: "https://www.udacity.com", description: "Learn tech skills that companies actually need. Nanodegree programs in AI, data science, cloud computing, and more.", icon: "https://www.udacity.com/favicon.ico", categoryId: cats.onlineCourses.id, tags: ["paid", "web", "certificate", "self-paced", "professional", "video"] },

    // ── Language Learning ──
    { name: "Duolingo", slug: "duolingo", url: "https://www.duolingo.com", description: "The world's most popular language learning app. Learn 40+ languages with fun, bite-sized lessons and gamified exercises.", icon: "https://www.duolingo.com/favicon.ico", featured: true, categoryId: cats.languageLearning.id, tags: ["freemium", "web", "mobile", "interactive", "beginner-friendly", "community"] },
    { name: "Babbel", slug: "babbel", url: "https://www.babbel.com", description: "Learn a new language with real-world conversations. Courses designed by linguists for practical speaking skills.", icon: "https://www.babbel.com/favicon.ico", categoryId: cats.languageLearning.id, tags: ["paid", "web", "mobile", "self-paced", "beginner-friendly"] },
    { name: "Busuu", slug: "busuu", url: "https://www.busuu.com", description: "Language learning app with AI-powered features and native speaker feedback. Learn 14 languages with personalized study plans.", icon: "https://www.busuu.com/favicon.ico", categoryId: cats.languageLearning.id, tags: ["freemium", "web", "mobile", "ai-powered", "community", "certificate"] },
    { name: "italki", slug: "italki", url: "https://www.italki.com", description: "Connect with native-speaking language tutors for 1-on-1 online lessons. Over 10,000 teachers across 150+ languages.", icon: "https://www.italki.com/favicon.ico", categoryId: cats.languageLearning.id, tags: ["paid", "web", "mobile", "interactive", "community"] },
    { name: "Rosetta Stone", slug: "rosetta-stone", url: "https://www.rosettastone.com", description: "Immersive language learning through intuitive methods. AI speech recognition and structured curriculum for 25 languages.", icon: "https://www.rosettastone.com/favicon.ico", categoryId: cats.languageLearning.id, tags: ["paid", "web", "mobile", "ai-powered", "self-paced"] },

    // ── Coding & Tech ──
    { name: "freeCodeCamp", slug: "freecodecamp", url: "https://www.freecodecamp.org", description: "Learn to code for free. Full-stack web development curriculum with certifications in responsive design, JavaScript, APIs, and more.", icon: "https://www.freecodecamp.org/favicon.ico", featured: true, categoryId: cats.codingTech.id, tags: ["free", "web", "certificate", "self-paced", "open-source", "beginner-friendly", "community"] },
    { name: "Codecademy", slug: "codecademy", url: "https://www.codecademy.com", description: "Interactive coding lessons in Python, JavaScript, SQL, and more. Hands-on learning with instant feedback.", icon: "https://www.codecademy.com/favicon.ico", categoryId: cats.codingTech.id, tags: ["freemium", "web", "interactive", "certificate", "beginner-friendly"] },
    { name: "LeetCode", slug: "leetcode", url: "https://leetcode.com", description: "Platform for coding interview preparation. Over 3,000 problems with solutions, contests, and discussion forums.", icon: "https://leetcode.com/favicon.ico", categoryId: cats.codingTech.id, tags: ["freemium", "web", "interactive", "professional", "community"] },
    { name: "The Odin Project", slug: "the-odin-project", url: "https://www.theodinproject.com", description: "Free full-stack web development curriculum. Project-based learning with Ruby, JavaScript, and React paths.", icon: "https://www.theodinproject.com/favicon.ico", categoryId: cats.codingTech.id, tags: ["free", "web", "self-paced", "open-source", "beginner-friendly", "community"] },
    { name: "HackerRank", slug: "hackerrank", url: "https://www.hackerrank.com", description: "Practice coding, prepare for interviews, and get hired. Skill-based assessments and coding challenges.", icon: "https://www.hackerrank.com/favicon.ico", categoryId: cats.codingTech.id, tags: ["freemium", "web", "interactive", "professional", "certificate"] },

    // ── STEM & Science ──
    { name: "Brilliant", slug: "brilliant", url: "https://brilliant.org", description: "Learn math, science, and computer science through interactive problem-solving. Visual, hands-on approach to STEM.", icon: "https://brilliant.org/favicon.ico", featured: true, categoryId: cats.stemScience.id, tags: ["freemium", "web", "mobile", "interactive", "self-paced"] },
    { name: "Khan Academy", slug: "khan-academy", url: "https://www.khanacademy.org", description: "Free world-class education for anyone, anywhere. Practice exercises, instructional videos, and personalized learning in math, science, and more.", icon: "https://www.khanacademy.org/favicon.ico", featured: true, categoryId: cats.stemScience.id, tags: ["free", "web", "mobile", "video", "self-paced", "k-12", "beginner-friendly"] },
    { name: "Wolfram Alpha", slug: "wolfram-alpha", url: "https://www.wolframalpha.com", description: "Computational knowledge engine. Get answers to math, science, engineering, and data questions with step-by-step solutions.", icon: "https://www.wolframalpha.com/favicon.ico", categoryId: cats.stemScience.id, tags: ["freemium", "web", "mobile", "interactive", "higher-education"] },
    { name: "PhET Simulations", slug: "phet-simulations", url: "https://phet.colorado.edu", description: "Free interactive math and science simulations from University of Colorado Boulder. Explore physics, chemistry, biology, and earth science.", icon: "https://phet.colorado.edu/favicon.ico", categoryId: cats.stemScience.id, tags: ["free", "web", "interactive", "open-source", "k-12", "beginner-friendly"] },

    // ── Test Prep & Tutoring ──
    { name: "Magoosh", slug: "magoosh", url: "https://magoosh.com", description: "Online test prep for GRE, GMAT, SAT, ACT, TOEFL, and IELTS. Video lessons, practice questions, and study schedules.", icon: "https://magoosh.com/favicon.ico", categoryId: cats.testPrep.id, tags: ["paid", "web", "mobile", "video", "self-paced"] },
    { name: "Wyzant", slug: "wyzant", url: "https://www.wyzant.com", description: "Find expert tutors for any subject. 1-on-1 online and in-person tutoring in math, science, test prep, and more.", icon: "https://www.wyzant.com/favicon.ico", categoryId: cats.testPrep.id, tags: ["paid", "web", "interactive", "k-12", "higher-education"] },
    { name: "Kaplan", slug: "kaplan", url: "https://www.kaplan.com", description: "Test prep and admissions resources for SAT, GRE, GMAT, LSAT, MCAT, and more. Courses, practice tests, and tutoring.", icon: "https://www.kaplan.com/favicon.ico", categoryId: cats.testPrep.id, tags: ["paid", "web", "mobile", "video", "certificate", "self-paced"] },

    // ── AI & Study Tools ──
    { name: "ChatGPT", slug: "chatgpt", url: "https://chat.openai.com", description: "OpenAI's AI assistant for learning, writing, coding, and research. Ask questions, get explanations, and brainstorm ideas.", icon: "https://chat.openai.com/favicon.ico", featured: true, categoryId: cats.aiStudyTools.id, tags: ["freemium", "web", "mobile", "ai-powered"] },
    { name: "Claude", slug: "claude", url: "https://claude.ai", description: "Anthropic's AI assistant excelling at analysis, writing, math, and coding. Thoughtful, nuanced responses for learning and research.", icon: "https://claude.ai/favicon.ico", featured: true, categoryId: cats.aiStudyTools.id, tags: ["freemium", "web", "mobile", "ai-powered"] },
    { name: "Quizlet", slug: "quizlet", url: "https://quizlet.com", description: "Create and study flashcards, practice tests, and games. AI-powered study tools used by over 60 million students worldwide.", icon: "https://quizlet.com/favicon.ico", categoryId: cats.aiStudyTools.id, tags: ["freemium", "web", "mobile", "ai-powered", "interactive", "k-12", "community"] },
    { name: "Anki", slug: "anki", url: "https://apps.ankiweb.net", description: "Powerful, intelligent spaced-repetition flashcard app. Highly customizable and popular with medical students and language learners.", icon: "https://apps.ankiweb.net/favicon.ico", categoryId: cats.aiStudyTools.id, tags: ["free", "web", "mobile", "open-source", "self-paced"] },
    { name: "Perplexity", slug: "perplexity", url: "https://www.perplexity.ai", description: "AI-powered search and research engine. Get instant, sourced answers to complex questions with academic and web citations.", icon: "https://www.perplexity.ai/favicon.ico", categoryId: cats.aiStudyTools.id, tags: ["freemium", "web", "mobile", "ai-powered"] },

    // ── Productivity ──
    { name: "Notion", slug: "notion", url: "https://www.notion.so", description: "All-in-one workspace for notes, docs, projects, and wikis. Popular among students and educators for organizing coursework.", icon: "https://www.notion.so/favicon.ico", featured: true, categoryId: cats.productivity.id, tags: ["freemium", "web", "mobile", "community"] },
    { name: "Obsidian", slug: "obsidian", url: "https://obsidian.md", description: "A powerful knowledge base on local Markdown files. Build a connected second brain with bidirectional links and graphs.", icon: "https://obsidian.md/favicon.ico", categoryId: cats.productivity.id, tags: ["freemium", "web", "mobile", "self-paced", "community"] },
    { name: "Todoist", slug: "todoist", url: "https://todoist.com", description: "Task manager and to-do list app trusted by 30M+ people. Organize assignments, set deadlines, and track study goals.", icon: "https://todoist.com/favicon.ico", categoryId: cats.productivity.id, tags: ["freemium", "web", "mobile"] },
    { name: "Google Workspace for Education", slug: "google-workspace-education", url: "https://edu.google.com/workspace-for-education/", description: "Free suite of Google tools for schools. Docs, Sheets, Classroom, Meet, and Drive for collaboration and learning.", icon: "https://edu.google.com/favicon.ico", categoryId: cats.productivity.id, tags: ["free", "web", "mobile", "community", "k-12", "higher-education"] },

    // ── Writing & Research ──
    { name: "Grammarly", slug: "grammarly", url: "https://www.grammarly.com", description: "AI-powered writing assistant for grammar, clarity, and tone. Essential for academic writing, essays, and research papers.", icon: "https://www.grammarly.com/favicon.ico", featured: true, categoryId: cats.writingResearch.id, tags: ["freemium", "web", "mobile", "ai-powered"] },
    { name: "Zotero", slug: "zotero", url: "https://www.zotero.org", description: "Free, open-source reference management tool. Collect, organize, cite, and share research sources effortlessly.", icon: "https://www.zotero.org/favicon.ico", categoryId: cats.writingResearch.id, tags: ["free", "web", "open-source", "higher-education"] },
    { name: "Turnitin", slug: "turnitin", url: "https://www.turnitin.com", description: "Academic integrity and plagiarism detection platform used by 15,000+ institutions worldwide.", icon: "https://www.turnitin.com/favicon.ico", categoryId: cats.writingResearch.id, tags: ["paid", "web", "higher-education", "professional"] },
    { name: "Hemingway Editor", slug: "hemingway-editor", url: "https://hemingwayapp.com", description: "Makes your writing bold and clear. Highlights complex sentences, passive voice, and readability issues.", icon: "https://hemingwayapp.com/favicon.ico", categoryId: cats.writingResearch.id, tags: ["freemium", "web", "beginner-friendly"] },

    // ── Creative & Design ──
    { name: "Canva", slug: "canva", url: "https://www.canva.com", description: "Design presentations, posters, infographics, and social media graphics. Free templates and an easy drag-and-drop editor.", icon: "https://www.canva.com/favicon.ico", categoryId: cats.creativeDesign.id, tags: ["freemium", "web", "mobile", "beginner-friendly"] },
    { name: "Skillshare", slug: "skillshare", url: "https://www.skillshare.com", description: "Online classes in illustration, design, photography, film, and creative writing. Project-based learning from top creators.", icon: "https://www.skillshare.com/favicon.ico", categoryId: cats.creativeDesign.id, tags: ["paid", "web", "mobile", "video", "community"] },
    { name: "Domestika", slug: "domestika", url: "https://www.domestika.org", description: "Creative courses taught by leading professionals. Learn illustration, animation, graphic design, photography, and more.", icon: "https://www.domestika.org/favicon.ico", categoryId: cats.creativeDesign.id, tags: ["paid", "web", "mobile", "video", "self-paced", "community"] },
    { name: "Figma for Education", slug: "figma-education", url: "https://www.figma.com/education", description: "Free Figma access for students and educators. Collaborative design tool for learning UI/UX and prototyping.", icon: "https://www.figma.com/favicon.ico", categoryId: cats.creativeDesign.id, tags: ["free", "web", "interactive", "community", "higher-education"] },

    // ── Academic Research ──
    { name: "Google Scholar", slug: "google-scholar", url: "https://scholar.google.com", description: "Freely accessible search engine for scholarly literature. Find articles, theses, books, and conference papers across all disciplines.", icon: "https://scholar.google.com/favicon.ico", featured: true, categoryId: cats.academicResearch.id, tags: ["free", "web", "higher-education"] },
    { name: "JSTOR", slug: "jstor", url: "https://www.jstor.org", description: "Digital library of academic journals, books, and primary sources. Access millions of articles across 75 disciplines.", icon: "https://www.jstor.org/favicon.ico", categoryId: cats.academicResearch.id, tags: ["freemium", "web", "higher-education"] },
    { name: "ResearchGate", slug: "researchgate", url: "https://www.researchgate.net", description: "Professional network for scientists and researchers. Share papers, ask questions, and find collaborators.", icon: "https://www.researchgate.net/favicon.ico", categoryId: cats.academicResearch.id, tags: ["free", "web", "community", "higher-education"] },
    { name: "arXiv", slug: "arxiv", url: "https://arxiv.org", description: "Open-access repository of scientific papers in physics, mathematics, computer science, and more. Preprint server by Cornell University.", icon: "https://arxiv.org/favicon.ico", categoryId: cats.academicResearch.id, tags: ["free", "web", "open-source", "higher-education"] },

    // ── Kids & K-12 ──
    { name: "Khan Academy Kids", slug: "khan-academy-kids", url: "https://learn.khanacademy.org/khan-academy-kids/", description: "Free educational app for children ages 2-8. Thousands of activities in reading, math, and social-emotional learning.", icon: "https://www.khanacademy.org/favicon.ico", categoryId: cats.kidsK12.id, tags: ["free", "mobile", "interactive", "k-12", "beginner-friendly"] },
    { name: "Scratch", slug: "scratch", url: "https://scratch.mit.edu", description: "Visual programming language by MIT for kids. Create stories, games, and animations while learning coding concepts.", icon: "https://scratch.mit.edu/favicon.ico", featured: true, categoryId: cats.kidsK12.id, tags: ["free", "web", "interactive", "open-source", "k-12", "beginner-friendly", "community"] },
    { name: "Prodigy Math", slug: "prodigy-math", url: "https://www.prodigygame.com", description: "Game-based math learning platform for grades 1-8. Adaptive curriculum aligned with school standards.", icon: "https://www.prodigygame.com/favicon.ico", categoryId: cats.kidsK12.id, tags: ["freemium", "web", "mobile", "interactive", "k-12", "beginner-friendly"] },
    { name: "IXL", slug: "ixl", url: "https://www.ixl.com", description: "Personalized learning platform for K-12 math, language arts, science, and social studies. Adaptive practice with analytics.", icon: "https://www.ixl.com/favicon.ico", categoryId: cats.kidsK12.id, tags: ["paid", "web", "mobile", "interactive", "k-12"] },

    // ── Professional Development ──
    { name: "LinkedIn Learning", slug: "linkedin-learning", url: "https://www.linkedin.com/learning/", description: "Professional courses in business, technology, and creative skills. Certificates recognized by employers worldwide.", icon: "https://www.linkedin.com/favicon.ico", featured: true, categoryId: cats.professionalDev.id, tags: ["paid", "web", "mobile", "certificate", "video", "professional", "self-paced"] },
    { name: "MasterClass", slug: "masterclass", url: "https://www.masterclass.com", description: "Online classes taught by world-famous experts. Learn cooking, writing, business, music, and more from the very best.", icon: "https://www.masterclass.com/favicon.ico", categoryId: cats.professionalDev.id, tags: ["paid", "web", "mobile", "video", "self-paced"] },
    { name: "Pluralsight", slug: "pluralsight", url: "https://www.pluralsight.com", description: "Technology skills platform for developers and IT professionals. Skill assessments, learning paths, and hands-on labs.", icon: "https://www.pluralsight.com/favicon.ico", categoryId: cats.professionalDev.id, tags: ["paid", "web", "mobile", "certificate", "video", "professional"] },
    { name: "DataCamp", slug: "datacamp", url: "https://www.datacamp.com", description: "Learn data science and analytics online. Interactive courses in Python, R, SQL, and machine learning.", icon: "https://www.datacamp.com/favicon.ico", categoryId: cats.professionalDev.id, tags: ["freemium", "web", "interactive", "certificate", "professional", "self-paced"] },

    // ── Teaching & LMS ──
    { name: "Google Classroom", slug: "google-classroom", url: "https://classroom.google.com", description: "Free learning management system by Google. Create classes, distribute assignments, and communicate with students.", icon: "https://classroom.google.com/favicon.ico", featured: true, categoryId: cats.teachingLMS.id, tags: ["free", "web", "mobile", "k-12", "higher-education", "community"] },
    { name: "Moodle", slug: "moodle", url: "https://moodle.org", description: "Open-source learning management system used by 300M+ users. Customizable, scalable, and free for educators.", icon: "https://moodle.org/favicon.ico", categoryId: cats.teachingLMS.id, tags: ["free", "web", "open-source", "k-12", "higher-education", "community"] },
    { name: "Canvas LMS", slug: "canvas-lms", url: "https://www.instructure.com/canvas", description: "Modern learning management system used by thousands of schools and universities. Assignments, grades, and discussions.", icon: "https://www.instructure.com/favicon.ico", categoryId: cats.teachingLMS.id, tags: ["freemium", "web", "mobile", "higher-education", "community"] },

    // ── Books & Reading ──
    { name: "Audible", slug: "audible", url: "https://www.audible.com", description: "World's largest selection of audiobooks, podcasts, and originals. Listen and learn on the go with Amazon's audio platform.", icon: "https://www.audible.com/favicon.ico", categoryId: cats.booksReading.id, tags: ["paid", "mobile", "self-paced"] },
    { name: "Project Gutenberg", slug: "project-gutenberg", url: "https://www.gutenberg.org", description: "Free library of over 70,000 e-books. Classic literature and historical texts in the public domain.", icon: "https://www.gutenberg.org/favicon.ico", categoryId: cats.booksReading.id, tags: ["free", "web", "open-source", "self-paced"] },
    { name: "Libby", slug: "libby", url: "https://www.overdrive.com/apps/libby", description: "Borrow free e-books and audiobooks from your local library. Clean interface and seamless reading experience.", icon: "https://www.overdrive.com/favicon.ico", categoryId: cats.booksReading.id, tags: ["free", "mobile", "self-paced", "beginner-friendly"] },

    // ── Community & Forums ──
    { name: "Stack Exchange", slug: "stack-exchange", url: "https://stackexchange.com", description: "Network of Q&A communities covering 170+ topics from academia and science to math, languages, and more.", icon: "https://stackexchange.com/favicon.ico", categoryId: cats.communityForums.id, tags: ["free", "web", "community", "higher-education"] },
    { name: "Reddit Learn Programming", slug: "reddit-learnprogramming", url: "https://www.reddit.com/r/learnprogramming/", description: "Subreddit dedicated to learning programming. Resources, advice, and support from a community of over 3 million learners.", icon: "https://www.reddit.com/favicon.ico", categoryId: cats.communityForums.id, tags: ["free", "web", "community", "beginner-friendly"] },
    { name: "Discord Edu Servers", slug: "discord-edu", url: "https://discord.com", description: "Thousands of educational Discord servers for study groups, tutoring, and academic discussion across all subjects.", icon: "https://discord.com/favicon.ico", categoryId: cats.communityForums.id, tags: ["free", "web", "mobile", "community", "interactive"] },
  ];

  for (const item of items) {
    const { tags: itemTags, ...itemData } = item;
    const created = await prisma.item.create({
      data: {
        ...itemData,
        tags: {
          create: itemTags.map((tagSlug) => ({
            tag: { connect: { slug: tagSlug } },
          })),
        },
      },
    });
    console.log(`Created item: ${created.name}`);
  }

  // ── Providers ───────────────────────────────────────
  const providers = {
    coursera: await prisma.provider.create({
      data: { name: "Coursera", slug: "coursera", url: "https://www.coursera.org", logo: "https://www.coursera.org/favicon.ico", description: "Online courses from top universities and companies", apiType: "rest", syncFrequency: "daily" },
    }),
    udemy: await prisma.provider.create({
      data: { name: "Udemy", slug: "udemy-provider", url: "https://www.udemy.com", logo: "https://www.udemy.com/favicon.ico", description: "Online learning marketplace with 200k+ courses", apiType: "rest", syncFrequency: "daily" },
    }),
    edx: await prisma.provider.create({
      data: { name: "edX", slug: "edx-provider", url: "https://www.edx.org", logo: "https://www.edx.org/favicon.ico", description: "Free online courses from Harvard, MIT & more", apiType: "rest", syncFrequency: "daily" },
    }),
    indeed: await prisma.provider.create({
      data: { name: "Indeed", slug: "indeed", url: "https://www.indeed.com", logo: "https://www.indeed.com/favicon.ico", description: "World's #1 job site for education jobs", apiType: "rest", syncFrequency: "daily" },
    }),
    linkedin: await prisma.provider.create({
      data: { name: "LinkedIn Jobs", slug: "linkedin-jobs", url: "https://www.linkedin.com/jobs", logo: "https://www.linkedin.com/favicon.ico", description: "Professional network job listings", apiType: "rest", syncFrequency: "daily" },
    }),
    eventbrite: await prisma.provider.create({
      data: { name: "Eventbrite", slug: "eventbrite", url: "https://www.eventbrite.com", logo: "https://www.eventbrite.com/favicon.ico", description: "Educational events, conferences & workshops", apiType: "rest", syncFrequency: "daily" },
    }),
    remotive: await prisma.provider.create({
      data: {
        name: "Remotive",
        slug: "remotive",
        url: "https://remotive.com",
        logo: "https://remotive.com/favicon.ico",
        description: "Remote jobs with education and EdTech roles",
        apiType: "rest",
        authType: "none",
        syncFrequency: "hourly",
        rateLimitPerMinute: 30,
        complianceNotes: "Requires Remotive attribution and source link.",
      },
    }),
    usajobs: await prisma.provider.create({
      data: {
        name: "USAJOBS",
        slug: "usajobs",
        url: "https://www.usajobs.gov",
        logo: "https://www.usajobs.gov/favicon.ico",
        description: "Official U.S. government job listings",
        apiType: "rest",
        authType: "api_key",
        syncFrequency: "daily",
        rateLimitPerMinute: 60,
        complianceNotes: "Use official application links and source attribution.",
      },
    }),
    ticketmaster: await prisma.provider.create({
      data: {
        name: "Ticketmaster",
        slug: "ticketmaster",
        url: "https://www.ticketmaster.com",
        logo: "https://www.ticketmaster.com/favicon.ico",
        description: "Event discovery API for public events",
        apiType: "rest",
        authType: "api_key",
        syncFrequency: "daily",
        rateLimitPerMinute: 300,
        complianceNotes: "Future events only; expire ended events.",
      },
    }),
    awin: await prisma.provider.create({
      data: {
        name: "Awin",
        slug: "awin",
        url: "https://www.awin.com",
        logo: "https://www.awin.com/favicon.ico",
        description: "Affiliate promotions and voucher codes",
        apiType: "rest",
        authType: "token",
        syncFrequency: "hourly",
        rateLimitPerMinute: 60,
        complianceNotes: "Publisher offers only; use account-approved promotions.",
      },
    }),
    manual: await prisma.provider.create({
      data: { name: "EDU Passport Editorial", slug: "edupassport-editorial", url: "https://edupassport.me", logo: "/logo.svg", description: "Manually curated by the EDU Passport team", apiType: "manual", syncFrequency: "weekly" },
    }),
  };

  console.log("Created providers");

  // ── Sample Listings: Courses ───────────────────────
  const courseListings = [
    { title: "Machine Learning Specialization", slug: "ml-specialization-stanford", type: "course" as const, description: "Master fundamental AI concepts and develop practical machine learning skills in this beginner-friendly program by Stanford and DeepLearning.AI.", url: "https://www.coursera.org/specializations/machine-learning-introduction", image: "https://d3njjcbhbojbot.cloudfront.net/api/utilities/v1/imageproxy/ml-specialization.jpg", price: 0, priceLabel: "Free to audit", rating: 4.9, reviewCount: 48200, duration: "3 months", level: "Beginner", providerId: providers.coursera.id, categoryId: cats.onlineCourses.id, externalId: "ml-spec-stanford", tagSlugs: ["free", "certificate", "self-paced", "video", "beginner-friendly"] },
    { title: "Google Data Analytics Certificate", slug: "google-data-analytics-cert", type: "course" as const, description: "Get started in data analytics with this Google Career Certificate. No experience needed—learn SQL, R, Tableau, and more.", url: "https://www.coursera.org/professional-certificates/google-data-analytics", price: 49, priceLabel: "$49/mo", rating: 4.8, reviewCount: 132000, duration: "6 months", level: "Beginner", providerId: providers.coursera.id, categoryId: cats.professionalDev.id, externalId: "google-da-cert", tagSlugs: ["freemium", "certificate", "self-paced", "video", "professional", "beginner-friendly"] },
    { title: "CS50: Introduction to Computer Science", slug: "cs50-intro-computer-science", type: "course" as const, description: "Harvard's legendary introduction to computer science. Learn C, Python, SQL, web development, and more with David Malan.", url: "https://www.edx.org/learn/computer-science/harvard-university-cs50s-introduction-to-computer-science", price: 0, priceLabel: "Free", rating: 4.9, reviewCount: 78000, duration: "12 weeks", level: "Beginner", providerId: providers.edx.id, categoryId: cats.codingTech.id, externalId: "cs50-harvard", tagSlugs: ["free", "certificate", "self-paced", "video", "beginner-friendly", "higher-education"] },
    { title: "The Complete 2025 Web Development Bootcamp", slug: "complete-web-dev-bootcamp-2025", type: "course" as const, description: "Become a full-stack web developer in one course. HTML, CSS, JavaScript, React, Node.js, MongoDB, and more.", url: "https://www.udemy.com/course/the-complete-web-development-bootcamp/", price: 12.99, priceLabel: "$12.99", rating: 4.7, reviewCount: 350000, duration: "55 hours", level: "Beginner", providerId: providers.udemy.id, categoryId: cats.codingTech.id, externalId: "udemy-webdev-bootcamp", tagSlugs: ["paid", "self-paced", "video", "beginner-friendly", "certificate"] },
    { title: "AWS Cloud Practitioner Essentials", slug: "aws-cloud-practitioner-essentials", type: "course" as const, description: "Fundamental understanding of AWS Cloud. Prepare for the AWS Certified Cloud Practitioner exam with hands-on labs.", url: "https://www.coursera.org/learn/aws-cloud-practitioner-essentials", price: 0, priceLabel: "Free to audit", rating: 4.7, reviewCount: 25000, duration: "6 hours", level: "Beginner", providerId: providers.coursera.id, categoryId: cats.professionalDev.id, externalId: "aws-ccp-essentials", tagSlugs: ["freemium", "certificate", "self-paced", "professional", "beginner-friendly"] },
    { title: "Python for Everybody", slug: "python-for-everybody-umich", type: "course" as const, description: "Learn to program and analyze data with Python. University of Michigan's most popular specialization on Coursera.", url: "https://www.coursera.org/specializations/python", price: 0, priceLabel: "Free to audit", rating: 4.8, reviewCount: 245000, duration: "8 months", level: "Beginner", providerId: providers.coursera.id, categoryId: cats.codingTech.id, externalId: "python-everybody-umich", tagSlugs: ["free", "certificate", "self-paced", "video", "beginner-friendly"] },
    { title: "UX Design Professional Certificate by Google", slug: "google-ux-design-cert", type: "course" as const, description: "Start your career in UX design. Learn wireframing, prototyping, and user research in this Google Career Certificate.", url: "https://www.coursera.org/professional-certificates/google-ux-design", price: 49, priceLabel: "$49/mo", rating: 4.7, reviewCount: 89000, duration: "6 months", level: "Beginner", providerId: providers.coursera.id, categoryId: cats.creativeDesign.id, externalId: "google-ux-cert", tagSlugs: ["freemium", "certificate", "self-paced", "video", "professional"] },
    { title: "Deep Learning Specialization", slug: "deep-learning-specialization", type: "course" as const, description: "Master deep learning by Andrew Ng. Build neural networks, CNNs, RNNs, and apply them to real-world projects.", url: "https://www.coursera.org/specializations/deep-learning", price: 0, priceLabel: "Free to audit", rating: 4.9, reviewCount: 156000, duration: "5 months", level: "Intermediate", providerId: providers.coursera.id, categoryId: cats.onlineCourses.id, externalId: "deep-learning-spec", tagSlugs: ["freemium", "certificate", "self-paced", "video", "higher-education"] },
  ];

  // ── Sample Listings: Jobs ──────────────────────────
  const jobListings = [
    { title: "Online Math Tutor (Remote)", slug: "online-math-tutor-remote", type: "job" as const, description: "Seeking experienced math tutors for K-12 and college-level students. Flexible hours, competitive pay ($25-45/hr). Must have a bachelor's degree in mathematics or related field.", url: "https://www.indeed.com/viewjob?jk=example1", location: "Remote", priceLabel: "$25-45/hr", providerId: providers.indeed.id, categoryId: cats.testPrep.id, externalId: "indeed-math-tutor-1", tagSlugs: ["beginner-friendly", "k-12", "higher-education"] },
    { title: "Curriculum Developer — EdTech Startup", slug: "curriculum-developer-edtech", type: "job" as const, description: "Design and develop K-12 STEM curricula for our AI-powered learning platform. 3+ years experience in instructional design required.", url: "https://www.indeed.com/viewjob?jk=example2", location: "New York, NY (Hybrid)", priceLabel: "$75k-95k", providerId: providers.indeed.id, categoryId: cats.teachingLMS.id, externalId: "indeed-curriculum-dev-1", tagSlugs: ["professional", "ai-powered", "k-12"] },
    { title: "Senior Instructional Designer", slug: "senior-instructional-designer-linkedin", type: "job" as const, description: "Join a top university's online learning team. Design engaging courses using evidence-based pedagogy. PhD preferred.", url: "https://www.linkedin.com/jobs/view/example1", location: "Boston, MA (Remote OK)", priceLabel: "$85k-120k", providerId: providers.linkedin.id, categoryId: cats.teachingLMS.id, externalId: "linkedin-instr-design-1", tagSlugs: ["professional", "higher-education"] },
    { title: "ESL Teacher — Online Academy", slug: "esl-teacher-online-academy", type: "job" as const, description: "Teach English as a second language to international students. TEFL/TESOL certification required. Flexible schedule, work from home.", url: "https://www.indeed.com/viewjob?jk=example3", location: "Remote", priceLabel: "$20-35/hr", providerId: providers.indeed.id, categoryId: cats.languageLearning.id, externalId: "indeed-esl-teacher-1", tagSlugs: ["beginner-friendly", "community"] },
    { title: "Learning Engineer — AI Education Platform", slug: "learning-engineer-ai-platform", type: "job" as const, description: "Build adaptive learning systems using ML/NLP. Work at the intersection of AI and education. Python, TensorFlow required.", url: "https://www.linkedin.com/jobs/view/example2", location: "San Francisco, CA (Hybrid)", priceLabel: "$130k-180k", providerId: providers.linkedin.id, categoryId: cats.aiStudyTools.id, externalId: "linkedin-learning-eng-1", tagSlugs: ["professional", "ai-powered"] },
    { title: "K-12 Science Teacher", slug: "k12-science-teacher-charter", type: "job" as const, description: "Full-time science teacher position at a progressive charter school. Teaching biology and chemistry to grades 9-12.", url: "https://www.indeed.com/viewjob?jk=example4", location: "Chicago, IL", priceLabel: "$55k-72k", providerId: providers.indeed.id, categoryId: cats.stemScience.id, externalId: "indeed-science-teacher-1", tagSlugs: ["k-12", "community"] },
  ];

  // ── Sample Listings: Events ────────────────────────
  const eventListings = [
    { title: "EdTech World Forum 2025", slug: "edtech-world-forum-2025", type: "event" as const, description: "The world's leading education technology conference. 3 days of keynotes, workshops, and networking with 5,000+ educators and innovators.", url: "https://www.eventbrite.com/e/edtech-world-forum", location: "London, UK", startDate: new Date("2025-06-15"), endDate: new Date("2025-06-17"), price: 499, priceLabel: "From $499", providerId: providers.eventbrite.id, categoryId: cats.teachingLMS.id, externalId: "eb-edtech-forum-2025", tagSlugs: ["professional", "community"] },
    { title: "AI in Education Summit", slug: "ai-education-summit-2025", type: "event" as const, description: "Explore how artificial intelligence is transforming learning. Hands-on workshops on AI tutoring, automated grading, and personalized learning paths.", url: "https://www.eventbrite.com/e/ai-edu-summit", location: "Virtual", startDate: new Date("2025-04-20"), endDate: new Date("2025-04-21"), price: 0, priceLabel: "Free", providerId: providers.eventbrite.id, categoryId: cats.aiStudyTools.id, externalId: "eb-ai-edu-summit-2025", tagSlugs: ["free", "ai-powered", "community", "interactive"] },
    { title: "SXSW EDU 2025", slug: "sxsw-edu-2025", type: "event" as const, description: "Annual education conference and festival in Austin, TX. Sessions on innovation, equity, and the future of learning.", url: "https://www.eventbrite.com/e/sxsw-edu-2025", location: "Austin, TX", startDate: new Date("2025-03-03"), endDate: new Date("2025-03-06"), price: 695, priceLabel: "From $695", providerId: providers.eventbrite.id, categoryId: cats.professionalDev.id, externalId: "eb-sxsw-edu-2025", tagSlugs: ["professional", "community", "interactive"] },
    { title: "Google for Education: Certified Educator Workshop", slug: "google-certified-educator-workshop", type: "event" as const, description: "Free virtual workshop to prepare for Google Certified Educator Level 1 exam. Learn Google Workspace tools for the classroom.", url: "https://www.eventbrite.com/e/google-edu-workshop", location: "Virtual", startDate: new Date("2025-05-10"), endDate: new Date("2025-05-10"), price: 0, priceLabel: "Free", providerId: providers.eventbrite.id, categoryId: cats.teachingLMS.id, externalId: "eb-google-edu-workshop", tagSlugs: ["free", "certificate", "interactive", "beginner-friendly"] },
    { title: "International Literacy Conference", slug: "international-literacy-conference-2025", type: "event" as const, description: "Annual gathering of literacy educators, researchers, and advocates. Workshops on reading instruction, children's literature, and digital literacy.", url: "https://www.eventbrite.com/e/literacy-conf-2025", location: "Nashville, TN", startDate: new Date("2025-07-12"), endDate: new Date("2025-07-14"), price: 350, priceLabel: "From $350", providerId: providers.eventbrite.id, categoryId: cats.booksReading.id, externalId: "eb-literacy-conf-2025", tagSlugs: ["professional", "community", "k-12"] },
  ];

  // Create all listings
  const allListings = [...courseListings, ...jobListings, ...eventListings];
  for (const listing of allListings) {
    const { tagSlugs: lstTags, ...listingData } = listing;
    const created = await prisma.listing.create({
      data: {
        ...listingData,
        tags: {
          create: (lstTags ?? []).map((tagSlug) => ({
            tag: { connect: { slug: tagSlug } },
          })),
        },
      },
    });
    console.log(`Created listing: ${created.title}`);
  }

  // ── Sample Listing Offers (price comparison) ───────
  const mlListing = await prisma.listing.findUnique({ where: { slug: "ml-specialization-stanford" } });
  if (mlListing) {
    await prisma.listingOffer.createMany({
      data: [
        { listingId: mlListing.id, providerId: providers.coursera.id, url: "https://www.coursera.org/specializations/machine-learning-introduction", price: 0, priceLabel: "Free to audit", currency: "USD" },
        { listingId: mlListing.id, providerId: providers.edx.id, url: "https://www.edx.org/learn/machine-learning", price: 0, priceLabel: "Free to audit", currency: "USD" },
        { listingId: mlListing.id, providerId: providers.udemy.id, url: "https://www.udemy.com/course/machinelearning/", price: 12.99, priceLabel: "$12.99", currency: "USD" },
      ],
    });
    console.log("Created listing offers for ML Specialization");
  }

  // ── Deals ──────────────────────────────────────────
  const deals = [
    { title: "Coursera Plus Annual — 40% Off", slug: "coursera-plus-40-off", description: "Get unlimited access to 7,000+ courses and professional certificates with Coursera Plus. Limited-time 40% discount.", code: "LEARN40", url: "https://www.coursera.org/courseraplus", discount: "40% off", providerName: "Coursera", categorySlug: "online-courses", expiresAt: new Date("2025-06-30") },
    { title: "Udemy Flash Sale — Courses from $9.99", slug: "udemy-flash-sale-999", description: "Thousands of top-rated courses starting at just $9.99 during Udemy's flash sale event.", url: "https://www.udemy.com", discount: "Up to 90% off", providerName: "Udemy", categorySlug: "online-courses", expiresAt: new Date("2025-04-15") },
    { title: "Free Month of Skillshare Premium", slug: "skillshare-free-month", description: "Get one full month of Skillshare Premium free. Access thousands of creative classes in design, illustration, and photography.", code: "FREETRIAL", url: "https://www.skillshare.com", discount: "Free month", providerName: "Skillshare", categorySlug: "creative-design", expiresAt: new Date("2025-12-31") },
    { title: "LinkedIn Learning — Free 1-Month Trial", slug: "linkedin-learning-free-trial", description: "Try LinkedIn Learning free for 1 month. Access 16,000+ business, tech, and creative courses.", url: "https://www.linkedin.com/learning/subscription/free-trial", discount: "Free 1-month trial", providerName: "LinkedIn Learning", categorySlug: "professional-development", expiresAt: new Date("2025-12-31") },
    { title: "DataCamp — 50% Off Annual Plan", slug: "datacamp-50-off-annual", description: "Learn data science for half price. 50% off DataCamp's annual subscription with access to 400+ courses.", code: "DATA50", url: "https://www.datacamp.com", discount: "50% off", providerName: "DataCamp", categorySlug: "professional-development", expiresAt: new Date("2025-05-31") },
    { title: "Grammarly Premium — 40% Student Discount", slug: "grammarly-student-discount", description: "Students get 40% off Grammarly Premium. AI-powered writing assistance for essays, research papers, and more.", url: "https://www.grammarly.com/edu", discount: "40% off (students)", providerName: "Grammarly", categorySlug: "writing-research", expiresAt: new Date("2025-12-31") },
    { title: "Brilliant Premium — 20% Off Annual", slug: "brilliant-20-off-annual", description: "Save 20% on Brilliant Premium annual plan. Interactive STEM courses in math, science, and computer science.", code: "STEM20", url: "https://brilliant.org", discount: "20% off", providerName: "Brilliant", categorySlug: "stem-science", expiresAt: new Date("2025-08-31") },
    { title: "Duolingo Super — 60% Off Family Plan", slug: "duolingo-super-family-discount", description: "Learn languages together! 60% off Duolingo Super family plan for up to 6 members.", url: "https://www.duolingo.com/super", discount: "60% off family plan", providerName: "Duolingo", categorySlug: "language-learning", expiresAt: new Date("2025-07-31") },
  ];

  for (const deal of deals) {
    const created = await prisma.deal.create({ data: deal });
    console.log(`Created deal: ${created.title}`);
  }

  // ── Phase 4: Affiliate config on providers ──────────
  const affiliateConfig: Record<string, { affiliateTag: string; commissionRate: number }> = {
    coursera: { affiliateTag: "edupassport_coursera", commissionRate: 0.15 },
    udemy: { affiliateTag: "edupassport_udemy", commissionRate: 0.10 },
    edx: { affiliateTag: "edupassport_edx", commissionRate: 0.12 },
    eventbrite: { affiliateTag: "edupassport_eb", commissionRate: 0.05 },
  };

  for (const [slug, config] of Object.entries(affiliateConfig)) {
    await prisma.provider.updateMany({
      where: { slug },
      data: { affiliateTag: config.affiliateTag, commissionRate: config.commissionRate },
    });
    console.log(`Set affiliate config for ${slug}: ${config.affiliateTag} (${config.commissionRate * 100}%)`);
  }

  // ── Phase 4: Sponsored listings ─────────────────────
  const sponsoredSlugs = [
    { slug: "ml-specialization-stanford", position: "hero", budget: 500, cpc: 0.50 },
    { slug: "google-data-analytics-cert", position: "feed", budget: 300, cpc: 0.35 },
    { slug: "cs50-intro-computer-science", position: "feed", budget: 200, cpc: 0.25 },
    { slug: "complete-web-dev-bootcamp-2025", position: "sidebar", budget: 150, cpc: 0.20 },
  ];

  for (const sp of sponsoredSlugs) {
    const listing = await prisma.listing.findUnique({ where: { slug: sp.slug } });
    if (listing) {
      await prisma.sponsoredListing.create({
        data: {
          listingId: listing.id,
          position: sp.position,
          budget: sp.budget,
          cpc: sp.cpc,
          endDate: new Date("2025-12-31"),
        },
      });
      console.log(`Created sponsored listing: ${listing.title} (${sp.position})`);
    }
  }

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
