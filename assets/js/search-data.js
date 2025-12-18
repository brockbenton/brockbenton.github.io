// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "about",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-notes",
          title: "notes",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/notes/index.html";
          },
        },{id: "nav-projects",
          title: "projects",
          description: "A collection of various projects.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/projects/";
          },
        },{id: "nav-resume",
          title: "resume",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/assets/pdf/resume/resume.pdf";
          },
        },{id: "post-the-underlying-demand-for-cryptocurrency-technology",
        
          title: "The Underlying Demand for Cryptocurrency Technology",
        
        description: "",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/demand-of-cc/";
          
        },
      },{id: "post-utility-tokens-as-a-commitment-to-competition-a-presentation-summary",
        
          title: "Utility Tokens as a Commitment to Competition: A Presentation Summary",
        
        description: "A brief summary of &quot;Utility Tokens as a Commitment to Competition&quot; by Goldstein et al. for CSCI 4831-801",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/utcc/";
          
        },
      },{id: "books-the-godfather",
          title: 'The Godfather',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/the_godfather/";
            },},{id: "news-i-am-grateful-to-have-been-selected-as-a-recipient-of-the-boettcher-scholarship-a-prestigious-full-ride-award-granted-each-year-to-50-colorado-high-school-seniors-who-demonstrate-exceptional-academic-achievement-intellectual-curiosity-leadership-community-and-school-involvement-and-strong-character",
          title: 'I am grateful to have been selected as a recipient of the Boettcher...',
          description: "",
          section: "News",},{id: "news-i-had-the-opportunity-to-compete-in-the-2025-daniels-fund-national-ethics-case-competition-where-my-team-and-i-applied-ethical-principles-to-real-world-business-challenges-navigating-complex-scenarios-where-moral-values-and-business-interests-collide",
          title: 'I had the opportunity to compete in the 2025 Daniels Fund National Ethics...',
          description: "",
          section: "News",},{id: "news-over-this-last-weekend-i-participated-in-my-first-hackathon-at-the-midwest-blockchain-conference-our-team-developed-a-prediction-powered-escrow-that-acts-as-an-onchain-commitment-device-alongside-hacking-i-networked-with-dozens-of-students-recruiters-founders-and-venture-capitalists-from-across-the-nation",
          title: 'Over this last weekend, I participated in my first hackathon at the Midwest...',
          description: "",
          section: "News",},{id: "projects-base-bets-mbc-hackathon",
          title: 'Base Bets (MBC Hackathon)',
          description: "A prediction-powered USDC escrow system that automatically releases funds based on real-world outcomes verified through Polymarket, built on Base L2 with gasless transactions.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/base-bets/";
            },},{id: "projects-distributed-blockchain-network-c",
          title: 'Distributed Blockchain Network (C++)',
          description: "A proof-of-work blockchain in C++ featuring SHA-256 mining, transaction validation, and peer-to-peer networking with automatic distributed consensus.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/cpp-blockchain/";
            },},{id: "projects-git-infastructure-with-ci-cd-pipeline",
          title: 'Git Infastructure with CI/CD Pipeline',
          description: "A fully-fledged self-hosted Git server with enterprise-grade automation capabilities.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/githomelab/";
            },},{
        id: 'social-email',
        title: 'email',
        section: 'Socials',
        handler: () => {
          window.open("mailto:%62%72%6F%63%6B.%62%65%6E%74%6F%6E@%63%6F%6C%6F%72%61%64%6F.%65%64%75", "_blank");
        },
      },{
        id: 'social-github',
        title: 'GitHub',
        section: 'Socials',
        handler: () => {
          window.open("https://github.com/brockbenton", "_blank");
        },
      },{
        id: 'social-linkedin',
        title: 'LinkedIn',
        section: 'Socials',
        handler: () => {
          window.open("https://www.linkedin.com/in/brockbenton", "_blank");
        },
      },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
