# X-Ray Vision

Ever wanted to see through things like a superhero? Well, this doesn't *actually* do that — but it looks pretty sick.

This is a real-time webcam app that turns your camera feed into an X-ray-style visualization. Just raise both hands in front of the camera, and a scan zone appears between them. Inside that zone, you get a full-on sci-fi X-ray effect with skeleton tracking, face mesh contours, glowing particles, and animated scan lines.

Built this for fun because I thought it'd be cool to mess around with body tracking and canvas effects. Turns out, it is.

## What it does

- Tracks your **face**, **hands**, and **body** in real time using MediaPipe
- When you raise both hands, a **scan rectangle** forms between them
- Inside the rectangle, you see an **X-ray effect** — dark background, glowing edges, skeleton overlay, ripple circles, and a moving scan line
- **Particles** fly around your face and body landmarks
- HUD overlay shows tracking status, FPS, and scan state
- Screenshot button (or hit **Space**) to capture the moment
- **F** for fullscreen

## Tech used

- **Next.js 16** — because why not use the latest
- **React 19** — for the UI layer
- **MediaPipe Tasks Vision** — does all the heavy lifting for face, hand, and pose detection
- **Canvas 2D** — all the visual effects are hand-drawn on canvas, no WebGL needed
- **TypeScript** — keeps things sane

## Try it out

**Live demo:** [x-ray-vision.vercel.app](https://x-ray-vision.vercel.app)

You'll need to allow camera access. Works best on Chrome/Edge on desktop.

## Run it locally

```bash
git clone https://github.com/chowhandutta2004-lgtm/x-ray-vision.git
cd x-ray-vision
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## How it works (the nerdy bits)

The app loads three MediaPipe models — face landmarker (468 points), hand landmarker (21 points per hand), and pose landmarker (33 points). To keep things smooth, hands are tracked every frame (since they control the scan rectangle), while face and pose alternate every other frame.

When both hands are detected, a rectangle is computed from the middle finger tips (top corners) and wrists (bottom corners). Everything inside that rectangle gets the X-ray treatment — grayscale + edge detection + color grading + skeleton overlay + particles.

The particle system uses an object pool of 2000 particles that spawn on face and body landmarks. No allocations during runtime, so it stays smooth.

## Demo

https://github.com/chowhandutta2004-lgtm/x-ray-vision/raw/master/x-ray-demo.mp4

> Hit **Space** while scanning to capture your own X-ray screenshots!

---

Made by [@chowhandutta2004-lgtm](https://github.com/chowhandutta2004-lgtm)
