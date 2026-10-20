# Daggerlight TCG — Effect Audit Matrix

Version baseline: **v0.8.7 LAB**

This matrix is the human-readable companion to `tests/effect-audit.mjs`. The automatic test blocks deployment if a direct-power effect disappears from preview, AI estimate, or authoritative resolution; if a future effect loses its post-resolution route; if a duplication loses its double-power route; or if a known regression guard breaks.

Status legend: **AUTO** = structurally checked on every deploy. **SCENARIO** = still needs a positive/negative/boundary gameplay assertion.

| Effect ID | Cards | Class | Required routes | Structural status | Scenario test |
|---|---|---|---|---|---|
| `archive_all_diff3` | Cartógrafo empíreo | direct | Preview · AI · Resolve | AUTO | Pending |
| `archive_empty2` | Gusano blanco | direct | Preview · AI · Resolve | AUTO | Pending |
| `archive_exact2_5` | Memoria petrificada | direct | Preview · AI · Resolve | AUTO | Pending |
| `archive_here` | Archivista, Bibliotecario | direct | Preview · AI · Resolve | AUTO | Pending |
| `archive_leads_global` | Cronista dracónido | direct | Preview · AI · Resolve | AUTO | Pending |
| `archive_three6` | Huevo sin eclosionar | direct | Preview · AI · Resolve | AUTO | Pending |
| `archive_two2` | Legionario dracónido | direct | Preview · AI · Resolve | AUTO | Pending |
| `axis_lateral2` | Custodio del Eje | direct | Preview · AI · Resolve | AUTO | Pending |
| `bonus2` | Invocadagas | direct | Preview · AI · Resolve | AUTO | Pending |
| `cancel_enemy_affinity` | Sabio | contextual | Resolve (+ contextual AI review) | AUTO | Pending |
| `clear_archive2x` | Libro de Amaram | direct | Preview · AI · Resolve | AUTO | Pending |
| `copy_plus2` | Prodigio | contextual | Resolve (+ contextual AI review) | AUTO | Pending |
| `diestra_before3` | Guardia del Castillo | direct | Preview · AI · Resolve | AUTO | Pending |
| `empty_sin5` | Corona Etérea | direct | Preview · AI · Resolve | AUTO | Pending |
| `enemy3` | Asesino sinistral | contextual | Resolve (+ contextual AI review) | AUTO | Pending |
| `enemy_affinity2` | Lectora de gestos | contextual | Resolve (+ contextual AI review) | AUTO | Pending |
| `enemy_boosted_minus2` | Desencantador | contextual | Resolve (+ contextual AI review) | AUTO | Pending |
| `enemy_next3` | Oráculo | future | Post · AI planning | AUTO | Pending |
| `enemy_printed6_2` | Criatura invocada | contextual | Resolve (+ contextual AI review) | AUTO | Pending |
| `equal_life_double` | Avatar de Simetría | double | Double resolver | AUTO | Pending |
| `first_opposite3` | Palíndromo | direct | Preview · AI · Resolve | AUTO | Pending |
| `first_or_prev_diestra2` | Guardia Dextral | direct | Preview · AI · Resolve | AUTO | Pending |
| `first_round3` | Incendiario | direct | Preview · AI · Resolve | AUTO | Pending |
| `lateral1` | Santo Bifronte | direct | Preview · AI · Resolve | AUTO | Pending |
| `least_archive2` | Forjador de anillos | direct | Preview · AI · Resolve | AUTO | Pending |
| `losing_round2` | Contrapeso | direct | Preview · AI · Resolve | AUTO | Pending |
| `loss_next3` | Mensajero extraño | future | Post · AI planning | AUTO | Pending |
| `lost_prev_enemy3` | Protector | contextual | Resolve (+ contextual AI review) | AUTO | Pending |
| `mirror_martyr` | Mártir del Espejo | future | Post · AI planning | AUTO | Pending |
| `next_diestra2` | Abanderado real | future | Post · AI planning | AUTO | Pending |
| `next_position2` | Invocador | future | Post · AI planning | AUTO | Pending |
| `opp_archive_capped` | Escriba escamado | direct | Preview · AI · Resolve | AUTO | Pending |
| `opp_archive_more2` | Heraldo | direct | Preview · AI · Resolve | AUTO | Pending |
| `opposite_enemy2` | Reflejo Viviente | contextual | Resolve (+ contextual AI review) | AUTO | Pending |
| `opposite_prev3` | Paso Especular | direct | Preview · AI · Resolve | AUTO | Pending |
| `prev_draw3` | Santo Gemelo | direct | Preview · AI · Resolve | AUTO | Pending |
| `prev_draw_enemy3` | Tejedor de sombras | contextual | Resolve (+ contextual AI review) | AUTO | Pending |
| `score_tied1` | Equilibrador | direct | Preview · AI · Resolve | AUTO | Pending |
| `second_special3` | Maestro de armas | direct | Preview · AI · Resolve | AUTO | Pending |
| `second_trono_double` | Procesión Perfecta | double | Double resolver | AUTO | Pending |
| `third4` | Caballero luciérnaga | direct | Preview · AI · Resolve | AUTO | Pending |
| `trono_archive_three3` | Dragón Anciano | direct | Preview · AI · Resolve | AUTO | Pending |
| `trono_before4` | Blazewalker | direct | Preview · AI · Resolve | AUTO | Pending |
| `win_loss4` | Péndulo | direct | Preview · AI · Resolve | AUTO | Pending |
| `winning_round2` | Ejecutor real | direct | Preview · AI · Resolve | AUTO | Pending |
| `won_prev2` | Caballero Tigre | direct | Preview · AI · Resolve | AUTO | Pending |
| `won_round_next3` | Asesor real | future | Post · AI planning | AUTO | Pending |

## Regression guards already automated

- Incendiario resolves `first_round3` authoritatively.
- Archivista/Bibliotecario `archive_here` exists in preview, AI estimate, and authoritative resolution.
- Maestro de armas checks prior **Diestra** directly and no longer depends on `champion.special`.
- Athos dynamic Diestra capacity remains wired.
- Desartes most-populated Archive capacity remains wired.
- Vinira affinity override and +1 are present in preview, AI estimate, and authoritative resolution.
- Majestad no longer retains the old post-win +1.
- Samas, Corte Sinistral, and Señor de los Archivos retain their post-duel/end-round hooks.

## Scenario suite still to add

For every unique effect: one positive case, one negative case, and one boundary case where applicable. Highest priority scenarios are contextual opponent effects, post-resolution effects, and Champion interactions because structural presence alone cannot prove timing correctness.
