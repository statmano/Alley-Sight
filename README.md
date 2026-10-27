# Sightline

Sightline is a Three.js 10-pin bowling shot planner. Set a release board, breakpoint board and distance, then inspect the targeting angle and an adjustable, visual hook estimate on a 3D lane.

## Run locally

```sh
npm install
npm run dev
```

Create a production build with `npm run build`.

## Geometry and conventions

- The lane is 60 ft from the foul line to the head pin and 41.5 in wide, with 39 boards.
- Board numbering is shown as a right-handed bowler sees it facing the pins: board 1 is on the right and board 39 is on the left. Board 19 is immediately right of board 20.
- The targeting angle is the straight line from the release at the foul line to the entered breakpoint, measured from the direction of the lane. Positive angles point right.
- The post-break curve trends toward a nominal right-hander pocket at board 17.5. It is a visual estimate only and does not simulate ball physics, lane conditions, or equipment reaction.