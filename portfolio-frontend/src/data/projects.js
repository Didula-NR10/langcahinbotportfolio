// Verified facts from the public repositories and the developer's supplied brief.
// Add genuine interface images to coverImage/gallery when they become available.
export const projects = [
  {
    id: 'tripsmart', number: '01', title: 'TripSmart', category: 'Web & Mobile', categoryLabel: 'Travel / Forecasting',
    subtitle: 'Weather intelligence for travel decisions',
    description: 'An Expo travel client backed by a FastAPI forecasting service for Sri Lankan districts, travel advisories, accounts and saved notes.',
    technologies: ['TypeScript', 'React Native', 'Expo', 'Python', 'FastAPI', 'SQLAlchemy', 'Supabase', 'Keras'],
    stack: { Languages: ['TypeScript', 'Python'], Frontend: ['React Native', 'Expo Router'], 'Backend & API': ['FastAPI', 'Pydantic'], 'Data & models': ['SQLAlchemy', 'Supabase PostgreSQL', 'Keras GRU', 'WeatherAPI'], Deployment: ['Docker backend', 'Vercel web client'] },
    architecture: {
      label: 'Hybrid architecture', subtitle: 'Layered × feature-based',
      summary: 'The active backend groups auth, forecast, notes and reports by feature. Forecast routers delegate to a service that coordinates repositories for observations, the model, weather data and stored forecasts.',
      nodes: [
        { name: 'Expo client', role: 'Presents forecasts, district selection and account flows.', receives: 'User input and API responses', connects: 'FastAPI router' },
        { name: 'FastAPI router', role: 'Validates requests and exposes forecast endpoints.', receives: 'HTTP requests and Pydantic payloads', connects: 'Forecast service' },
        { name: 'Forecast service', role: 'Builds features, runs inference and turns results into travel advice.', receives: 'Validated district or observation input', connects: 'Repositories' },
        { name: 'Repositories', role: 'Isolates model loading, weather retrieval and persistence.', receives: 'Service data requests', connects: 'Model / WeatherAPI / database' },
        { name: 'Data & model', role: 'Provides observations, persisted records and GRU predictions.', receives: 'Repository reads and writes', connects: 'Repositories' }
      ]
    },
    highlights: ['Router–service–repository separation', 'Feature-based backend modules', '168-hour inputs for 24-hour forecasts', 'Forecast health and district endpoints'],
    overview: 'TripSmart combines a React Native/Expo client with a FastAPI backend for Sri Lankan district forecasts and travel advice. The backend also contains account, notes and reports routes; forecasting can run without database persistence when database configuration is unavailable.',
    problem: 'A trip planner needs weather information presented as decisions rather than raw measurements alone.',
    solution: 'Forecast routes accept a district or observation window, run a service pipeline, and return hourly conditions with travel advisories.',
    features: [
      { name: 'District forecasting', detail: 'The forecast route retrieves a 168-hour observation window, runs GRU inference and returns 24 hourly outputs with advisory labels.' },
      { name: 'Weekly outlook', detail: 'A separate endpoint builds a seven-day outlook. Later days use autoregressive predictions and display declining confidence.' },
      { name: 'Current conditions', detail: 'A dedicated route retrieves live conditions from WeatherAPI without passing them through the predictive model.' },
      { name: 'Accounts and notes', detail: 'Authentication, journal/notes and reports routers are registered in the backend entry point.' }
    ],
    decisions: ['Group routers, services and repositories within related features.', 'Keep forecast HTTP handlers thin while the service coordinates feature engineering, inference and advisories.', 'Allow forecast endpoints to remain available if optional database initialization fails.'],
    principles: ['Separation of concerns', 'Feature cohesion', 'Explicit persistence boundary'],
    dataFlow: 'District selection → FastAPI forecast router → ForecastService → observation/model/weather repositories → forecast and advisory response → Expo client.',
    security: 'The backend contains account routes, password services and configured CORS origins. No broader security or compliance claim is implied.',
    challenges: 'The forecasting service documents a rain-regression limitation: its GRU could underpredict light rain. It combines historical same-hour rain with WeatherAPI forecasts for a range instead of presenting the regressor output as precise rainfall.',
    contribution: 'The hybrid layered and feature-based backend architecture was confirmed by the developer. Individual ownership of every feature has not been specified.',
    coverImage: null, gallery: [], repositoryUrl: 'https://github.com/Didula-NR10/TripSmart', liveUrl: 'https://tripsmart.didulanr12.workers.dev/',
    sourceNote: 'Architecture confirmed by developer; routes, modules and stack checked against the public repository.'
  },
  {
    id: 'golden-treat', number: '02', title: 'Golden Treat Bakery', category: 'Enterprise', categoryLabel: 'Bakery / Operations',
    subtitle: 'Customer commerce and bakery operations',
    description: 'A PHP bakery application with customer and administrative areas, product ordering, billing, stock and account workflows.',
    technologies: ['PHP', 'HTML', 'CSS', 'JavaScript', 'MySQL', 'Composer'],
    stack: { Languages: ['PHP', 'JavaScript', 'HTML', 'CSS', 'SQL'], 'Backend & data': ['PHP request/response', 'MySQL', 'PDO / MySQLi'], Tools: ['Composer', 'PHPMailer'] },
    architecture: {
      label: 'Modular PHP application', subtitle: 'Customer × administration',
      summary: 'Customer and admin entry points are separated, while the bakehouse area contains ordering, billing, stock and product modules. PHP endpoints process requests and update MySQL records; the repository does not establish a consistent MVC layer across the whole application.',
      nodes: [
        { name: 'Customer UI', role: 'Supports browsing, account and ordering workflows.', receives: 'Customer actions', connects: 'PHP endpoints' },
        { name: 'Admin UI', role: 'Exposes product and operational workflows.', receives: 'Staff actions', connects: 'PHP endpoints' },
        { name: 'PHP endpoints', role: 'Processes cart, order, billing and stock requests.', receives: 'Form and JSON requests', connects: 'MySQL' },
        { name: 'MySQL', role: 'Stores products, cart and business records.', receives: 'SQL reads and writes', connects: 'PHP endpoints' }
      ]
    },
    highlights: ['Separate customer and admin areas', 'Database-backed cart retrieval', 'Transactional bill and item creation', 'Stock and order modules'],
    overview: 'Golden Treat Bakery organizes bakery commerce and operations in a PHP codebase with distinct customer and administrative areas, plus focused bakehouse modules.',
    problem: 'Bakery customer activity and internal operations need shared product and transaction records while exposing different workflows.',
    solution: 'PHP pages and endpoints handle customer interactions and operational tasks against MySQL records. Billing code writes a bill and its items inside a transaction.',
    features: [
      { name: 'Customer cart', detail: 'A session-based cart endpoint joins cart and product records and returns item, quantity, price, stock and image data as JSON.' },
      { name: 'Billing', detail: 'The bill-saving endpoint inserts a bill and its items in one database transaction and optionally updates stock.' },
      { name: 'Operations', detail: 'The repository includes product administration, stock, sales and order directories with PHP pages and endpoints.' }
    ],
    decisions: ['Separate customer and administrative entry points.', 'Keep business functions in directories such as order, billing and stock.', 'Use a database transaction when recording a bill and its item rows.'],
    principles: ['Functional modularity', 'Customer/admin responsibility boundaries', 'Transactional data updates'],
    dataFlow: 'Customer or admin action → PHP page/API → SQL statements → MySQL business records → response or refreshed page.',
    security: 'The cart endpoint reads a PHP session identifier and uses a prepared statement for product lookup. This does not establish protections for every endpoint.',
    challenges: 'The repository combines multiple PHP modules and database access styles. This case study describes observed boundaries without labeling the whole codebase MVC.',
    contribution: 'The repository is under a collaborator account. Your individual responsibilities in this team project have not yet been specified.',
    coverImage: null, gallery: [], repositoryUrl: 'https://github.com/Diablo-Haritha/Golden-Treat-Bakery', liveUrl: 'https://goldentreat.didulanr12.workers.dev/',
    sourceNote: 'Module structure, Composer manifest, cart and billing endpoints checked on the public DEV branch.'
  },
  {
    id: 'the-last-run', number: '03', title: 'The Last Run', category: 'Other', categoryLabel: 'Java / Game Development',
    subtitle: 'A Java survival game with persistent player records',
    description: 'A Swing survival game with login, a player dashboard, stone collection, timed play and a MySQL leaderboard.',
    technologies: ['Java', 'Swing', 'JDBC', 'MySQL', 'Eclipse'],
    stack: { Language: ['Java'], Interface: ['Java Swing', 'AWT'], Data: ['JDBC', 'MySQL'], Tools: ['Eclipse'] },
    architecture: {
      label: 'MVC-oriented structure', subtitle: 'Model × view × interaction',
      summary: 'The developer confirms an MVC approach and an emphasis on low coupling and high cohesion. In the repository, DatabaseManager handles SQL while Swing windows render screens; listeners and game state remain in the window classes. This is MVC-oriented rather than a strictly separated three-package MVC.',
      nodes: [
        { name: 'Player input', role: 'Supplies login, navigation and keyboard actions.', receives: 'User actions', connects: 'Swing listeners' },
        { name: 'Swing listeners', role: 'Handles buttons, timers and keyboard events in window classes.', receives: 'Input events', connects: 'Game state / data manager' },
        { name: 'Game state', role: 'Tracks positions, obstacles, stones and elapsed time.', receives: 'Timer ticks and key state', connects: 'Swing painting' },
        { name: 'Swing views', role: 'Paints gameplay and presents account and leaderboard screens.', receives: 'Game and database state', connects: 'Player display' },
        { name: 'DatabaseManager', role: 'Runs JDBC queries for account, profile and score records.', receives: 'Window requests', connects: 'MySQL' }
      ]
    },
    highlights: ['MVC-oriented responsibility split', 'Low coupling × high cohesion as design goals', 'Timer-driven Swing gameplay', 'JDBC leaderboard and profile data'],
    overview: 'The Last Run is a Java Swing survival game. Players register or log in, start a timer-driven game, collect stones, and can inspect a leaderboard and edit a profile bio.',
    problem: 'Gameplay, account records and score presentation need distinct responsibilities so UI screens do not have to contain SQL queries.',
    solution: 'DatabaseManager centralizes JDBC operations while AuthWindow, Dashboard and GameWindow present screens and handle events.',
    features: [
      { name: 'Accounts and profiles', detail: 'AuthWindow handles registration/login UI; DatabaseManager performs prepared SQL operations for users and profile bios.' },
      { name: 'Survival play', detail: 'GameWindow uses Swing timers, keyboard input, obstacles, moving game objects and stone collection.' },
      { name: 'Leaderboard', detail: 'DatabaseManager saves scores and retrieves a top-ten table ordered by stones collected and survival time.' }
    ],
    decisions: ['Centralize JDBC access in DatabaseManager rather than repeating SQL in every screen.', 'Use Swing listeners and timers for desktop interaction.', 'Keep authentication, dashboard and gameplay in distinct window classes.'],
    principles: ['MVC-oriented organization', 'Focused database access', 'Low coupling and high cohesion as design goals'],
    dataFlow: 'Player action → Swing listener → game state or DatabaseManager → MySQL when persistence is needed → updated Swing view.',
    security: 'The repository uses prepared statements for account queries. It currently compares plaintext passwords in the database, so this case study does not present the login as production-secure.',
    challenges: 'Interaction handling and game state remain inside Swing windows; controller/model extraction would strengthen the intended MVC boundary. GamePanel.java contains a puzzle placeholder separate from the active GameWindow flow.',
    contribution: 'The MVC direction and focus on low coupling and high cohesion were confirmed by the developer. Individual class ownership has not been supplied.',
    coverImage: null, gallery: [], repositoryUrl: 'https://github.com/Didula-NR10/The-Last-Run.-Eclipse', liveUrl: 'https://lastrun.didulanr12.workers.dev/',
    sourceNote: 'Class responsibilities and JDBC methods checked against the public Java source.'
  },
  {
    id: 'healthcare-system', number: '04', title: 'Healthcare System', category: 'Enterprise', categoryLabel: 'Healthcare / Desktop',
    subtitle: 'Desktop doctor scheduling module',
    description: 'A Java Swing healthcare application; my confirmed contribution is database-connected CRUD for doctor schedule management.',
    technologies: ['Java', 'Swing', 'Database CRUD'],
    stack: { Language: ['Java'], Interface: ['Java Swing'], Data: ['Database-connected CRUD; engine unverified'] },
    architecture: {
      label: 'Desktop data workflow', subtitle: 'Swing interface × schedule records',
      summary: 'The confirmed module links a Java Swing interface with create, read, update and delete operations for doctor schedules. Internal class boundaries, database engine and authentication could not be inspected because the supplied repository URL returned 404.',
      nodes: [
        { name: 'Healthcare user', role: 'Creates and manages doctor schedule entries.', receives: 'Scheduling need', connects: 'Swing interface' },
        { name: 'Swing interface', role: 'Presents scheduling controls and records.', receives: 'User actions and record data', connects: 'Schedule operations' },
        { name: 'Schedule operations', role: 'Performs create, retrieve, update and delete actions.', receives: 'Schedule input', connects: 'Database' },
        { name: 'Database', role: 'Persists doctor schedule records; engine not verified.', receives: 'CRUD operations', connects: 'Schedule operations' }
      ]
    },
    highlights: ['Doctor schedule management', 'Java Swing desktop interface', 'Database-connected CRUD', 'Individual contribution identified'],
    overview: 'Healthcare System is a database-connected Java desktop application for healthcare administration. The confirmed scope of my contribution is its Doctor Schedule Management module.',
    problem: 'Doctor schedules require a persistent interface for creating and maintaining records.',
    solution: 'The doctor scheduling module connects Java Swing interactions to database-backed create, retrieve, update and delete operations.',
    features: [{ name: 'Doctor schedule CRUD', detail: 'The developer confirms that the module creates, retrieves, modifies and deletes doctor schedule records through a desktop interface.' }],
    decisions: [], principles: ['Event-driven desktop interaction', 'Persistent schedule records'],
    dataFlow: 'Scheduling action → Swing interface → database-connected CRUD operation → refreshed schedule record.',
    security: '', challenges: '',
    contribution: 'I contributed the Doctor Schedule Management module and its database-connected CRUD operations. Other team members’ responsibilities are not attributed to me.',
    coverImage: null, gallery: [], repositoryUrl: null, liveUrl: 'https://healthcare.didulanr12.workers.dev/',
    sourceNote: 'Developer-supplied details only; the supplied GitHub URL returned 404 at review time.'
  },
  {
    id: 'rawana-ceylon', number: '05', title: 'Rawana Ceylon', category: 'Web & Mobile', categoryLabel: 'Social / Full Stack',
    subtitle: 'A social network connected over REST',
    description: 'A React/Vite social client connected to a FastAPI backend for accounts, posts, stories and profile workflows.',
    technologies: ['JavaScript', 'React', 'Vite', 'Python', 'FastAPI', 'PostgreSQL', 'Cloudinary', 'Docker'],
    stack: { Languages: ['JavaScript', 'Python'], Frontend: ['React', 'Vite', 'React Router'], 'Backend & API': ['FastAPI', 'Pydantic', 'REST'], 'Data & media': ['Supabase PostgreSQL', 'Cloudinary'], Authentication: ['JWT'], Deployment: ['Docker configuration', 'Vercel frontend'] },
    architecture: {
      label: 'Three-tier architecture', subtitle: 'React × REST × FastAPI',
      summary: 'A React presentation tier calls FastAPI endpoints through a shared API client. Backend routers use service and repository modules for social data, while Supabase PostgreSQL stores records and Cloudinary handles media uploads.',
      nodes: [
        { name: 'React client', role: 'Renders feed, profile, stories and account screens.', receives: 'User input and API responses', connects: 'REST client' },
        { name: 'REST client', role: 'Builds requests and attaches the stored JWT.', receives: 'Frontend operations', connects: 'FastAPI routes' },
        { name: 'FastAPI routes', role: 'Validates payloads and requires an authenticated user for social endpoints.', receives: 'HTTP requests', connects: 'Services' },
        { name: 'Services', role: 'Coordinates social operations and media workflows.', receives: 'Validated requests', connects: 'Repositories / Cloudinary' },
        { name: 'Data & media', role: 'Persists accounts and social content; stores uploaded media.', receives: 'Database and upload operations', connects: 'Services' }
      ]
    },
    highlights: ['React–FastAPI REST integration', 'JWT-backed protected routes', 'Posts, likes, comments and stories', 'Explicit mock-data boundaries'],
    overview: 'Rawana Ceylon connects a React/Vite client to a FastAPI social backend. A shared frontend request helper attaches JWT credentials, while social routers cover profiles, posts, likes, comments, sharing and stories.',
    problem: 'A social interface must coordinate account access, content creation, feed interactions and media data across frontend and backend.',
    solution: 'The client calls REST endpoints through a central request helper; FastAPI routes delegate to service modules and persistent data operations.',
    features: [
      { name: 'Account access', detail: 'Signup/login endpoints return a JWT; AuthContext loads the profile and ProtectedRoute redirects users without a valid token.' },
      { name: 'Posts and feed', detail: 'The feed uses a backend GET endpoint. The composer sends media and text as multipart data; like, comment and share actions call API endpoints.' },
      { name: 'Stories and profile', detail: 'Story creation/viewing and profile editing/avatar upload are connected to backend routes.' },
      { name: 'Still in progress', detail: 'Explore reads local reel data, notification presentation is not fully wired, and settings toggles remain UI-only according to the repository README.' }
    ],
    decisions: ['Use one API client for the backend URL, token attachment and response handling.', 'Split backend responsibilities into router, service and repository modules.', 'Identify mock-backed screens rather than presenting them as backend-integrated.'],
    principles: ['Three-tier separation', 'API boundary', 'Modular social services'],
    dataFlow: 'User action → React component → API client with JWT → FastAPI router → social service/repository → Supabase database or Cloudinary → client response.',
    security: 'Social endpoints use an authentication dependency; the frontend stores a JWT and guards client routes. No compliance certification or broader security guarantee is implied.',
    challenges: 'Backend notifications return raw actor and post identifiers while the UI expects composed activity text. The README marks this integration unfinished.',
    contribution: 'The repository documents team/system behavior. Individual ownership of each social feature has not been supplied.',
    coverImage: null, gallery: [], repositoryUrl: 'https://github.com/Didula-NR10/socialmedia', liveUrl: 'https://rawanaceylon.didulanr12.workers.dev/',
    sourceNote: 'README, FastAPI routes, requirements and frontend API client checked against the public repository.'
  }
];

export const projectCategories = ['All Projects', 'Enterprise', 'Web & Mobile', 'Other'];
