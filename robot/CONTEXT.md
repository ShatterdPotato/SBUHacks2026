# XTrain robot context

**Read `../TEAM_CONTEXT.md` first. Orchestrator: `aiden.sol`.**
This file covers the onboard hardware subsystem of the delivery rover. It is not a
standalone specification for a room-roaming robot. In MCP sessions, obtain both
context files through `get_context` and acknowledge the combined revision before
using operational tools.

## Mission and boundaries

Transport a small payload between selected stations on a rehearsed route, with an
approximately 100 m target and at least 50 m indoor fallback. The Pi captures camera
and sensor data, executes bounded motion commands, and stops independently of the
desktop or LLM. The desktop/website integration is defined in `TEAM_CONTEXT.md`.

The recorded hackathon start is 2026-10-23 21:00 America/New_York. Confirm the actual
submission and presentation times. Project: XTrain. Team: Aiden Li Productions.
Prefer reliable integration and a rehearsed delivery over additional features.

## Hardware inventory

| Part | Latest reported details | Still to confirm |
|---|---|---|
| Pi | Raspberry Pi 4B | RAM, OS image/version, power requirements |
| Camera | Logitech USB webcam | Model, device index, modes |
| Distance sensors | 3 Grove Ultrasonic Distance Sensors, front-left/center/right | Exact SKU/revision, electrical interface, voltage levels |
| Motor driver | Not selected in the cloud context | Actual model and pin/control scheme |
| Drive | Planned two DC gear motors and passive caster | Voltage, current, gearing, wheels, placement |
| Chassis | Cardboard, optional 3D printing | Dimensions, payload retention, mounting |
| MPU6050 | Previously mentioned by team | Availability, interface, intended use |
| Power | Motor and Pi supplies to be documented | Battery/regulator ratings, common-ground wiring |
| Bumper/rear sensing | Not confirmed | Recovery clearance and stop implementation |

Do not copy HC-SR04 trigger/echo wiring onto the Grove sensors by assumption.
Verify the exact sensor's manufacturer documentation and actual board before
choosing pins, drivers, or level shifting. The previous HC-SR04-specific warning
was a template, not verified wiring for this inventory. Do not assume the previous
L298N-style ENA/ENB template applies to whichever motor driver is supplied.

## Pin and power map: fill from verified wiring

| Signal | Actual part/connector | BCM pin or bus | Voltage/interface verified by |
|---|---|---|---|
| Left motor control | TBD | TBD | TBD |
| Right motor control | TBD | TBD | TBD |
| Front-left distance | Grove model TBD | TBD | TBD |
| Front-center distance | Grove model TBD | TBD | TBD |
| Front-right distance | Grove model TBD | TBD | TBD |
| Stop/bumper | TBD | TBD | TBD |
| MPU6050 if used | TBD | TBD | TBD |

Never guess a GPIO assignment. Do not power motors from GPIO. Verify driver and
power ratings, grounding, and logic compatibility before applying power.

## Software and module ownership

- Python 3, version TBD, on verified Raspberry Pi OS.
- Choose a GPIO library supported by the actual Pi/OS combination; Pi 5-specific
  template instructions are not requirements for the currently reported Pi 4B.
- OpenCV/NumPy are candidates for capture and lightweight preprocessing.
- YOLO inference is planned on the RTX 4060 desktop; measure before changing this.
- Camera settings, pins, thresholds, and bounded command values belong in config.
- Embedded owner: `hardware.embedded`, coordinated with `hardware.mechanical`.
- AI/backend interface changes go through `aiden.sol` and `fullstack`.

Current files are placeholders, not implementations:

```text
robot/
  CONTEXT.md
  drive.py       # motor driver adapter
  sensors.py     # actual Grove sensor driver, bounded reads and health
  vision.py      # camera capture/preprocessing and stream integration
  main.py        # local controller, watchdog, stop policy
  config.py      # planned; not yet created
  tests/         # planned hardware bring-up scripts
```

## Interfaces: agree before implementing

Keep `Drive.forward`, `backward`, `turn_left`, `turn_right`, `stop`, and `close` as
candidate primitive operations. Their 0-1 arguments are duty-cycle requests, not
physical velocities. Calibrate actual travel and turning behavior under load.

Distance readings should identify the sensor and units (cm), timestamp, and health;
a timeout/error is unavailable data, not zero distance or guaranteed clearance.
Camera frames need timestamps so the backend can reject stale perception.

Pi/backend commands need job ID, sequence number, bounded command, and expiration.
Reject stale or out-of-order commands. The local watchdog stops movement when the
control link is lost or commands expire. Agree on encoding, transport, timing,
video delivery, and telemetry schemas with the fullstack owner before coding.

## Navigation and stopping behavior

Obstacle avoidance is one layer of destination-directed navigation. It cannot
replace route progress or arrival verification. The route/checkpoint method is
still to be selected; do not promise unrestricted campus navigation.

Priority order:

1. Emergency stop: hold stopped until an explicit permitted reset.
2. Required sensor fault, lost route, lost link, or expired command: stop and report.
3. Obstacle: stop; report BLOCKED; resume only under the agreed recovery policy.
4. Valid route-following request: execute within local motion and clearance bounds.
5. Arrival: stop at the verified destination and report evidence to the backend.

Do not automatically reverse after an emergency stop. Reversing or turning for
recovery requires verified clearance and a bounded maneuver. The three reported
front sensors do not establish rear clearance. Avoid random roaming as a delivery
fallback; keep it, if useful, as an explicitly isolated component demonstration.

An LLM response may request high-level actions but cannot bypass stopping logic.
Camera-only floor appearance is not proof of clearance; compare it with verified
distance sensing and account for sensor failure. Final thresholds must be measured.

## Bring-up and integration checks

1. Verify inventory, power, wiring, and the local stop method.
2. Lift the wheels before trying new motion code; keep a physical stop accessible.
3. Confirm each motor direction and each sensor with bounded reads.
4. Confirm camera capture, frame timestamps, and website display.
5. Verify stale-command, link-loss, sensor-fault, emergency-stop, and reset behavior.
6. Run a short dispatch -> route -> obstacle stop -> arrival test.
7. Repeatedly rehearse the full 50-100 m route with payload under demo conditions.
8. Record actual duration, interventions, failures, and a backup video.

Every motor script needs `try/finally` cleanup, but cleanup alone does not replace
the runtime watchdog or a physical stop. Tag known-good versions. New dependencies
must be documented with their install commands, ownership, and reason.

## Current status

Verified from repository baseline `5f8e8b1`: Pi 4B and Grove sensors are reported;
`drive.py`, `sensors.py`, `vision.py`, and `main.py` are empty. No physical behavior
has been verified by the orchestrator. Hardware owners should report test evidence
and blockers through the mailbox before this status is changed.
