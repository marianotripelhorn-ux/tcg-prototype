# Daggerlight TCG — Effect Audit Matrix

Version baseline: **v0.8.7 LAB**

This matrix is the human-readable companion to `tests/effect-audit.mjs`. The automatic test blocks deployment if a direct-power effect disappears from preview, AI estimate, or authoritative resolution; if a future effect loses its post-resolution route; if a duplication loses its double-power route; or if a known regression guard breaks.

Status legend: **AUTO** = structurally checked on every deploy. **SCENARIO** = still needs a positive/negative/boundary gameplay assertion.

| Effect ID | Cards | Class | Required routes | Structural status | Scenario test |
|---|---|---|---|---|---|
| `archive_all_diff3` | Cartógrafo empíreo | direct | Preview · AI · Resolve | AUTO | Covered |
| `archive_empty2` | Gusano blanco | direct | Preview · AI · Resolve | AUTO | Covered |
| `archive_exact2_5` | Memoria petrificada | direct | Preview · AI · Resolve | AUTO | Covered |
| `archive_here` | Archivista, Bibliotecario | direct | Preview · AI · Resolve | AUTO | Covered |
| `archive_leads_global` | Cronista dracónido | direct | Preview · AI · Resolve | AUTO | Covered |
| `archive_three6` | Huevo sin eclosionar | direct | Preview · AI · Resolve | AUTO | Covered |
| `archive_two2` | Legionario dracónido | direct | Preview · AI · Resolve | AUTO | Covered |
| `axis_lateral2` | Custodio del Eje | direct | Preview · AI · Resolve | AUTO | Covered |
| `bonus2` | Invocadagas | direct | Preview · AI · Resolve | AUTO | Covered |
| `cancel_enemy_affinity` | Sabio | contextual | Resolve (+ contextual AI review) | AUTO | Covered |
| `clear_archive2x` | Libro de Amaram | direct | Preview · AI · Resolve | AUTO | Covered |
| `copy_plus2` | Prodigio | contextual | Resolve (+ contextual AI review) | AUTO | Covered |
| `diestra_before3` | Guardia del Castillo | direct | Preview · AI · Resolve | AUTO | Covered |
| `empty_sin5` | Corona Etérea | direct | Preview · AI · Resolve | AUTO | Covered |
| `enemy3` | Asesino sinistral | contextual | Resolve (+ contextual AI review) | AUTO | Covered |
| `enemy_affinity2` | Lectora de gestos | contextual | Resolve (+ contextual AI review) | AUTO | Covered |
| `enemy_boosted_minus2` | Desencantador | contextual | Resolve (+ contextual AI review) | AUTO | Covered |
| `enemy_next3` | Oráculo | future | Post · AI planning | AUTO | Covered |
| `enemy_printed6_2` | Criatura invocada | contextual | Resolve (+ contextual AI review) | AUTO | Covered |
| `equal_life_double` | Avatar de Simetría | double | Double resolver | AUTO | Covered |
| `first_opposite3` | Palíndromo | direct | Preview · AI · Resolve | AUTO | Covered |
| `first_or_prev_diestra2` | Guardia Dextral | direct | Preview · AI · Resolve | AUTO | Covered |
| `first_round3` | Incendiario | direct | Preview · AI · Resolve | AUTO | Covered |
| `lateral1` | Santo Bifronte | direct | Preview · AI · Resolve | AUTO | Covered |
| `least_archive2` | Forjador de anillos | direct | Preview · AI · Resolve | AUTO | Covered |
| `losing_round2` | Contrapeso | direct | Preview · AI · Resolve | AUTO | Covered |
| `loss_next3` | Mensajero extraño | future | Post · AI planning | AUTO | Covered |
| `lost_prev_enemy3` | Protector | contextual | Resolve (+ contextual AI review) | AUTO | Covered |
| `mirror_martyr` | Mártir del Espejo | future | Post · AI planning | AUTO | Covered |
| `next_diestra2` | Abanderado real | future | Post · AI planning | AUTO | Covered |
| `next_position2` | Invocador | future | Post · AI planning | AUTO | Covered |
| `opp_archive_capped` | Escriba escamado | direct | Preview · AI · Resolve | AUTO | Covered |
| `opp_archive_more2` | Heraldo | direct | Preview · AI · Resolve | AUTO | Covered |
| `opposite_enemy2` | Reflejo Viviente | contextual | Resolve (+ contextual AI review) | AUTO | Covered |
| `opposite_prev3` | Paso Especular | direct | Preview · AI · Resolve | AUTO | Covered |
| `prev_draw3` | Santo Gemelo | direct | Preview · AI · Resolve | AUTO | Covered |
| `prev_draw_enemy3` | Tejedor de sombras | contextual | Resolve (+ contextual AI review) | AUTO | Covered |
| `score_tied1` | Equilibrador | direct | Preview · AI · Resolve | AUTO | Covered |
| `second_special3` | Maestro de armas | direct | Preview · AI · Resolve | AUTO | Covered |
| `second_trono_double` | Procesión Perfecta | double | Double resolver | AUTO | Covered |
| `third4` | Caballero luciérnaga | direct | Preview · AI · Resolve | AUTO | Covered |
| `trono_archive_three3` | Dragón Anciano | direct | Preview · AI · Resolve | AUTO | Covered |
| `trono_before4` | Blazewalker | direct | Preview · AI · Resolve | AUTO | Covered |
| `win_loss4` | Péndulo | direct | Preview · AI · Resolve | AUTO | Covered |
| `winning_round2` | Ejecutor real | direct | Preview · AI · Resolve | AUTO | Covered |
| `won_prev2` | Caballero Tigre | direct | Preview · AI · Resolve | AUTO | Covered |
| `won_round_next3` | Asesor real | future | Post · AI planning | AUTO | Covered |

## Regression guards already automated

- Incendiario resolves `first_round3` authoritatively.
- Archivista/Bibliotecario `archive_here` exists in preview, AI estimate, and authoritative resolution.
- Maestro de armas checks prior **Diestra** directly and no longer depends on `champion.special`.
- Athos dynamic Diestra capacity remains wired.
- Desartes most-populated Archive capacity remains wired.
- Vinira affinity override and +1 are present in preview, AI estimate, and authoritative resolution.
- Majestad no longer retains the old post-win +1.
- Samas, Corte Sinistral, and Señor de los Archivos retain their post-duel/end-round hooks.

## Scenario suite

`tests/effect-scenarios.mjs` now covers all 47 unique effect IDs with executable positive/negative/boundary assertions where applicable, plus key Champion interactions. The suite currently runs before every Pages deploy together with the structural audit.
