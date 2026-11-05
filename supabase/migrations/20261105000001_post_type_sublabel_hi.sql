-- QA round 2026-11-05 (Surya): the line under each choice on "What do you need?" was English business jargon even in
-- Hindi ("Investment / Loan / Funding", "OEM / ODM"). It now has a Hindi version; plain wording in both languages is
-- set by seed/01_taxonomy.sql. Additive and nullable: older app versions keep reading advanced_label_en.
alter table public.post_types add column if not exists advanced_label_hi text;
