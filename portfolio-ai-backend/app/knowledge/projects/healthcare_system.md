# 6. Healthcare Management System

Confirmed academic Java Swing contribution; broader modules require verification.

### Project overview

Desktop healthcare management application supporting administrative workflows. A specifically discussed responsibility was doctor schedule management with database-connected create, read, update and delete operations.

### Technology stack

Java; Java Swing GUI; relational database via application database connectivity (specific DBMS/schema not confirmed).

### System architecture

Desktop presentation layer with Swing forms and event handlers, scheduling/business logic and persistence operations. Scheduling responsibilities should be separated from UI controls and database access.

### Core modules and capabilities

Doctor schedules, availability records and CRUD operations; other healthcare modules belong to the wider team project but are not fully documented here.

### Data / interaction flow

Administrator enters/edits doctor availability → input and schedule validation → database insert/update/delete → refreshed schedule display.

### Engineering approach

OOP, validation, separation of concerns, parameterized SQL, error handling and consistent schedule updates.

### Role and contribution

Owned the doctor scheduling functionality in a team-developed Java Swing healthcare project.

### Implementation / verification

Doctor-schedule CRUD and database integration are discussed; exact schema, concurrency rules and remaining modules need source verification.

Source: developer-supplied project document. Implementation and verification status is recorded for this project; proposed features are not completed features.
