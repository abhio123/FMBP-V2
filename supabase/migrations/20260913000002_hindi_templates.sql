-- Hindi templates for the no-AI fallback (English scaffolding around Hindi values read as broken Hindi).
alter table public.form_schemas
  add column if not exists title_template_hi text,
  add column if not exists description_template_hi text;
