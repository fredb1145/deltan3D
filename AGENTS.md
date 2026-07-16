# AGENTS.md

## Project
Deltan3D

Deltan3D is a production SaaS 3D virtual tour platform built with Expo, React Native, Expo Router, React Three Fiber, and Three.js.

This is a real product.
It is not a demo, prototype, experiment, tutorial build, or temporary implementation.

All work must be production-ready, scalable, stable, maintainable, and directly usable in the real app.

---

## Core Product Vision

Deltan3D is a Zillow-style + Cupix-style platform with:

- 360 virtual tours
- Scene-to-scene walkthrough navigation
- Directional movement arrows
- Smooth transitions
- Hotspots
- Tour builder
- Floor plan support
- Measurement tools
- Panorama capture inside the app
- Upload support for valid panoramas
- Device-aware feature gating
- LiDAR-enabled capabilities active now
- Full frontend admin system
- Full subscription and plan control from the frontend
- Role-based admin access from the frontend

The product must support both LiDAR and non-LiDAR devices from the beginning.

---

## Stack Rules

### Frontend
- Expo
- React Native
- Expo Router
- React Three Fiber (`@react-three/fiber`)
- Three.js

### Backend
- Supabase for authentication, database, and storage

### General Rule
Do not change the core stack unless explicitly instructed by the user.

---

## Absolute Technical Rules

### 1. Never use expo-three
Do not use `expo-three`.

Always use:
- React Three Fiber
- Three.js
- `useLoader` from React Three Fiber
- `TextureLoader` from Three.js where appropriate

### 2. No WebView panorama systems
Do not use:
- Pannellum
- PhotoSphereViewer
- WebView-based panorama viewers
- iframe-based panorama systems

The panorama viewer must be native and built with React Three Fiber and Three.js.

### 3. Production only
Do not output:
- demo code
- pseudo-code
- placeholder logic
- mock implementations pretending to be real
- tutorial-style stubs

Everything must be real app code.

### 4. Full file outputs only
When making changes:
- always return full files
- always include exact file paths
- never return partial snippets unless explicitly requested

### 5. No technical backend language in UI
Never expose technical terms to users in the UI.

Do not show words like:
- Supabase
- database
- storage
- bucket
- JSON
- schema
- record
- RLS
- payload
- table

Use user-facing language such as:
- Tours
- Scenes
- 360 photos
- Create tour
- Open tour
- Add scene
- Connect scenes
- Plans
- Members
- Admins

### 6. Do not break working systems
Preserve compatibility with:
- auth flow
- routing
- viewer flow
- uploads
- existing tours
- existing scene relationships
- admin access logic

### 7. Mobile and web parity matter
Prefer solutions that work across:
- iOS
- Android
- web

If something must be platform-specific, isolate it cleanly.

### 8. Clean code only
Code must be:
- stable
- maintainable
- readable
- production-safe
- typed properly when TypeScript is used
- free from unnecessary dead code

---

## Viewer System Standards

The 360 viewer is a core product feature and must be implemented carefully.

Requirements:
- render valid user panoramas correctly
- use an inverted sphere
- support smooth look-around interaction
- work on real devices
- handle texture loading safely
- fail gracefully for invalid inputs
- support future overlays such as arrows, hotspots, and measurements
- remain stable across iOS, Android, and web where applicable

Do not ship fragile viewer logic.

---

## Panorama Rules

All panoramas used by the platform must be treated as real equirectangular 360 images.

Requirements:
- expected format is equirectangular
- expected aspect ratio is approximately 2:1
- invalid images must be rejected gracefully
- user-facing messages must be clear and non-technical
- invalid panorama files must not be silently allowed into the viewer

---

## Panorama Sources

The platform must support both:

1. Uploaded panoramas
2. In-app panorama capture

Both must feed into the same scene creation and tour builder flow.

---

## Panorama Capture System

### General
The app must support capturing panoramas inside the mobile app where feasible.

