create table if not exists contact_messages (
  id serial primary key,
  name text not null,
  email text not null,
  phone text,
  topic text not null default 'General',
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists store_settings (
  key text primary key,
  value text not null
);

insert into store_settings (key, value) values ('admin_code', 'TOP-250')
on conflict (key) do nothing;

update products set full_name = replace(full_name, 'TOP 250', 'TOP-250')
where full_name like '%TOP 250%';

update products set full_name = replace(full_name, 'TAP 250', 'TOP-250')
where full_name like '%TAP 250%';
