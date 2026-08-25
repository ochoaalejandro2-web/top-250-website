create table if not exists profiles (
  user_id text primary key,
  email text,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id text primary key,
  name text not null,
  full_name text not null,
  tag text not null default '',
  description text not null default '',
  price_cents integer not null,
  weight_lb numeric not null default 0.5,
  image_url text not null,
  stock integer not null default 12,
  active boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists orders (
  id serial primary key,
  user_id text not null,
  customer_name text not null,
  email text not null,
  phone text,
  address text not null,
  city text not null,
  state text not null,
  zip text not null,
  shipping_method text not null,
  shipping_cents integer not null,
  subtotal_cents integer not null,
  total_cents integer not null,
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists orders_user_id_idx on orders (user_id);
create index if not exists orders_created_at_idx on orders (created_at desc);

create table if not exists order_items (
  id serial primary key,
  order_id integer not null references orders(id) on delete cascade,
  product_id text not null,
  name text not null,
  qty integer not null,
  price_cents integer not null
);

insert into products (id, name, full_name, tag, description, price_cents, weight_lb, image_url, stock, sort_order)
values
  ('mouse', 'Strike Mouse', 'TOP 250 Strike Mouse', 'Wireless · 26K DPI',
   'Sub-60g wireless mouse with a high-polling sensor and PTFE feet. Built for flicks and micro-adjustments.',
   5999, 0.18, '/products/mouse.jpg', 24, 1),
  ('keyboard', 'Apex Keyboard', 'TOP 250 Apex 75% Keyboard', 'Hot-swap · RGB',
   'Compact 75% aluminum board, hot-swap sockets, south-facing RGB. Clean desk, full function.',
   8499, 1.75, '/products/keyboard.jpg', 16, 2),
  ('headset', 'Pulse Headset', 'TOP 250 Pulse Wireless Headset', 'Wireless · 7.1',
   'Closed-back wireless headset with 50mm drivers and a clear boom mic. All-day clamp without the fatigue.',
   6999, 0.68, '/products/headset.jpg', 18, 3),
  ('deskpad', 'Titan Desk Pad', 'TOP 250 Titan XXL Desk Pad', '900 × 400 mm',
   'Speed/control hybrid surface, stitched edges, non-slip base. One pad for mouse and keyboard.',
   2799, 0.85, '/products/deskpad.jpg', 40, 4),
  ('controller', 'Core Controller', 'TOP 250 Core Controller', 'Hall effect sticks',
   'Wireless controller with hall-effect analog sticks to reduce drift. Familiar layout, tighter feel.',
   4999, 0.52, '/products/controller.jpg', 20, 5),
  ('webcam', 'Frame Cam', 'TOP 250 Frame 1080p Webcam', '1080p60 · Autofocus',
   'Compact streaming cam with autofocus. Plug in and look sharp on stream or calls.',
   5499, 0.35, '/products/webcam.jpg', 22, 6),
  ('rgbkit', 'Glow Kit', 'TOP 250 Glow RGB Kit', 'Addressable RGB',
   'Controller plus addressable strips for under-desk or monitor glow. Sync the setup without extra software drama.',
   3299, 0.55, '/products/rgbkit.jpg', 30, 7),
  ('hub', 'Link Hub', 'TOP 250 Link USB-C Hub', 'HDMI + PD',
   'Aluminum 7-in-1 hub: HDMI, USB-A, USB-C PD passthrough. One cable from laptop to the whole desk.',
   3999, 0.28, '/products/hub.jpg', 28, 8)
on conflict (id) do nothing;
