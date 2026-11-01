# Walk Hand Offset Summary

Source: `TYPE1.SHP`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json` (`documentation/AGENTS.md` "Sources").

Computed from F9-F18 tile center positions relative to body center.

---

## Offset Table

| Facing | Hand | Layer | SHP dx | SHP dy | ThreeJS Y | Notes |
|--------|------|-------|--------|--------|-----------|-------|
| Front | RF | behind | -2 avg | 0 | 0 | Varies -4 to 0 across arm swing |
| Front | LF | in front | +4 | +4 | -4 * scaleY | Constant all frames |
| Back | RB | behind | +4 | 0 | 0 | Constant all frames |
| Back | LB | in front | -4 | +3 | -3 * scaleY | Constant all frames |

## Coordinate System Notes

- **SHP coordinate system**: X-right, Y-down (standard screen/bitmap space)
- **ThreeJS coordinate system**: X-right, Y-up (standard 3D world space)
- SHP dx translates to lateral offset along camera right vector (billboard screen-space)
- SHP dy of +N translates to ThreeJS Y of -N * scaleY (0.9)
