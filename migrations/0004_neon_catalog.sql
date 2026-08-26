create table if not exists product_photos (
  id text primary key,
  mime text not null,
  data_base64 text not null,
  created_at timestamptz not null default now()
);

update products set tag = 'Wireless, 26K DPI' where id = 'mouse' and tag not like '%,%';
update products set tag = 'Hot-swap, RGB' where id = 'keyboard' and tag not like '%,%';
update products set tag = 'Wireless, 7.1' where id = 'headset' and tag not like '%,%';
update products set tag = '900 x 400 mm' where id = 'deskpad';
update products set tag = 'Hall effect sticks' where id = 'controller';
update products set tag = '1080p60, Autofocus' where id = 'webcam' and tag not like '%,%';
update products set tag = 'Addressable RGB' where id = 'rgbkit';
update products set tag = 'HDMI + PD' where id = 'hub';

update products
set active = false
where
  id ilike '%dma%'
  or name ilike '%dma%'
  or full_name ilike '%dma%'
  or description ilike '%dma%'
  or description ilike '%firmware%'
  or description ilike '%BO7%'
  or description ilike '%100T%'
  or name ilike '%100T%'
  or tag ilike '%100T%';
