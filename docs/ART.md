# Nakama art direction
- **Style:** vibrant cel-shaded anime crew poster, thick sticker outlines, halftone dots, energetic diagonal composition, original characters only.
- **Palette:** electric cobalt #3b5bff, acid yellow #ffd23f, hot coral #ff5d73, ink #0e0e12, off-white #f7f5ef.
- **Subjects:** a crew of four friends on a rooftop at night pointing together at a glowing up-arrow in the sky; high-fives; a shared phone glowing with a single big button; a streak flame; matching crew bandanas.
- **Banned:** existing anime characters or franchises (no straw hats, no pirate flags from known shows), real brands or logos, readable text, real people, other designers' artwork.

## Wave 2: film, social and onboarding

| File | Prompt |
|---|---|
| nakama-film-title.webp | landscape 1536x1024: a crew of four friends calling a market move together; a cinematic title-card background for this product's demo film, its core metaphor at dusk, wide calm area in the center for a title added later |
| nakama-social-square.webp | square 1024x1024: a crew of four friends calling a market move together; a bold social post image showing the product's single most exciting moment |
| nakama-banner.webp | landscape 1536x512 wide banner: a crew of four friends calling a market move together; a panoramic strip of the product's world, low detail in the middle third |
| nakama-onboard-1.webp | portrait 1024x1536: a crew of four friends calling a market move together; onboarding slide 1, a newcomer discovering the product's core idea |
| nakama-onboard-2.webp | portrait 1024x1536: a crew of four friends calling a market move together; onboarding slide 2, the newcomer taking the main action for the first time |
| nakama-loading.webp | transparent PNG with a real alpha channel, no background, no ground shadow, centered, 1024x1024: a crew of four friends calling a market move together; a tiny looping-friendly loading mascot or object from the product's world, centered |

## v2: casual 3D game (Nov 10)

- **Style line (appended to every prompt):** glossy 3D casual mobile game art, soft clay render, chunky rounded shapes, bright saturated sky-blue, purple, orange and gold palette, soft studio lighting, clean, cute, premium, no text, no Bitcoin symbol. Transparent assets add: transparent PNG background with a real alpha channel, no ground shadow, centered, 1024x1024.
- **Palette:** sky blue #3aa0ff / #7cc6ff, royal blue #1f5eff, grape purple #7b3cff, sunny orange #ff9a1f, lime green #3bd45a (go), gold #ffc53d, white.
- **Cast:** a golden maneki-neko lucky cat mascot in a red hachimaki; six original chibi crew members with small Japanese details (hachimaki, kitsune mask, cat-ear hood, samurai topknot). No existing games, brands, logos or characters; no Bitcoin symbol.
- Generated with ChatGPT (chatgpt.com image model) in one chat, Nov 10 2026. PNG sources in `art-src/v2/` (gitignored, with `contact-sheet.jpg`); web files in `packages/web/public/art/v2/` (cwebp q85, alpha kept).

| File | Size (web) | Alpha | Subject |
|---|---|---|---|
| nakama-logo.webp | 1200w | yes | the word NAKAMA as a chunky glossy 3D logo, white-to-sky-blue faces, royal-blue/purple outline, gold shine, tiny gold cat paw |
| nakama-mascot.webp | 640 | yes | golden maneki-neko, red hachimaki, waving, holding a gold coin with an up-arrow |
| nakama-mascot-cheer.webp | 640 | yes | the cat cheering, both paws up, confetti |
| nakama-mascot-sad.webp | 640 | yes | the cat sad, ears down, teary, small raincloud (lost call) |
| nakama-crew-1.webp | 640 | yes | spiky-haired boy, red hachimaki, sky-blue jacket, thumbs up |
| nakama-crew-2.webp | 640 | yes | ponytail girl, fox mask on the side of her head, purple hoodie, peace sign |
| nakama-crew-3.webp | 640 | yes | kid in a sky-blue cat-ear hood, orange headphones, waving |
| nakama-crew-4.webp | 640 | yes | tiny samurai-topknot boy, blue short kimono, wooden sword |
| nakama-crew-5.webp | 640 | yes | girl pilot, goggles, orange flight jacket, salute |
| nakama-crew-6.webp | 640 | yes | calm robot buddy, orange knitted scarf, waving |
| nakama-avatar-1.webp | 160 | yes | crew 1 head on a sky-to-royal-blue circle |
| nakama-avatar-2.webp | 160 | yes | crew 2 head on a lavender-to-purple circle |
| nakama-avatar-3.webp | 160 | yes | crew 3 head on an orange-to-gold circle |
| nakama-avatar-4.webp | 160 | yes | crew 5 head on a lime-to-sky-blue circle |
| nakama-icon-megaphone.webp | 256 | yes | orange/blue megaphone with sparkles (post a call) |
| nakama-icon-trophy.webp | 256 | yes | gold trophy with a star |
| nakama-icon-shield.webp | 256 | yes | blue shield, gold rim, white check |
| nakama-icon-gem.webp | 256 | yes | purple faceted gem |
| nakama-icon-stopwatch.webp | 256 | yes | sky-blue stopwatch, ticks only |
| nakama-icon-coin.webp | 256 | yes | gold coin with a green up-arrow |
| nakama-icon-rocket-up.webp | 256 | yes | rocket pointing up (Higher) |
| nakama-icon-anchor-down.webp | 256 | yes | orange anchor pointing down (Lower) |
| nakama-icon-fire.webp | 256 | yes | orange flame (streak) |
| nakama-icon-crown.webp | 256 | yes | gold crown with purple and blue gems |
| nakama-card-host.webp | 640 | yes | megaphone with sparkles and the cat ("Post a call") |
| nakama-card-quick.webp | 640 | yes | lightning bolt hitting a stopwatch (1-minute call) |
| nakama-card-battle.webp | 640 | yes | crossed blue and orange star flags with a gold clash burst (5-minute crew vs crew) |
| nakama-empty.webp | 640 | yes | the cat asleep on a blue cushion (no calls yet) |
| nakama-sky.webp | 1536w | no | sky-blue background, puffy clouds, a few coins and gems at the edges |
| nakama-og.webp | 1536w | no | all six crew cheering around the cat on a sky, empty top third for a title |

Sky and OG are 1536 px wide (the model's native width), not 1600, to avoid upscaling. OG was regenerated once: the first take put most of the crew in purple, off-model.