Captured panoramas must be validated before being accepted into the system.

### iOS
- Support guided panorama capture flow
- Ensure final output is valid for the viewer
- If conversion or validation is needed, it must happen safely and reliably

### Android
- Support panorama capture where device capability allows
- If capture is inconsistent on a device, provide a clean fallback path to upload or alternate capture flow
- Do not pretend unsupported devices can do something they cannot do

### Capture Integration
Captured panoramas must flow directly into:
- scene creation
- tour builder
- preview flow

The user should not be forced through technical steps.

---

## LiDAR and Non-LiDAR Architecture (MANDATORY NOW)

LiDAR is not a future feature.

LiDAR must be treated as an active, first-class system now.

The user has a LiDAR-capable test device available when needed.
The architecture must actively support LiDAR right now, while still working correctly on non-LiDAR devices.

Both modes must exist from the beginning.

---

## Device Capability Detection

The app must detect device capabilities at runtime.

This includes:
- LiDAR availability
- camera capabilities
- feature support relevant to panorama capture and spatial tools

This detection must:
- run reliably
- not rely on guesses
- be used immediately to control feature access and UI visibility

Do not assume all devices have LiDAR.
Do not assume all devices support the same camera behavior.

---

## Dual Mode Feature System

### Non-LiDAR Mode
Non-LiDAR devices must still support:
- 360 viewing
- scene-to-scene navigation
- hotspots
- tour builder
- floor plans
- approximate measurements where applicable
- node-based movement and directional navigation

### LiDAR Mode (ACTIVE NOW)
LiDAR-enabled devices must support:
- all standard features
- advanced measurement architecture
- spatial metadata support
- structure for real-world scaling
- structure for improved alignment
- structure for object anchoring and richer spatial extensions

LiDAR must not be treated as an optional later enhancement.
It is a current architecture requirement.

---

## Shared Viewer Architecture

There must be one core viewer system.

Do not create:
- a separate LiDAR viewer
- a separate non-LiDAR viewer

Instead:
- keep one viewer
- enable or disable capabilities based on device support
- keep rendering architecture unified

---

## Measurement Architecture

### Non-LiDAR
- measurements must be approximate only
- approximate results must not be presented as perfectly accurate
- UX must remain clean and clear

### LiDAR
- architecture must support real spatial measurement behavior
- system must be structured for more accurate depth-aware measurement workflows
- do not fake LiDAR precision on unsupported devices

The measurement system must clearly separate approximate mode from LiDAR-capable mode internally.

---

## Scene Data Structure Requirements

Scene data must support both current and advanced capability paths.

Each scene should be structured to allow:
- linking to other scenes
- directional navigation
- hotspot placement
- optional floor plan linkage
- optional measurement anchors
- optional spatial metadata for LiDAR-capable workflows
- future coordinates / anchors / depth-related values where needed

Do not hard-code scene data in a way that blocks LiDAR-enabled features.

---

## Navigation System Standards

### Non-LiDAR
- node-based movement
- scene-to-scene stepping
- directional arrows
- smooth transitions

### LiDAR
- must remain compatible with richer spatial extensions
- do not lock the system into brittle navigation assumptions that require a rewrite later

Navigation must feel consistent and premium.

---

## Tour Builder Standards

The tour builder must support:
- creating tours
- adding scenes
- uploading panoramas
- capturing panoramas in-app where supported
- labeling scenes
- connecting scenes
- choosing navigation relationships
- saving scene relationships
- reloading tours reliably
- future support for floor plan linkage
- future support for measurement anchors and richer metadata

The structure must remain compatible with Cupix-style movement logic.

---

## Floor Plan Standards

The platform must support floor plan workflows as part of the accepted scope.

Requirements:
- floor plan support must coexist with tours
- scenes can be linked to floor plan context where needed
- implementation must not break viewer flow
- floor plan support should be structured cleanly for future extension

---

## UI / UX Standards

