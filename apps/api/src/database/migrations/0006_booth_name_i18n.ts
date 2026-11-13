import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table booths
      add column if not exists name_i18n jsonb
  `.execute(db);

  await sql`
    update booths set name_i18n = jsonb_build_object(
      'en', name,
      'hi', case code
        when 'BOOTH-07' then 'कोटिलिंगाला घाट'
        when 'BOOTH-03' then 'पुष्कर घाट'
        when 'ZONE-PARKING-B' then 'पार्किंग ज़ोन बी'
        when 'SHUTTLE-STOP-1' then 'शटल स्टॉप 1'
        else name
      end,
      'te', case code
        when 'BOOTH-07' then 'కోటిలింగాల ఘాట్'
        when 'BOOTH-03' then 'పుష్కర ఘాట్'
        when 'ZONE-PARKING-B' then 'పార్కింగ్ జోన్ బి'
        when 'SHUTTLE-STOP-1' then 'షటిల్ స్టాప్ 1'
        else name
      end,
      'ta', case code
        when 'BOOTH-07' then 'கோடிலிங்கால காட்'
        when 'BOOTH-03' then 'புஷ்கர காட்'
        when 'ZONE-PARKING-B' then 'பார்க்கிங் மண்டலம் பி'
        when 'SHUTTLE-STOP-1' then 'ஷட்டில் நிறுத்தம் 1'
        else name
      end
    )
    where name_i18n is null
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`alter table booths drop column if exists name_i18n`.execute(db);
}
