# CONTEXT.md: Autonomous Obstacle-Avoiding Robot

> Paste this entire file at the start of every AI coding session (Claude or Codex).
> Fill in every `[BRACKET]` as soon as it is decided. Keep this file current.

---

## 1. Project Summary

We are building a small, round, Roomba-shaped robot that drives itself around a room and avoids obstacles without human control. It uses a Raspberry Pi as its brain, a USB webcam for vision, and cheap distance sensors as a safety layer.

- **Event:** Hackathon, **36-hour deadline**. Started: `10/23/2026 21:00:00`. Demo time: `[DATE/TIME]`.
- **Priority:** A reliable, working demo beats extra features. Never break the working version to add something new.
- **Project name:** `XTrain`
- **Team:** `Aiden Li Productions`

---

## 2. Hardware

| Part | Details |
|---|---|
| Computer | Raspberry Pi `[4 / 5]`, `[RAM]` GB, Raspberry Pi OS 64-bit (`[Bookworm]`) |
| Camera | Logitech USB webcam, model `[MODEL]`, appears as `/dev/video0` |
| Motor driver | `[L298N / TB6612FNG]` |
| Motors | 2x DC gear motors, `[VOLTAGE]` V, differential drive (left and right wheels) |
| Caster | 1 passive caster wheel (front or rear: `[WHICH]`) |
| Distance sensors | `[N]` x `[HC-SR04 ultrasonic / VL53L0X time-of-flight]` at `[front-left, front-center, front-right]` |
| Bumper (optional) | `[Yes/No]`, switch on GPIO `[PIN]` |
| Motor power | `[BATTERY TYPE, e.g. 4xAA, 2S LiPo]`, `[VOLTAGE]` V |
| Pi power | `[USB power bank, 5V 3A]` (separate from motor power; grounds are shared) |

**Chassis:** round, approx. `[DIAMETER]` cm. Shell: `[cardboard / acrylic / 3D print]`.

---

## 3. Pin Map (BCM numbering)

> Update this table whenever wiring changes. Never guess pins. Ask if a pin is missing.

### Motor driver
| Function | GPIO (BCM) |
|---|---|
| Left motor IN1 | `[GPIO]` |
| Left motor IN2 | `[GPIO]` |
| Left motor ENA (PWM) | `[GPIO]` |
| Right motor IN3 | `[GPIO]` |
| Right motor IN4 | `[GPIO]` |
| Right motor ENB (PWM) | `[GPIO]` |

### Distance sensors
| Sensor | TRIG / SDA | ECHO / SCL |
|---|---|---|
| Front-left | `[GPIO]` | `[GPIO]` |
| Front-center | `[GPIO]` | `[GPIO]` |
| Front-right | `[GPIO]` | `[GPIO]` |

> **Warning:** HC-SR04 ECHO pins output 5V. They need a voltage divider (e.g. 1k + 2k ohm) before reaching a 3.3V Pi GPIO pin. Wiring `[HAS / HAS NOT]` been done.

---

## 4. Software Environment

- **Language:** Python 3 (`[VERSION]`)
- **GPIO library:** `gpiozero` (backend `lgpio` on Pi 5). **Do NOT use `RPi.GPIO`**; it does not work on the Pi 5.
- **Vision:** OpenCV (`cv2`) and NumPy. No heavy frameworks unless discussed.
- **Optional AI models:** `[YOLO-nano / MobileNet / MiDaS-small / none yet]`, only if the core demo is already stable.
- **Dev setup:** `[VS Code Remote-SSH to Pi / editing locally and copying]`
- **Pi hostname / IP:** `[HOSTNAME or IP]`
- **Install baseline:**
  ```bash
  sudo apt update
  sudo apt install -y python3-opencv python3-gpiozero python3-lgpio git
  ```
- Use a virtual environment only if needed (`--system-site-packages` so `cv2` stays available).

---

## 5. Repository Structure

```
robot/
  CONTEXT.md     # this file
  drive.py       # Drive class: motor control
  sensors.py     # distance sensor reading
  vision.py      # camera capture + obstacle/free-space detection
  main.py        # main control loop (sense -> decide -> act)
  config.py      # all pins, speeds, thresholds (single source of truth)
  tests/         # small standalone scripts to test each piece
```

**File ownership:** `[drive.py/sensors.py: PERSON]`, `[vision.py: PERSON]`, `[main.py/config.py: PERSON]`. Only edit your own files without telling the owner.

---

## 6. Module Contracts (keep these interfaces stable)

### `drive.py`
```python
class Drive:
    def forward(self, speed: float = 0.6): ...   # speed 0.0 to 1.0
    def backward(self, speed: float = 0.5): ...
    def turn_left(self, speed: float = 0.5): ...   # spin in place
    def turn_right(self, speed: float = 0.5): ...  # spin in place
    def stop(self): ...
    def close(self): ...                           # release GPIO, stop motors
```

