# 10. FlagGuessingApp — Android Educational Game

Technology and feature list discussed; source-level architecture not fully inspected.

### Project overview

Android flag-identification game with player login, scoring, country-capital lookup, surprise feature and scoreboard, using external country data.

### Technology stack

Android Studio; Java SDK; REST Countries API; Volley for HTTP requests; Picasso for images; SharedPreferences for local persistence.

### System architecture

Android activities/screens for gameplay and user experience, model/helper classes such as Country and ScoreManager, API client requests and local preference storage.

### Core modules and capabilities

Flag guessing, login, scores, capital finder, surprise feature, scoreboard, country data retrieval and image loading.

### Data / interaction flow

Gameplay screen requests country data → REST Countries API → Volley response parsing → Country model → Picasso flag image → answer evaluation → ScoreManager updates locally stored score.

### Engineering approach

Asynchronous networking, lightweight local persistence, helper-class separation, API error handling and UI state management.

### Role and contribution

Developed the Java Android application and its game features.

### Implementation / verification

Feature and library choices are known from project discussions; exact authentication mechanism and leaderboard synchronization are not established.

Source: developer-supplied project document. Implementation and verification status is recorded for this project; proposed features are not completed features.