### Locked colors
Use these locked visual colors unless the user explicitly changes branding:

- Background: `#0D0407`
- Surface/Card: `#1A0509`
- Accent: `#C9A84C`

### UX expectations
The app must feel:
- premium
- clean
- direct
- non-technical
- scalable
- user-facing

Do not expose internal implementation details in the UI.

---

## Frontend Admin System (MANDATORY)

The platform must have a full frontend admin system.

The user wants frontend admin control, not dependence on a hidden backend dashboard for normal operations.

All important operational control should be manageable from the frontend admin experience.

---

## Super Admin Requirements

There must be a true Super Admin role.

The owner's account must have full frontend control over the platform.

The Super Admin must be able to do all major business and system operations from the frontend.

This includes full control over:

### User Management
- view users
- search users
- filter users
- inspect user status
- edit user-related administrative details where appropriate
- activate, suspend, or restrict users where applicable

### Subscription and Plan Management
- create new subscription plans
- edit existing subscription plans
- activate or deactivate plans
- archive plans where appropriate
- define plan names
- define plan pricing
- define billing intervals
- define plan feature lists
- define plan limits
- define plan visibility
- define which plan is recommended or featured
- adjust plan benefits without rebuilding the system
- manage users attached to plans
- inspect subscription status by user
- view plan adoption and related admin insights

### Admin Management
- create new admins from the frontend
- assign roles
- assign permission scopes
- edit existing admin permissions
- deactivate or revoke admin access
- generate or manage secure admin onboarding flows
- manage access codes or secure invite flows if used

### Analytics Management
- view analytics overview
- view usage trends
- view user growth
- view plan/subscription trends
- view tour activity metrics where implemented
- view platform performance metrics where implemented

### Platform Control
- access full frontend admin dashboard
- access system-wide operational controls exposed in the frontend
- manage visibility of major admin modules
- retain override authority over all limited admins

The Super Admin must be the only unrestricted role unless the user explicitly creates another full-access admin.

---

## Limited Admin System

The system must support creation of additional admins with restricted permissions.

These admins must be created and managed from the frontend by the Super Admin.

The system must support role-based or permission-based access.

It must be possible to create admins such as:

### User Admin
Can access only user-related tools, such as:
- viewing users
- searching users
- filtering users
- limited user management actions

Cannot access:
- analytics
- plan configuration
- global settings unless specifically granted

### Subscription Admin
Can access only subscription-related tools, such as:
- viewing plans
- viewing subscriptions
- editing subscription states if permitted
- managing plan-related user assignments if permitted

Cannot access:
- analytics unless specifically granted
- unrestricted user controls unless specifically granted
- full system settings

### Analytics Admin
Can access only analytics-related tools, such as:
- viewing analytics dashboards
- reading usage data
- reading growth and subscription performance summaries

Cannot access:
- user management actions
- plan editing
- admin creation
- system-wide configuration

### Custom Limited Admin
The system must support creating admins with custom permission combinations, such as:
- users only
- users + subscriptions
- subscriptions only
- analytics only
- analytics + subscriptions
- any allowed combination determined by the Super Admin

---

## Permission System Requirements

Permissions must be:
- explicit
- enforceable
- cleanly structured
- respected in both UI and logic

If an admin does not have access to a section:
- they must not see it in navigation
- they must not access it through direct routing
- they must not be able to trigger its actions through hidden UI or route guessing

Both frontend visibility and action-level authorization must be respected.

---

## Admin Creation and Security

Super Admin must be able to create admins from the frontend through a secure flow.

The system may use:
- secure invites
- protected admin onboarding
- access codes
- role assignment during admin creation
- permission assignment during admin creation

Security expectations:
- no insecure shortcut creation flows
- no accidental exposure of admin creation to standard users
- no admin privilege escalation through UI mistakes

---

## Frontend Admin Dashboard Requirements

The frontend admin system should be structured to include modules such as:

