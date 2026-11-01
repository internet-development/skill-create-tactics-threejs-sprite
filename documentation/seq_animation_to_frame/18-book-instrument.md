# Read Book and Play Instrument (SEQ 146-149)

Source: `TYPE1.SEQ`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json`. Frames and delays are the binary's. Names are this repository's (`documentation/seq_animation_to_frame/AGENTS.md` "Names").

Notation: `F{n}({d})` = SHP frame index `n` displayed for `d` 60ths-of-a-second. `->` separates sequential frames. Duration = total time in milliseconds.

---

Read Book uses frames 125-129 (front) / 174-178 (back), Play Instrument frames 104, 105, 122 and 124 (front) / 153, 154, 171 and 173 (back).

| SEQ | Raw ID | Name | Duration | Frame Sequence |
|-----|-----|------|----------|----------------|
| 146 | 0xAC | Read Book Fwd | 1900ms | F125(6) -> F126(6) -> F127(6) -> F128(8) -> F129(8) -> F128(8) -> F129(8) -> F128(8) -> F129(8) -> F128(8) -> F129(8) -> F128(8) -> F129(8) -> F128(14) -> F128(2) |
| 147 | 0xAD | Read Book Bck | 1900ms | F174(6) -> F175(6) -> F176(6) -> F177(8) -> F178(8) -> F177(8) -> F178(8) -> F177(8) -> F178(8) -> F177(8) -> F178(8) -> F177(8) -> F178(8) -> F177(14) -> F177(2) |
| 148 | 0xAE | Play Instrument Fwd | 1733ms | F104(10) -> F124(8) -> F122(8) -> F105(10) -> F122(8) -> F124(8) -> F104(10) -> F124(8) -> F122(8) -> F105(10) -> F122(8) -> F124(6) -> F124(2) |
| 149 | 0xAF | Play Instrument Bck | 1733ms | F153(10) -> F173(8) -> F171(8) -> F154(10) -> F171(8) -> F173(8) -> F153(10) -> F173(8) -> F171(8) -> F154(10) -> F171(8) -> F173(6) -> F173(2) |

## Read Book Pattern

Arm raised (F125-127/F174-176) -> F128<->F129 alternating 5 times, written out instead of looped -> hold. Read Book 2 (SEQ 188/189) repeats it, and Talk Skill (SEQ 190/191) is the alternation alone.
