create table if not exists reviews (
  id serial primary key,
  name text not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text not null,
  status text not null default 'pending',
  seed_key text unique,
  created_at timestamptz not null default now()
);

create index if not exists reviews_status_created_idx on reviews (status, created_at desc);

insert into reviews (name, rating, comment, status, seed_key, created_at)
values
  (
    'Jordan M.',
    5,
    'Picked up the Link Hub for my living-room desk. HDMI to the TV just worked, and the laptop still charges off one cable. Packed in Phoenix and showed up quick.',
    'approved',
    'seed-hub-hdmi',
    '2026-07-18T15:12:00.000Z'
  ),
  (
    'Priya S.',
    5,
    'The Core Controller finally killed stick drift on my weekend sessions. Hall-effect sticks feel tight, and AO answered a fit question the same afternoon.',
    'approved',
    'seed-controller',
    '2026-06-29T21:04:00.000Z'
  ),
  (
    'Chris R.',
    4,
    'Needed a clean HDMI run from the hub to a 1440p monitor. Picture is sharp, no handshake drama. Wish the cable in the box was a foot longer — still a solid buy.',
    'approved',
    'seed-hdmi-cable',
    '2026-06-11T18:40:00.000Z'
  ),
  (
    'Elena V.',
    5,
    'Strike Mouse is light and the PTFE feet glide on the Titan pad. Prices were on the site — no “message for quote” nonsense. Will order a spare cable next.',
    'approved',
    'seed-mouse',
    '2026-05-22T14:08:00.000Z'
  ),
  (
    'Devon K.',
    5,
    'Pulse Headset for late ranked nights. Mic is clear, clamp is friendly, and USPS from Phoenix beat the estimate. Helpful shop, fair prices.',
    'approved',
    'seed-headset',
    '2026-04-30T16:55:00.000Z'
  ),
  (
    'Sam W.',
    4,
    'Apex 75% is a clean board for the price. Hot-swap is easy. RGB is a little bright on default — two clicks and it was fine. Local shop energy, even on a web order.',
    'approved',
    'seed-keyboard',
    '2026-04-09T19:22:00.000Z'
  )
on conflict (seed_key) do nothing;
