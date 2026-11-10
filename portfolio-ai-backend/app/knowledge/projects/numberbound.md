# 1. NUMBERBOUND — 2D Cooperative Fantasy Platform Game

Confirmed offline systems; further phases and multiplayer require status verification.

### Project overview

A number-themed fantasy platform adventure set in Numeria. Four characters cooperate to traverse levels, stack on one another, solve environmental puzzles, collect ordinary digits, craft digit-shaped weapons, and ultimately recover nine distinct giant Core Numbers that drive story progression. Ordinary crafting digits and story Core Numbers are separate resources.

### Technology stack

Godot 4.7.2 Standard; C++17; GDExtension and godot-cpp; GDScript for selected AI/UI; SCons and MSVC; Godot 2D physics, rendering, animation, lighting and audio; Git. ENet networking is planned for later host-authoritative multiplayer. No initial backend/database.

### System architecture

Modular, component-oriented architecture with presentation, gameplay, game-state, networking, and engine integration layers. C++ components own core game rules; Godot scenes and Resources provide composition and data-driven configuration. PartyManager coordinates four characters; CharacterController focuses on movement/state coordination, while input, companion-follow, commands and stacking are separate responsibilities. Networking modules are designed for later authoritative validation.

### Core modules and capabilities

Party management, character switching, follower/HOLD commands, shoulder stacking, safe dismounting, cooperative pressure plates and gates, number pickups and shared inventory, crafting recipes and forging, health/attacks, enemy AI and defeat rewards, puzzle and level controllers. Seven planned digit weapons include FOURBLADE, Double Axe, TRI-FANG, Scythe, Stunner, Nunchucks and Single Axe.

### Data / interaction flow

Player input → active character movement/commands → party and cooperation systems → physics/puzzle interactions → pickups and shared inventory → recipe validation/forging → combat, enemies and level state. Multiplayer design adds validated host authority and synchronization only after the offline release.

### Engineering approach

Encapsulation, abstraction, inheritance/polymorphism where appropriate, all SOLID principles, composition over inheritance, DRY/KISS/YAGNI, RAII, explicit Godot object ownership and validated non-owning references, const correctness, STL, signals, state machines, data-driven Resources, automated regression tests, and multiplayer security planning.

### Role and contribution

Led the architecture-first design and iterative C++/Godot development; specified gameplay, component boundaries, cooperation, crafting recipes and testing strategy.

### Implementation / verification

Previously reported: offline Phase 3 integration regression 20/20; crafting Step 38 49/49 and Step 39 62/62; enemy defeat rewards 12/12; character recovery 22/22. Phase 4 was reported complete for offline scope. Do not infer later-phase completion from scheduled dates alone.

Source: developer-supplied project document. Implementation and verification status is recorded for this project; proposed features are not completed features.
