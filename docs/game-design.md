# Game design standard

Games should be compelling enough that players want another round. Build that pull from good play: responsive controls, clear feedback, skill to master, fair challenge, and quick retries. “Addictive” means satisfying and replayable, not pressuring players to stay.

## Long sessions and expansion

Design each game to sustain 15–30 minutes of active play for a skilled player. Short rounds are building blocks: connect them into an endless run, campaign, cup, or local match series with a visible next objective. A three-goal football match alone does not meet this requirement.

Introduce several changes across a session: new obstacle combinations, opponents with different behavior, stage layouts, environmental effects, bosses, or tactical boosts. Give players choices that change how they play. Longer health bars, arbitrary waiting, and the same opening repeated faster do not provide enough variety.

Keep stage patterns, opponent profiles, boosts, and progression rules in game-owned modules or data so later additions can extend the game without changing portal architecture. Choose content that combines in interesting ways; avoid adding several versions of the same mechanic.

Persist campaigns and unlocked progress on the device. Let players resume after leaving. Make the current objective, next stage, available boosts, and reason for a loss visible inside the game. Round results should lead directly to the next challenge; final results should make retrying one action, support Space/Enter, and save scores automatically.

## Every game should

- Make the first move obvious and get players into play quickly.
- Make controls responsive and acknowledge important actions immediately with animation, sound, or a clear change in the game state.
- Give players meaningful control over outcomes and show their aim before they commit.
- Give players room to improve through timing, aim, planning, or mastery of the rules.
- Keep challenge fair, then add variety or difficulty as skill grows.
- Make a loss understandable and a rematch easy to start.
- Let players stop without losing progress to a streak, countdown, or artificial scarcity.
- Use boosts to add short tactical choices; show how to earn them and what they change.

Brick Breaker rotates wall layouts without a time limit. Paddle edges and movement steer returns. Broken bricks charge a three-second laser burst; the final four bricks refill it to prevent tedious cleanup. Wide-paddle, slow-ball, and fireball drops add tactical choices. Every third wave restores a life, up to five.

Paddle Duel plays to seven with a two-point lead. Paddle movement adds spin; passing through an orb awards its boost to the last hitter. Rally speed rises with successful returns. Match results show the longest rally and retain the local series tally for rematches.

Neon Snake buffers two valid turns and interpolates movement. Golden fruit is an optional eight-second target alongside normal fruit. Boosting doubles fruit points, and the streak window accounts for travel distance. Filling the board is a win.

Rooftop Runner uses authored pattern pools with an introductory, intermediate, and precision stage. Later sections combine tall stacks, paired jumps, short-hop-to-slide transitions, and roof gaps. Holding jump controls height; sliding during descent makes a fast landing. Coins and clean passes charge a short dash. Difficulty comes from readable timing choices and combinations, with bounded speed and tested landing windows.

Star Patrol fires automatically so movement and positioning stay central. A charged pulse clears bullets and damages nearby divers. Waves introduce armor, telegraphed diving attacks, and bosses every fourth wave with a second attack phase. Shield and rapid-fire pickups provide recovery tools.

Soccer Duel defaults to an arcade run through five opponent styles and changing arenas. Wins earn points, streak bonuses, and a cup every five victories; the run ends after three match losses. Matches target five goals, rising to seven after five wins. Save each goal and completed round locally and resume unfinished matches at kickoff. Keep quick matches and local multiplayer available. Ground contact supports dribbling; lob, low aim, and charge control shots independently of jumping. Goals require the whole ball to cross the mouth below a solid crossbar. Keep the score visible inside the pitch.

Menus, nicknames, records, and setup belong inside each game's screen. Use a large play area with optional fullscreen. Canvas buffers must follow displayed dimensions and device pixel ratio while physics stays in logical coordinates. Pause on lost focus, clear held inputs, save results automatically, and support a single-action retry. Optional sound starts muted; respect reduced motion.

Games are for fun and should work without an account. Do not use forced ads, paid power, or pressure loops to manufacture repeat play. Keep ads outside active play.

## Review questions

Before adding a game, check:

1. Does the first minute feel good without a tutorial?
2. Can a player explain why they won or lost?
3. Does practice make a noticeable difference?
4. Is there a quick, satisfying reason to replay?
5. Can someone leave at any point without punishment?
6. What changes after five, fifteen, and thirty minutes of skilled play?
7. Do short matches form a longer run or series with a meaningful next objective?
8. Can another stage, opponent, or boost be added inside the game module?
9. Have later stages and repeated restarts been exercised, including persistent progress and held inputs?

## Expanded arcade catalog

- **Asteroid Drift** links five sector profiles with ship upgrades, splitting rocks, saucers, dash fuel, and recharging shields. Offer direct steering and classic inertia. Persist the active sector and ship build.
- **Maze Chase** changes connected district layouts and enemy pursuit behavior. Buffered turns, mid-edge reversals, power orbs, fruit, and earned dashes give players several escape tools.
- **Block Cascade** combines seven-bag pieces, hold, previews, ghost placement, wall kicks, bounded lock resets, combo scoring, and earned board rescues. Gravity rises to a bounded limit. Preserve the board, active piece, queue, hold eligibility, and current goals.
- **River Crossing** links sets of five distinct homes into a journey. Later banks add turtle warnings, submerging platforms, faster currents, and route choices. Earn rewinds at safe banks.
- **Blast Arena** uses destructible layouts, forecast-aware bots, chain explosions, and range/capacity/speed pickups. Solo stages link through upgrades; local two-player play forms a first-to-three series. Keep explosion propagation consistent when several crates break together.
- **Bubble Tower** combines four authored platform rooms and their mirrored versions with walkers, hoppers, fliers, capture chains, escaping bubbles, and optional air currents. Cooperative players share lives and progression.
- **Barrel Ascent** changes ladder routes, barrel drop behavior, required bolts, and moving lifts. Hammers create a temporary aggressive route through hazards. Persist collected objectives.
- **Formation Rescue** combines diving formations, telegraphed tractor beams, recoverable captured pilots, dual fire, and non-combat flight challenges every fourth wave. Upgrade fire cadence or evasive rolls between waves.
- **Coastal Rush** starts with visible traffic and links timed checkpoint gates into touring legs. Holding Space while cornering charges a drift; releasing banks points and nitro. Slipstream behind traffic, chain close passes up to ×5, and spend nitro to beat gates. Choose palm roads, tighter mountain passes, or dense night traffic. Save position, speed, traffic, body condition, and the current gate so resuming does not restart a deadline from a standstill.
- **Iron Front** changes platform terrain across missions, introduces rapid/spread weapons and rescuable supply engineers, and puts the player in a rover every third mission. Enemy warnings, directional aim, crouching, arcing grenades, and siege attack phases provide tactical options. Save mission checkpoints, defeated enemies, boss damage, and collected supplies.

## Visual clarity

Give each game recognizable scenery and detailed silhouettes appropriate to its viewpoint. Use depth, material highlights, contact shadows, animation, and restrained effects to explain movement and impacts. Keep hazards and collision boundaries legible. Background detail must remain quieter than active objects; do not draw decorative barriers that imply nonexistent collisions. Keep important effects readable with reduced motion enabled. Avoid stretching a low-resolution canvas or loading remote assets during play.