### `sensors.py`
```python
def read_distances() -> dict:
    # returns distances in cm, e.g. {"left": 42.0, "center": 18.5, "right": 60.3}
    # returns None for a sensor on timeout or error; callers must handle None
```

### `vision.py`
```python
def get_free_space(frame) -> dict:
    # returns {"left": float, "center": float, "right": float}
    # each value 0.0 to 1.0 = fraction of that region that looks like open floor
```

### `main.py`
Control loop: read sensors, read camera, decide, drive. Loop runs about 10 to 20 times per second.

---

## 7. Behavior Specification

**Decision priority (highest first):**
1. **Emergency stop:** any sensor under `[10]` cm, or bumper pressed: stop, back up briefly, then turn.
2. **Obstacle ahead:** center distance under `[25]` cm or center free-space under `[0.4]`: stop and turn toward the clearer side.
3. **Steer:** if one side is clearly more open, bias toward it while moving forward.
4. **Default:** drive forward at cruise speed `[0.5 to 0.6]`.

**Anti-stuck rules:**
- If it turns more than `[N]` times in a row without moving forward more than `[X]` seconds, back up and turn a random amount.
- Add a short pause (`~0.1 s`) after turns so sensor readings settle.

**Tunable values live in `config.py`**, never hard-coded in logic.

---

## 8. Coding Rules for the AI

1. **Simple over clever.** Short functions, clear names, comments explaining *why*. We debug at 3 a.m.
2. **Safety first:** every script that moves motors must wrap its loop in `try/finally` and call `drive.stop()` and `drive.close()` in `finally`. Handle `KeyboardInterrupt`.
3. **No blocking forever:** all sensor reads need timeouts.
4. **Handle failure:** camera may fail to open; sensors may return `None`. Code must degrade gracefully (e.g. fall back to sensors only).
5. **Do not change interfaces in Section 6** without being asked. If a change is needed, say so and explain.
6. **One small change at a time.** Do not rewrite whole files when asked for a fix. Show only what changed, or the full file if it is short.
7. **Print useful debug output** (distances, free-space values, chosen action) behind a `DEBUG` flag in `config.py`.
8. **No new dependencies** without asking and listing the install command for Raspberry Pi OS.
9. **Pi 5 awareness:** do not use `RPi.GPIO` or libraries known not to support the Pi 5.
10. **Performance:** keep camera resolution at `[320x240]` and avoid per-pixel Python loops; use NumPy/OpenCV operations.

---

## 9. Testing Protocol

- **Motors first with wheels off the ground.** Always lift the robot when testing new motion code.
- Test each module with a standalone script in `tests/` before integrating:
  1. `tests/test_drive.py`: spin each wheel forward and back
  2. `tests/test_sensors.py`: print distances live; wave a hand in front
  3. `tests/test_camera.py`: grab and save a frame; show free-space values
  4. `tests/test_vision.py`: run vision on saved images
- Test final behavior in a space similar to the demo area (same floor, same lighting).
- Keep a **known-good tagged version** in git (e.g. `git tag working-v1`) and update it after every successful milestone.

---

## 10. Known Pitfalls

- **Power:** motors drawing current can brown out the Pi. Keep motor power and Pi power separate, share ground.
- **Floor segmentation** breaks on shiny floors, shadows, and patterned carpet. Sample floor color from the bottom of the frame each run, and tune thresholds on site.
- **Ultrasonic sensors** miss soft or angled surfaces (couches, curtains). The camera helps cover this.
- **Single camera has no true depth.** Use the distance sensors for actual distances.
- **Pi 5 GPIO** requires `gpiozero` with `lgpio`.
- **Camera index** may change (`/dev/video0` vs `/dev/video1`). Make it a config value.

---

## 11. Current Status (update as you go)

- [ ] Parts gathered
- [ ] Pi flashed, SSH working, camera detected
- [ ] Chassis assembled and wired
- [ ] Motors working from Python
- [ ] Sensors reading correctly
- [ ] Reactive sensor-only avoidance working (**fallback demo**)
- [ ] Camera free-space detection working
- [ ] Sensors and camera combined in `main.py`
- [ ] Tested in demo-like environment
- [ ] Backup demo video recorded
- [ ] Pitch prepared

**Last known-good version:** `[git tag / commit hash]`
**Current problem we are working on:** `[DESCRIBE]`

---

## 12. How to Ask for Help (prompt template)

> I'm working on the robot described in CONTEXT.md. Today I'm working on `[FILE]`.
> **Goal:** `[what should happen]`
> **What I tried / current code:** `[paste code]`
> **What actually happens:** `[behavior or FULL error traceback]`
> Please give me the smallest change that fixes this and explain what it does.

---

## 13. Hackathon Priorities

1. Working fallback demo (sensor-only avoidance) by about hour 12
2. Camera enhancement layered on top, never replacing the fallback
3. Reliability testing in the demo space
4. Final 6 hours: **no new features**, only fixes, polish, video, and pitch

**Pitch angle:** "Autonomous navigation using on-board vision and multi-sensor fusion, running entirely on a Raspberry Pi."