- user management
- plan and subscription management
- analytics
- admin management
- operational overview
- platform summaries
- role-based module access

Super Admin sees everything.
Limited admins see only permitted modules.

The frontend admin experience must feel like a real operational control center, not a hacked-on side page.

---

## Subscription Plan Management Requirements

Subscription plans are a first-class business system.

The architecture must support plan management from the frontend admin area.

Plan management must include support for:
- creating plans
- editing plans
- changing price
- changing billing interval
- changing included limits
- changing included features
- activating or deactivating plans
- marking plans as visible or hidden
- identifying recommended plans
- preserving existing plan relationships safely when editing

Plan management must be built in a way that avoids brittle hard-coded plan definitions.

The system must support future growth in the number and type of plans.

---

## Analytics Standards

Analytics are part of the accepted scope.

Analytics architecture should be structured to support:
- user activity insights
- plan/subscription insights
- tour activity insights
- operational summaries

Analytics access must respect admin permissions.

---

## File Output Rules

When modifying files:
1. always show exact file paths
2. always return full updated files
3. if multiple files are changed, return all changed files completely
4. never omit imports
5. never say “unchanged parts omitted”
6. do not return partial diffs unless explicitly requested

Preferred format:

components/PanoramaViewer.tsx
[full file code]

app/protected/viewer.tsx
[full file code]

---

## Behavior Rules for Codex

When assigned a task:

1. read the existing code structure first
2. identify affected files
3. preserve working functionality
4. implement the real solution
5. return complete updated files only
6. keep explanations minimal unless explicitly asked

If a task is large, still act decisively.
Do not retreat into vague planning when implementation is possible.

---

## What To Avoid

Do not:
- add unnecessary dependencies
- switch stacks casually
- introduce WebView panorama tools
- use expo-three
- downgrade architecture quality for convenience
- expose backend language in the UI
- return prototype-grade code
- build non-LiDAR-only systems
- treat LiDAR as later work
- create fragile admin access patterns
- hard-code subscription plans in brittle ways
- return fragmented split edits when full files are expected

---

## Current Priorities

Current development priorities generally follow this order unless explicitly changed:

1. stable auth and app structure
2. stable panorama upload and rendering pipeline
3. stable viewer architecture in React Three Fiber
4. scene system and scene relationships
5. Cupix-style directional navigation
6. tour builder completion
7. frontend admin system
8. subscription and plan management
9. LiDAR-capable architecture and device-aware feature handling
10. analytics
11. floor plan support
12. performance optimization
13. deployment readiness

---

## Final Rule

This repository must move forward as a real production SaaS product.

Every decision must protect:
- stability
- scalability
- premium UX
- unified viewer integrity
- LiDAR as an active system now
- non-LiDAR fallback quality
- frontend admin control
- role-based access safety
- subscription plan flexibility
- full-app integrity

---

# Deltan3D Motion & Interaction Enhancement (Cross-Platform - No Redesign)

You are working on an existing production codebase for Deltan3D.

This is **NOT** a redesign project.

The application's layouts, navigation, branding, color palette, features, workflows, and business logic have already been established and must remain intact.

Your task is to elevate the application's interaction quality to a world-class level while preserving the existing design.

## Non-Negotiable Rules

* Do NOT redesign screens.
* Do NOT change layouts.
* Do NOT move existing UI elements.
* Do NOT change branding or colors.
* Do NOT alter business logic.
* Do NOT modify existing user flows.
* Existing functionality must continue working exactly as it does today.

The goal is to improve the **experience layer only**.

---

# Cross-Platform Native Experience

Deltan3D must feel like a premium native application on both iOS and Android.

The experience should respect each platform's interaction conventions while maintaining one consistent Deltan3D identity.

Do not force iOS behaviour onto Android or Android behaviour onto iOS where platform-specific behaviour is expected.

Instead, create a unified motion system that feels natural on both platforms.

---

# Motion System

Create a reusable application-wide motion system.

Implement:

* Natural spring physics
* Proper damping
* Momentum
* Velocity-aware animations
* Smooth easing curves
* Interruptible animations
* Responsive micro-interactions
* Consistent animation timing
* Fluid state transitions
* High-performance GPU-accelerated animations wherever supported

Animations should never feel artificial, slow or excessive.

Every movement should feel intentional, smooth and premium.

---

# Typography

Use the appropriate native system fonts.

* iOS: SF Pro
* Android: Roboto or the platform's current native system font
* Web: high-quality fallbacks

Maintain the existing typography hierarchy while improving spacing, weights and readability.

---

# Navigation

Improve navigation transitions throughout the application.

Examples include:

* Screen push/pop
* Screen presentation
* Screen dismissal
* Shared element transitions where appropriate
* Interactive navigation gestures

Navigation should feel fluid without changing the application's navigation structure.

---

# Buttons

Upgrade every button interaction.

Include:

* Press feedback
* Release feedback
* Scale animations
* Spring animations
* Loading transitions
* Disabled state transitions
* Ripple effects where appropriate for Android
* Native-feeling touch response for iOS

Buttons should feel responsive and tactile.

---

# Cards

Improve every card interaction.

Include:

* Hover effects on desktop/web
* Press animations
* Elevation transitions
* Shadow interpolation
* Smooth expansion
* Consistent corner radius

Do not redesign the cards.

---

# Scrolling

Improve scrolling throughout the application.

Implement:

* Smooth momentum
* Natural deceleration
* Better inertia
* Fluid nested scrolling
* Smooth content appearance

Scrolling should feel responsive on both Android and iOS.

---

# Bottom Sheets, Modals & Dialogs

Upgrade all overlays.

Include:

* Native-feeling presentation
* Interactive dismissal
* Spring-based movement
* Background dimming
* Blur where appropriate
* Smooth settling animations

Do not change their purpose or placement.

---

# Gestures

Improve gesture responsiveness.

Support:

* Swipe
* Drag
* Pinch
* Long press
* Double tap
* Interactive dismiss gestures

Gestures should feel responsive and predictable.

---

# Loading Experience

Improve all loading states.

Include:

* Skeleton loaders
* Animated placeholders
* Progressive loading
* Smooth fade-ins
* Elegant transitions between loading and loaded content

Avoid abrupt UI changes.

---

# Blur & Glass Effects

Use blur and glass effects sparingly.

Apply only where they enhance usability, such as:

* Floating controls
* Navigation overlays
* Bottom sheets
* Modal backgrounds

Avoid unnecessary visual effects.

---

# Haptic Feedback

Use native haptic feedback where supported.

Provide subtle feedback for:

* Button presses
* Successful actions
* Errors
* Warnings
* Selection changes
* Drag interactions
* Toggle changes

Do not overuse haptics.

---

# Shadows, Corners & Spacing

Standardize:

* Corner radii
* Elevation
* Shadows
* Internal spacing
* External spacing
* Margins
* Padding

Improve consistency without redesigning the interface.

---

# Existing Components

Apply these improvements to every existing screen and component, including:

* Authentication
* Dashboard
* Tour viewer
* Tour editor
* Property pages
* Forms
* Lists
* Search
* Menus
* Navigation
* Modals
* Buttons
* Cards

Then ensure all future components automatically inherit the same motion and interaction system.

---

# Architecture

Create reusable motion primitives, animation utilities, interaction hooks and shared UI behaviours.

Avoid one-off animations.

Every new feature should automatically use the same motion system.

---

# Performance

Maintain excellent performance across all supported devices.

Animations should remain smooth and responsive.

Avoid unnecessary re-renders, layout thrashing and animation jank.

---

# Final Goal

The finished application should **look like the same Deltan3D it is today**, but feel dramatically more polished.

Users should notice smoother interactions, richer feedback, premium motion, better responsiveness and a more refined native experience across both iOS and Android, without feeling that the application has been redesigned.
